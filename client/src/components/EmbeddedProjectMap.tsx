/**
 * Embedded Project Map Component
 * Displays an always-visible map with GPS markers from project media
 * Supports overlay Edit Mode with draggable corner handles for alignment
 */

import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import { Check, ChevronRight, Eye, EyeOff, Expand, Layers, MapPin, Move, Navigation, Pencil, RotateCcw, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Link } from "wouter";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { toast } from "sonner";

export interface EmbeddedProjectMapHandle {
  panToMedia: (latitude: number, longitude: number, mediaId?: string) => void;
}

interface OverlayData {
  id: number;
  fileUrl: string;
  coordinates: string | unknown;
  opacity?: string | number;
  isActive?: number;
  rotation?: string | number;
}

interface EmbeddedProjectMapProps {
  projectId: number;
  projectName: string;
  flightId?: number;
  isDemoProject?: boolean;
  overlays?: OverlayData[];
  onOverlayUpdated?: () => void;
}

// Parse coordinates from DB (may be JSON string or array)
function parseCoords(raw: string | unknown): [number, number][] | null {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length >= 4) return parsed as [number, number][];
  } catch {}
  return null;
}

export const EmbeddedProjectMap = forwardRef<EmbeddedProjectMapHandle, EmbeddedProjectMapProps>(
  (props, ref) => {
    const { projectId, projectName, flightId, isDemoProject = false, overlays = [], onOverlayUpdated } = props;
    const groundOverlaysRef = useRef<google.maps.GroundOverlay[]>([]);
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const markerClustererRef = useRef<MarkerClusterer | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [enlargedMedia, setEnlargedMedia] = useState<Media | null>(null);

    // ── Edit Mode state ──────────────────────────────────────────────────────
    const [editMode, setEditMode] = useState(false);
    const [editingOverlayId, setEditingOverlayId] = useState<number | null>(null);
    // editCorners: [TL, TR, BR, BL] as [lng, lat]
    const [editCorners, setEditCorners] = useState<[number, number][] | null>(null);
    const [editRotation, setEditRotation] = useState(0);
    const [aspectLocked, setAspectLocked] = useState(true);
    const cornerMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const rotationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const editOverlayRef = useRef<google.maps.GroundOverlay | null>(null);
    const editRectRef = useRef<google.maps.Polygon | null>(null);
    // Store original aspect ratio (width/height in degrees) when edit starts
    const origAspectRef = useRef<number>(1);

    // ── Opacity state — keyed by overlay id ──────────────────────────────────
    const [opacityMap, setOpacityMap] = useState<Record<number, number>>({});

    // ── Overlay Manager sidebar & swipe state ────────────────────────────────
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [swipeMode, setSwipeMode] = useState(false);
    const [swipePos, setSwipePos] = useState(50); // percent
    const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean>>({});
    const swipeDragging = useRef(false);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    // Initialise opacity and visibility from props when overlays first load
    useEffect(() => {
      const initOp: Record<number, number> = {};
      const initVis: Record<number, boolean> = {};
      for (const ov of overlays) {
        if (!(ov.id in opacityMap)) {
          const val = typeof ov.opacity === "string" ? parseFloat(ov.opacity) : (ov.opacity ?? 0.7);
          initOp[ov.id] = isNaN(val) ? 0.7 : val;
        }
        if (!(ov.id in visibilityMap)) initVis[ov.id] = true;
      }
      if (Object.keys(initOp).length > 0) setOpacityMap((prev) => ({ ...prev, ...initOp }));
      if (Object.keys(initVis).length > 0) setVisibilityMap((prev) => ({ ...prev, ...initVis }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [overlays]);

    // Swipe comparison: sync GroundOverlay clip via CSS on the map container
    useEffect(() => {
      if (!mapContainerRef.current) return;
      const el = mapContainerRef.current.querySelector('.swipe-overlay-clip') as HTMLElement | null;
      if (!el) return;
      el.style.clipPath = swipeMode ? `inset(0 ${100 - swipePos}% 0 0)` : 'none';
    }, [swipeMode, swipePos]);

    const handleSwipeMouseDown = (e: React.MouseEvent) => {
      swipeDragging.current = true;
      e.preventDefault();
    };
    const handleSwipeMouseMove = (e: React.MouseEvent) => {
      if (!swipeDragging.current || !mapContainerRef.current) return;
      const rect = mapContainerRef.current.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      setSwipePos(pct);
    };
    const handleSwipeMouseUp = () => { swipeDragging.current = false; };

    // Toggle overlay visibility on the map
    const handleToggleVisibility = (ovId: number) => {
      const next = !visibilityMap[ovId];
      setVisibilityMap((prev) => ({ ...prev, [ovId]: next }));
      groundOverlaysRef.current.forEach((go, i) => {
        const ov = overlays.filter((o) => o.isActive)[i];
        if (ov?.id === ovId) go.setOpacity(next ? (opacityMap[ovId] ?? 0.7) : 0);
      });
    };

    const updateOverlayOpacity = trpc.project.updateOverlayOpacity.useMutation();

    const handleOpacityChange = (ovId: number, value: number) => {
      setOpacityMap((prev) => ({ ...prev, [ovId]: value }));
      // Live-update the rendered GroundOverlay
      groundOverlaysRef.current.forEach((go, i) => {
        const ov = overlays.filter((o) => o.isActive)[i];
        if (ov?.id === ovId) go.setOpacity(value);
      });
    };

    const handleOpacityCommit = (ovId: number, value: number) => {
      updateOverlayOpacity.mutate(
        { overlayId: ovId, projectId, opacity: value },
        { onError: (err) => toast.error("Failed to save opacity: " + err.message) }
      );
    };

    const updateOverlayCoords = trpc.project.updateOverlayCoordinates.useMutation({
      onSuccess: () => {
        toast.success("Overlay position saved");
        onOverlayUpdated?.();
      },
      onError: (err) => {
        toast.error("Failed to save: " + err.message);
      },
    });

    // Silent auto-save on drag-drop (no toast)
    const autoSaveCoords = trpc.project.updateOverlayCoordinates.useMutation();

    // Expose pan/zoom method to parent components
    useImperativeHandle(ref, () => ({
      panToMedia: (latitude: number, longitude: number, mediaId?: string) => {
        if (!mapRef.current) return;
        const targetPosition = { lat: latitude, lng: longitude };
        mapRef.current.setZoom(21);
        mapRef.current.panTo(targetPosition);
        if (mediaId && markersRef.current.length > 0) {
          const marker = markersRef.current.find((m) => {
            const content = m.content as HTMLElement;
            return content?.getAttribute("data-media-id") === mediaId;
          });
          if (marker) {
            setTimeout(() => {
              google.maps.event.trigger(marker, "click");
            }, 400);
          }
        }
      },
    }), []);

    // Fetch media
    const { data: mediaList, isLoading } = isDemoProject
      ? trpc.media.listDemo.useQuery({ projectId, flightId })
      : trpc.media.list.useQuery({ projectId, flightId });

    const mediaWithGPS = useMemo(() => {
      return mediaList?.filter((m) => m.latitude && m.longitude) || [];
    }, [mediaList]);

    // Calculate center point
    const getCenter = useCallback(() => {
      if (mediaWithGPS.length > 0) {
        const sumLat = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.latitude!), 0);
        const sumLng = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.longitude!), 0);
        return { lat: sumLat / mediaWithGPS.length, lng: sumLng / mediaWithGPS.length };
      }
      if (overlays && overlays.length > 0) {
        const coords = parseCoords(overlays[0].coordinates);
        if (coords && coords.length >= 4) {
          const avgLat = (coords[0][1] + coords[2][1]) / 2;
          const avgLng = (coords[0][0] + coords[1][0]) / 2;
          return { lat: avgLat, lng: avgLng };
        }
      }
      return { lat: 32.7767, lng: -96.797 };
    }, [mediaWithGPS, overlays]);

    // Handle map ready - add markers and flight path
    const handleMapReady = useCallback(
      (map: google.maps.Map) => {
        mapRef.current = map;
        setMapReady(true);

        if (markerClustererRef.current) {
          markerClustererRef.current.clearMarkers();
          markerClustererRef.current = null;
        }
        markersRef.current.forEach((marker) => (marker.map = null));
        markersRef.current = [];
        if (polylineRef.current) polylineRef.current.setMap(null);

        if (mediaWithGPS.length === 0) return;

        infoWindowRef.current = new google.maps.InfoWindow();

        const sortedMedia = [...mediaWithGPS].sort((a, b) => {
          if (a.capturedAt && b.capturedAt)
            return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
          if (a.capturedAt && !b.capturedAt) return -1;
          if (!a.capturedAt && b.capturedAt) return 1;
          return a.filename.localeCompare(b.filename);
        });

        const pathCoordinates = sortedMedia.map((m) => ({
          lat: parseFloat(m.latitude!),
          lng: parseFloat(m.longitude!),
        }));

        polylineRef.current = new google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: "#10B981",
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map,
        });

        sortedMedia.forEach((media, index) => {
          const position = { lat: parseFloat(media.latitude!), lng: parseFloat(media.longitude!) };
          const isVideo = media.mediaType === "video";
          const markerColor = isVideo ? "#ef4444" : "#10B981";
          const markerElement = document.createElement("div");
          markerElement.className = "marker-container";
          markerElement.setAttribute("data-media-id", media.id);
          markerElement.innerHTML = `
            <div style="
              background: ${markerColor};
              color: white;
              border-radius: 50%;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              cursor: pointer;
            ">${index + 1}</div>
          `;

          const marker = new google.maps.marker.AdvancedMarkerElement({
            position,
            map,
            content: markerElement,
          });
          markersRef.current.push(marker);

          marker.addListener("click", () => {
            const thumbnailUrl = media.thumbnailUrl || media.url;
            const content = `
              <div style="max-width:200px;font-family:sans-serif">
                <img src="${thumbnailUrl}" style="width:100%;border-radius:4px;margin-bottom:8px" onerror="this.style.display='none'" />
                <div style="font-size:12px;font-weight:bold;margin-bottom:4px">${media.filename}</div>
                <div style="font-size:11px;color:#666">${parseFloat(media.latitude!).toFixed(6)}, ${parseFloat(media.longitude!).toFixed(6)}</div>
              </div>
            `;
            infoWindowRef.current?.setContent(content);
            infoWindowRef.current?.open(map, marker);
          });
        });

        const newClusterer = new MarkerClusterer({ map, markers: markersRef.current });
        markerClustererRef.current = newClusterer;
      },
      [mediaWithGPS]
    );

    // Render ground overlays
    useEffect(() => {
      if (!mapReady) return;
      const map = mapRef.current;
      if (!map) return;

      groundOverlaysRef.current.forEach((go) => go.setMap(null));
      groundOverlaysRef.current = [];

      if (!overlays || overlays.length === 0) return;

      for (const ov of overlays) {
        if (!ov.isActive) continue;
        const coords = parseCoords(ov.coordinates);
        if (!coords || coords.length < 4) continue;
        try {
          const sw = new google.maps.LatLng(coords[3][1], coords[3][0]); // BL
          const ne = new google.maps.LatLng(coords[1][1], coords[1][0]); // TR
          const bounds = new google.maps.LatLngBounds(sw, ne);
          const opacity = typeof ov.opacity === "string" ? parseFloat(ov.opacity) : (ov.opacity ?? 0.5);
          const groundOverlay = new google.maps.GroundOverlay(ov.fileUrl, bounds, {
            opacity,
            clickable: false,
          });
          groundOverlay.setMap(map);
          groundOverlaysRef.current.push(groundOverlay);
          console.log("[Map Overlay] Rendered overlay", ov.id, "url:", ov.fileUrl);
        } catch (err) {
          console.error("[Map Overlay] Failed to render overlay", ov.id, err);
        }
      }
    }, [overlays, mapReady]);

    // ── Edit Mode: affine sync, map locking, drag-to-reposition, rotation, aspect-ratio lock ──
    useEffect(() => {
      if (!mapReady || !mapRef.current) return;
      const map = mapRef.current;

      // Cleanup previous edit markers
      cornerMarkersRef.current.forEach((m) => (m.map = null));
      cornerMarkersRef.current = [];
      if (rotationMarkerRef.current) { rotationMarkerRef.current.map = null; rotationMarkerRef.current = null; }
      if (editOverlayRef.current) { editOverlayRef.current.setMap(null); editOverlayRef.current = null; }
      if (editRectRef.current) { editRectRef.current.setMap(null); editRectRef.current = null; }

      if (!editMode || !editCorners || editCorners.length < 4) return;

      const ov = overlays.find((o) => o.id === editingOverlayId);
      if (!ov) return;

      const opacity = typeof ov.opacity === "string" ? parseFloat(ov.opacity as string) : (ov.opacity ?? 0.5);

      // ── Helpers ──────────────────────────────────────────────────────────────
      const centroid = (corners: [number, number][]): [number, number] => [
        corners.reduce((s, c) => s + c[0], 0) / corners.length,
        corners.reduce((s, c) => s + c[1], 0) / corners.length,
      ];

      const rotatePoint = (pt: [number, number], pivot: [number, number], angleDeg: number): [number, number] => {
        const rad = (angleDeg * Math.PI) / 180;
        const dx = pt[0] - pivot[0];
        const dy = pt[1] - pivot[1];
        return [
          pivot[0] + dx * Math.cos(rad) - dy * Math.sin(rad),
          pivot[1] + dx * Math.sin(rad) + dy * Math.cos(rad),
        ];
      };

      const applyRotation = (corners: [number, number][], angleDeg: number): [number, number][] => {
        const c = centroid(corners);
        return corners.map((pt) => rotatePoint(pt, c, angleDeg));
      };

      // Top-center handle position — sits above the TL–TR edge
      const topCenter = (corners: [number, number][]): [number, number] => [
        (corners[0][0] + corners[1][0]) / 2,
        Math.max(corners[0][1], corners[1][1]) + 0.0003,
      ];

      // ── Rebuild live-preview GroundOverlay from current corners ──
      const rebuildOverlay = (corners: [number, number][]) => {
        if (editOverlayRef.current) editOverlayRef.current.setMap(null);
        const lats = corners.map((c) => c[1]);
        const lngs = corners.map((c) => c[0]);
        const north = Math.max(...lats);
        const south = Math.min(...lats);
        const west  = Math.min(...lngs);
        const east  = Math.max(...lngs);
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(south, west),
          new google.maps.LatLng(north, east)
        );
        editOverlayRef.current = new google.maps.GroundOverlay(ov.fileUrl, bounds, { opacity, clickable: true });
        editOverlayRef.current.setMap(map);
      };

      // ── Rebuild outline polygon (affine — follows actual corners, not bounding box) ──
      const rebuildRect = (corners: [number, number][]) => {
        if (editRectRef.current) editRectRef.current.setMap(null);
        editRectRef.current = new google.maps.Polygon({
          paths: [...corners, corners[0]].map(([lng, lat]) => ({ lat, lng })),
          strokeColor: "#10B981",
          strokeWeight: 2,
          fillOpacity: 0.05,
          fillColor: "#10B981",
          map,
        });
      };

      // ── Sync all handle positions to current corners (affine alignment) ──
      const syncHandles = (corners: [number, number][]) => {
        corners.forEach(([lng, lat], i) => {
          if (cornerMarkersRef.current[i]) {
            cornerMarkersRef.current[i].position = { lat, lng };
          }
        });
        const tc = topCenter(corners);
        if (rotationMarkerRef.current) {
          rotationMarkerRef.current.position = { lat: tc[1], lng: tc[0] };
        }
      };

      rebuildOverlay(editCorners);
      rebuildRect(editCorners);

      const LABELS = ["TL", "TR", "BR", "BL"];
      const currentCorners: [number, number][] = [...editCorners] as [number, number][];
      let shiftHeld = false;

      const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeld = true; };
      const onKeyUp   = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeld = false; };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      // ── Corner handles ────────────────────────────────────────────────────────
      currentCorners.forEach(([lng, lat], i) => {
        const el = document.createElement("div");
        el.style.cssText = `
          background: #10B981;
          color: white;
          border: 2px solid white;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          user-select: none;
          touch-action: none;
        `;
        el.textContent = LABELS[i];

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat, lng },
          map,
          content: el,
          gmpDraggable: true,
        });

        // Lock map panning while dragging a corner
        marker.addListener("dragstart", () => {
          map.setOptions({ draggable: false, gestureHandling: "none" });
        });

        marker.addListener("drag", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const newLng = e.latLng.lng();
          const newLat = e.latLng.lat();

          if ((aspectLocked || shiftHeld) && origAspectRef.current) {
            const opposite = currentCorners[(i + 2) % 4];
            const dLng = newLng - opposite[0];
            const dLat = newLat - opposite[1];
            const aspect = origAspectRef.current;
            const absDLng = Math.abs(dLng);
            const absDLat = Math.abs(dLat);
            let adjLng = dLng;
            let adjLat = dLat;
            if (absDLng / absDLat > aspect) {
              adjLat = (absDLng / aspect) * Math.sign(dLat);
            } else {
              adjLng = (absDLat * aspect) * Math.sign(dLng);
            }
            const newCorner: [number, number] = [opposite[0] + adjLng, opposite[1] + adjLat];
            currentCorners[i] = newCorner;
            const prev = (i + 3) % 4;
            const next = (i + 1) % 4;
            currentCorners[prev] = [opposite[0], newCorner[1]];
            currentCorners[next] = [newCorner[0], opposite[1]];
          } else {
            currentCorners[i] = [newLng, newLat];
          }

          rebuildOverlay(currentCorners);
          rebuildRect(currentCorners);
          // Affine sync: update all handles to stay on corners
          syncHandles(currentCorners);
        });

        marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
          // Re-enable map panning
          map.setOptions({ draggable: true, gestureHandling: "auto" });
          if (!e.latLng) return;
          currentCorners[i] = [e.latLng.lng(), e.latLng.lat()];
          setEditCorners([...currentCorners]);
          if (editingOverlayId != null) {
            autoSaveCoords.mutate({ overlayId: editingOverlayId, projectId, coordinates: currentCorners as [number,number][], rotation: editRotation });
          }
        });

        cornerMarkersRef.current.push(marker);
      });

      // ── Rotation handle (top-center, amber) ──────────────────────────────────
      const tc = topCenter(currentCorners);
      const rotEl = document.createElement("div");
      rotEl.style.cssText = `
        background: #F59E0B;
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: grab;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        user-select: none;
        touch-action: none;
      `;
      rotEl.textContent = "↻";
      rotEl.title = "Drag to rotate";

      const rotMarker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: tc[1], lng: tc[0] },
        map,
        content: rotEl,
        gmpDraggable: true,
      });
      rotationMarkerRef.current = rotMarker;

      let lastAngle = editRotation;
      let baseCorners: [number, number][] = [...currentCorners] as [number, number][];

      rotMarker.addListener("dragstart", () => {
        // Lock map panning while rotating
        map.setOptions({ draggable: false, gestureHandling: "none" });
        baseCorners = [...currentCorners] as [number, number][];
        lastAngle = editRotation;
      });

      rotMarker.addListener("drag", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const c = centroid(baseCorners);
        const dx = e.latLng.lng() - c[0];
        const dy = e.latLng.lat() - c[1];
        const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
        const delta = angle - lastAngle;
        lastAngle = angle;
        const rotated = applyRotation(currentCorners, delta);
        currentCorners.splice(0, 4, ...rotated);
        rebuildOverlay(currentCorners);
        rebuildRect(currentCorners);
        // Affine sync: keep all corner handles on the rotated corners
        syncHandles(currentCorners);
        setEditRotation(angle);
      });

      rotMarker.addListener("dragend", () => {
        // Re-enable map panning
        map.setOptions({ draggable: true, gestureHandling: "auto" });
        setEditCorners([...currentCorners]);
        if (editingOverlayId != null) {
          autoSaveCoords.mutate({ overlayId: editingOverlayId, projectId, coordinates: currentCorners as [number,number][], rotation: lastAngle });
        }
      });

      // ── Center drag: move entire overlay ─────────────────────────────────────
      // Listen for mousedown on the GroundOverlay to initiate a pan-drag
      let centerDragStart: { x: number; y: number; corners: [number, number][] } | null = null;

      const onOverlayMouseDown = (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        map.setOptions({ draggable: false, gestureHandling: "none" });
        centerDragStart = { x: e.latLng.lng(), y: e.latLng.lat(), corners: currentCorners.map((c) => [...c]) as [number, number][] };
      };

      const onOverlayMouseMove = (e: google.maps.MapMouseEvent) => {
        if (!centerDragStart || !e.latLng) return;
        const dLng = e.latLng.lng() - centerDragStart.x;
        const dLat = e.latLng.lat() - centerDragStart.y;
        const moved = centerDragStart.corners.map(([lng, lat]) => [lng + dLng, lat + dLat] as [number, number]);
        currentCorners.splice(0, 4, ...moved);
        rebuildOverlay(currentCorners);
        rebuildRect(currentCorners);
        syncHandles(currentCorners);
      };

      const onOverlayMouseUp = () => {
        if (!centerDragStart) return;
        centerDragStart = null;
        map.setOptions({ draggable: true, gestureHandling: "auto" });
        setEditCorners([...currentCorners]);
        if (editingOverlayId != null) {
          autoSaveCoords.mutate({ overlayId: editingOverlayId, projectId, coordinates: currentCorners as [number,number][], rotation: editRotation });
        }
      };

      let overlayMouseDownListener: google.maps.MapsEventListener | null = null;
      let overlayMouseMoveListener: google.maps.MapsEventListener | null = null;
      let overlayMouseUpListener: google.maps.MapsEventListener | null = null;

      if (editOverlayRef.current) {
        overlayMouseDownListener = editOverlayRef.current.addListener("mousedown", onOverlayMouseDown);
        overlayMouseMoveListener = editOverlayRef.current.addListener("mousemove", onOverlayMouseMove);
        overlayMouseUpListener   = editOverlayRef.current.addListener("mouseup",   onOverlayMouseUp);
      }

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        // Re-enable map in case we unmount mid-drag
        map.setOptions({ draggable: true, gestureHandling: "auto" });
        cornerMarkersRef.current.forEach((m) => (m.map = null));
        cornerMarkersRef.current = [];
        if (rotationMarkerRef.current) { rotationMarkerRef.current.map = null; rotationMarkerRef.current = null; }
        if (editOverlayRef.current) { editOverlayRef.current.setMap(null); editOverlayRef.current = null; }
        if (editRectRef.current) { editRectRef.current.setMap(null); editRectRef.current = null; }
        overlayMouseDownListener?.remove();
        overlayMouseMoveListener?.remove();
        overlayMouseUpListener?.remove();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editMode, editCorners, editingOverlayId, mapReady, overlays, aspectLocked]);

    const handleStartEdit = (ov: OverlayData) => {
      const coords = parseCoords(ov.coordinates);
      if (!coords) { toast.error("Cannot edit: invalid coordinates"); return; }
      setEditingOverlayId(ov.id);
      setEditCorners(coords);
      setEditMode(true);
      // Hide normal ground overlays while editing
      groundOverlaysRef.current.forEach((go) => go.setMap(null));
    };

    const handleFinishEdit = async () => {
      if (!editCorners || editingOverlayId == null) return;
      await updateOverlayCoords.mutateAsync({
        overlayId: editingOverlayId,
        projectId,
        coordinates: editCorners as [number, number][],
      });
      setEditMode(false);
      setEditingOverlayId(null);
      setEditCorners(null);
    };

    const handleCancelEdit = () => {
      setEditMode(false);
      setEditingOverlayId(null);
      setEditCorners(null);
    };

    // Handle video opening
    useCallback(() => {
      (window as any).__openVideo = (mediaId: string) => {
        const m = mediaList?.find((m) => m.id === mediaId);
        if (m) setEnlargedMedia(m);
      };
      (window as any).__mediaList = mediaList;
    }, [mediaList]);

    if (isLoading) {
      return (
        <Card className="bg-card">
          <CardContent className="pt-4">
            <Skeleton className="w-full h-[500px] rounded-lg" />
          </CardContent>
        </Card>
      );
    }

    const activeOverlays = overlays.filter((o) => o.isActive);

    return (
      <Card className="bg-card">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Project Map
              {mediaWithGPS.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({mediaWithGPS.length} location{mediaWithGPS.length !== 1 ? "s" : ""})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {/* Edit Mode controls */}
              {editMode ? (
                <>
                  <span className="text-xs text-amber-400 font-medium hidden sm:inline">
                    ↻ {editRotation.toFixed(1)}°
                  </span>
                  <button
                    title={aspectLocked ? "Aspect ratio locked (click to unlock)" : "Aspect ratio unlocked (click to lock)"}
                    onClick={() => setAspectLocked((v) => !v)}
                    className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                      aspectLocked
                        ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                        : "border-zinc-500 text-zinc-400 bg-zinc-500/10"
                    }`}
                  >
                    {aspectLocked ? "🔒 AR" : "🔓 AR"}
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleFinishEdit}
                    disabled={updateOverlayCoords.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {updateOverlayCoords.isPending ? "Saving…" : "Finish"}
                  </Button>
                </>
              ) : (
                <>
                  {activeOverlays.length > 0 && !isDemoProject && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(activeOverlays[0])}
                      title="Drag corners to align overlay with map"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Align Overlay
                    </Button>
                  )}
                  {mediaWithGPS.length > 0 && (
                    <Link href={flightId ? `/project/${projectId}/flight/${flightId}/map` : `/project/${projectId}/map`}>
                      <Button variant="outline" size="sm">
                        <Expand className="h-4 w-4 mr-2" />
                        Full Screen
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {mediaWithGPS.length === 0 && activeOverlays.length === 0 ? (
            <div className="w-full h-[500px] rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center text-muted-foreground">
              <Navigation className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No GPS Data Available</p>
              <p className="text-sm">Upload media with GPS coordinates to see them on the map</p>
            </div>
          ) : (
            <>
              {/* ── Map container with sidebar overlay ── */}
              <div
                ref={mapContainerRef}
                className="relative rounded-lg overflow-hidden"
                onMouseMove={swipeMode ? handleSwipeMouseMove : undefined}
                onMouseUp={swipeMode ? handleSwipeMouseUp : undefined}
                onMouseLeave={swipeMode ? handleSwipeMouseUp : undefined}
              >
                <MapView
                  className="w-full h-[500px] rounded-lg overflow-hidden"
                  initialCenter={getCenter()}
                  initialZoom={14}
                  onMapReady={handleMapReady}
                />

                {/* Swipe clip wrapper — clips the GroundOverlay canvas layer */}
                {swipeMode && activeOverlays.length > 0 && (
                  <div
                    className="swipe-overlay-clip absolute inset-0 pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - swipePos}% 0 0)` }}
                  />
                )}

                {/* Swipe divider bar */}
                {swipeMode && (
                  <div
                    style={{ left: `${swipePos}%` }}
                    className="absolute top-0 bottom-0 w-1 bg-white z-[90] cursor-ew-resize select-none flex items-center justify-center"
                    onMouseDown={handleSwipeMouseDown}
                  >
                    <div className="w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-900 font-bold border-2 border-blue-500 text-sm">
                      ↔
                    </div>
                  </div>
                )}

                {/* Bottom-left: GPS / flight path badge */}
                {mediaWithGPS.length > 0 && (
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{mediaWithGPS.length}</span> GPS points •{" "}
                    <span className="text-emerald-500 ml-1">—</span> Flight path
                  </div>
                )}

                {/* Bottom-right: overlay count badge */}
                {activeOverlays.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{activeOverlays.length}</span> overlay
                    {activeOverlays.length !== 1 ? "s" : ""}
                    {editMode && <span className="text-amber-400 ml-1">• editing</span>}
                    {swipeMode && <span className="text-blue-400 ml-1">• swipe</span>}
                  </div>
                )}

                {/* ── Overlay Manager Sidebar ── */}
                {activeOverlays.length > 0 && (
                  <>
                    {/* Toggle tab */}
                    {!sidebarOpen && (
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-[100] bg-slate-900/90 backdrop-blur-md text-white p-2 rounded-l-md border-l border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
                        title="Open Overlay Manager"
                      >
                        <Layers size={18} />
                      </button>
                    )}

                    {/* Sidebar panel */}
                    <div
                      className={`absolute right-0 top-0 h-full w-72 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl transition-transform duration-300 z-[100] ${
                        sidebarOpen ? "translate-x-0" : "translate-x-full"
                      }`}
                    >
                      {/* Collapse button */}
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="absolute -left-10 top-4 bg-slate-900 p-2 rounded-l-md border-l border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
                      >
                        <ChevronRight size={20} />
                      </button>

                      <div className="p-5 h-full overflow-y-auto flex flex-col gap-5">
                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-slate-700 pb-4">
                          <Layers className="text-blue-400" size={20} />
                          <h2 className="font-bold text-lg tracking-tight">Overlay Manager</h2>
                        </div>

                        {/* Per-overlay controls */}
                        {activeOverlays.map((ov) => {
                          const opacity = opacityMap[ov.id] ?? 0.7;
                          const visible = visibilityMap[ov.id] ?? true;
                          const label = (ov as any).label || `Plan ${ov.id}`;
                          return (
                            <div key={ov.id} className="space-y-4">
                              {/* Overlay name + visibility toggle */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-200 truncate max-w-[160px]" title={label}>{label}</span>
                                <button
                                  onClick={() => handleToggleVisibility(ov.id)}
                                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                  title={visible ? "Hide overlay" : "Show overlay"}
                                >
                                  {visible ? <Eye size={18} /> : <EyeOff size={18} className="text-slate-500" />}
                                </button>
                              </div>

                              {/* Opacity slider */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-slate-400">
                                  <span>Opacity</span>
                                  <span>{Math.round(opacity * 100)}%</span>
                                </div>
                                <input
                                  type="range" min={0} max={1} step={0.01}
                                  value={opacity}
                                  onChange={(e) => handleOpacityChange(ov.id, parseFloat(e.target.value))}
                                  onMouseUp={(e) => handleOpacityCommit(ov.id, parseFloat((e.target as HTMLInputElement).value))}
                                  onTouchEnd={(e) => handleOpacityCommit(ov.id, parseFloat((e.target as HTMLInputElement).value))}
                                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                              </div>
                            </div>
                          );
                        })}

                        {/* Tools section */}
                        {!isDemoProject && (
                          <div className="pt-2 border-t border-slate-700 space-y-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tools</p>

                            {/* Edit Alignment */}
                            <button
                              onClick={() => {
                                setSidebarOpen(false);
                                setSwipeMode(false);
                                if (editMode) { handleCancelEdit(); }
                                else if (activeOverlays[0]) { handleStartEdit(activeOverlays[0]); }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                editMode ? "bg-blue-600 shadow-lg shadow-blue-900/40" : "bg-slate-800 hover:bg-slate-700"
                              }`}
                            >
                              <Move size={18} />
                              <span className="text-sm font-semibold">{editMode ? "Stop Editing" : "Edit Alignment"}</span>
                            </button>

                            {/* Swipe Comparison */}
                            <button
                              onClick={() => {
                                if (editMode) handleCancelEdit();
                                setSwipeMode((v) => !v);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                swipeMode ? "bg-indigo-600 shadow-lg shadow-indigo-900/40" : "bg-slate-800 hover:bg-slate-700"
                              }`}
                            >
                              <SlidersHorizontal size={18} />
                              <span className="text-sm font-semibold">{swipeMode ? "Stop Swipe" : "Swipe Comparison"}</span>
                            </button>

                            {/* Reset to Default */}
                            {activeOverlays[0] && (
                              <button
                                onClick={async () => {
                                  const ov = activeOverlays[0];
                                  if (!confirm("Reset overlay to its original GPS-derived position? This cannot be undone.")) return;
                                  try {
                                    const resp = await fetch(
                                      `/api/projects/${projectId}/overlays/${ov.id}/reset`,
                                      { method: "POST", credentials: "include" }
                                    );
                                    if (!resp.ok) throw new Error(await resp.text());
                                    toast.success("Overlay reset to original GPS bounds");
                                    onOverlayUpdated?.();
                                  } catch (err: any) {
                                    toast.error("Reset failed: " + err.message);
                                  }
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-amber-900/40 hover:text-amber-400 transition-all"
                              >
                                <RotateCcw size={18} />
                                <span className="text-sm font-semibold">Reset to Default</span>
                              </button>
                            )}

                            {/* Delete Overlay */}
                            {activeOverlays[0] && (
                              <button
                                onClick={async () => {
                                  const ov = activeOverlays[0];
                                  if (!confirm(`Delete "${ov.label || 'this overlay'}"? This cannot be undone.`)) return;
                                  try {
                                    const resp = await fetch(
                                      `/api/projects/${projectId}/overlays/${ov.id}`,
                                      { method: "DELETE", credentials: "include" }
                                    );
                                    if (!resp.ok) throw new Error(await resp.text());
                                    toast.success("Overlay deleted");
                                    setSidebarOpen(false);
                                    onOverlayUpdated?.();
                                  } catch (err: any) {
                                    toast.error("Delete failed: " + err.message);
                                  }
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-red-900/40 hover:text-red-400 transition-all"
                              >
                                <Trash2 size={18} />
                                <span className="text-sm font-semibold">Delete Overlay</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Save / Done */}
                        {(editMode || swipeMode) && (
                          <button
                            onClick={async () => {
                              if (editMode && editCorners && editCorners.length === 4 && editingOverlayId != null) {
                                // Compute cardinal bounds from the 4 corners
                                const lats = editCorners.map((c) => c[1]);
                                const lngs = editCorners.map((c) => c[0]);
                                const bounds = {
                                  north: Math.max(...lats),
                                  south: Math.min(...lats),
                                  east:  Math.max(...lngs),
                                  west:  Math.min(...lngs),
                                  ...(editRotation !== 0 ? { rotation: editRotation } : {}),
                                };
                                try {
                                  const resp = await fetch(
                                    `/api/projects/${projectId}/overlays/${editingOverlayId}`,
                                    {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      credentials: "include",
                                      body: JSON.stringify(bounds),
                                    }
                                  );
                                  if (!resp.ok) throw new Error(await resp.text());
                                  toast.success("Overlay position saved");
                                  onOverlayUpdated?.();
                                } catch (err: any) {
                                  toast.error("Failed to save: " + err.message);
                                }
                                handleFinishEdit();
                              }
                              setSwipeMode(false);
                              setSidebarOpen(false);
                            }}
                            className="w-full mt-auto bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-sm transition-colors"
                          >
                            Save Changes
                          </button>
                        )}

                        {/* Tip */}
                        {editMode && (
                          <p className="text-xs text-slate-400">
                            Drag <span className="text-emerald-400">green corners</span> to resize,
                            <span className="text-amber-400"> ↻ yellow handle</span> to rotate.
                            Toggle <span className="text-emerald-400">🔒 AR</span> in the header to lock aspect ratio.
                          </p>
                        )}
                        {swipeMode && (
                          <p className="text-xs text-slate-400">
                            Drag the <span className="text-blue-400">↔ white divider</span> left/right to compare the plan overlay against the satellite imagery.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Edit mode tip bar (below map) */}
              {editMode && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span>{" "}
                    Drag the <span className="text-emerald-400 font-medium">green corner handles</span> to resize and reposition.
                    Drag the <span className="text-amber-400 font-medium">↻ yellow handle</span> at the top to rotate.
                    Toggle <span className="text-emerald-400 font-medium">🔒 AR</span> in the toolbar to lock/unlock the aspect ratio.
                    Position auto-saves on each drop.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Fullscreen Media Viewer Modal */}
          {enlargedMedia && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              onClick={() => setEnlargedMedia(null)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 text-white hover:bg-white/20 z-10"
                onClick={() => setEnlargedMedia(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              <div className="max-w-[90vw] max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
                {enlargedMedia.mediaType === "video" ? (
                  <video
                    src={enlargedMedia.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={enlargedMedia.url}
                    alt={enlargedMedia.filename}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                  />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 rounded-b-lg">
                  <h3 className="font-semibold text-sm mb-1">{enlargedMedia.filename}</h3>
                  <div className="text-xs text-gray-300 flex flex-wrap gap-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {parseFloat(enlargedMedia.latitude as any).toFixed(6)},{" "}
                      {parseFloat(enlargedMedia.longitude as any).toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

EmbeddedProjectMap.displayName = "EmbeddedProjectMap";
