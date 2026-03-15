/**
 * MapboxProjectMap — Unified Mapbox GL JS map for the entire project
 *
 * Combines:
 *   1. GPS Pins (numbered markers with photo/video distinction)
 *   2. Flight Path (GeoJSON LineString layer)
 *   3. Overlay Editor (image source with 4-corner drag, rotation, 2-point snap)
 *   4. Sidebar overlay manager (opacity, visibility, edit, snap, reset, delete)
 *
 * This is the SOLE map engine — no Google Maps dependency.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Check,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  Layers,
  Move,
  RotateCcw,
  Trash2,
  X,
  MapPin,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { Media } from "../../../drizzle/schema";

// ── Re-export alignment helpers from MapboxOverlayView ──────────────────────
export {
  parseCoords,
  centroid,
  rotatePoint,
  applyRotation,
  topCenter,
  calculateTwoPointTransform,
} from "./MapboxOverlayView";

import {
  parseCoords,
  centroid,
  rotatePoint,
  applyRotation,
  topCenter,
  calculateTwoPointTransform,
  type OverlayData,
} from "./MapboxOverlayView";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MapboxProjectMapHandle {
  panToMedia: (latitude: number, longitude: number, mediaId?: string) => void;
  /** Returns the live Mapbox GL map instance (for flyby, etc.) */
  getMap: () => mapboxgl.Map | null;
  /** Returns whether the map has finished loading */
  isMapLoaded: () => boolean;
}

interface MapboxProjectMapProps {
  projectId: number;
  projectName: string;
  flightId?: number;
  isDemoProject?: boolean;
  /** Overlay data from project query */
  overlays?: OverlayData[];
  /** Callback after overlay CRUD to refetch project data */
  onOverlayUpdated?: () => void;
  /** Map height CSS class (default: h-[600px]) */
  heightClass?: string;
  /** Show the "Full Screen" link button */
  showFullScreenLink?: boolean;
}

// ── Corner labels & colors ──────────────────────────────────────────────────
const CORNER_LABELS = ["NW", "NE", "SE", "SW"];
const CORNER_COLORS = ["#10B981", "#10B981", "#10B981", "#10B981"];

// ── Component ────────────────────────────────────────────────────────────────

export const MapboxProjectMap = forwardRef<MapboxProjectMapHandle, MapboxProjectMapProps>(
  (props, ref) => {
    const {
      projectId,
      projectName,
      flightId,
      isDemoProject = false,
      overlays = [],
      onOverlayUpdated,
      heightClass = "h-[600px]",
      showFullScreenLink = true,
    } = props;

    // ── Refs ──────────────────────────────────────────────────────────────────
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const gpsMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const cornerMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const rotationMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const snapMarkersRef = useRef<mapboxgl.Marker[]>([]);

    // ── State ─────────────────────────────────────────────────────────────────
    const [mapLoaded, setMapLoaded] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [enlargedMedia, setEnlargedMedia] = useState<Media | null>(null);

    // Overlay state
    const [editMode, setEditMode] = useState(false);
    const [editingOverlayId, setEditingOverlayId] = useState<number | null>(null);
    const [editCorners, setEditCorners] = useState<[number, number][] | null>(null);
    const [editRotation, setEditRotation] = useState(0);
    const [aspectLocked, setAspectLocked] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [opacityMap, setOpacityMap] = useState<Record<number, number>>({});
    const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean>>({});
    const [isDeleting, setIsDeleting] = useState(false);

    // 2-Point Snap state
    const [snapMode, setSnapMode] = useState(false);
    const [snapStep, setSnapStep] = useState<"anchorA" | "targetA" | "anchorB" | "targetB" | "ready">("anchorA");
    const [anchorA, setAnchorA] = useState<{ lng: number; lat: number } | null>(null);
    const [targetA, setTargetA] = useState<{ lng: number; lat: number } | null>(null);
    const [anchorB, setAnchorB] = useState<{ lng: number; lat: number } | null>(null);
    const [targetB, setTargetB] = useState<{ lng: number; lat: number } | null>(null);

    const updateOverlayOpacity = trpc.project.updateOverlayOpacity.useMutation();

    // ── Fetch media ─────────────────────────────────────────────────────────
    const { data: mediaList, isLoading } = isDemoProject
      ? trpc.media.listDemo.useQuery({ projectId, flightId })
      : trpc.media.list.useQuery({ projectId, flightId });

    const mediaWithGPS = useMemo(() => {
      return mediaList?.filter((m) => m.latitude && m.longitude) || [];
    }, [mediaList]);

    const sortedMedia = useMemo(() => {
      return [...mediaWithGPS].sort((a, b) => {
        if (a.capturedAt && b.capturedAt)
          return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
        if (a.capturedAt && !b.capturedAt) return -1;
        if (!a.capturedAt && b.capturedAt) return 1;
        return a.filename.localeCompare(b.filename);
      });
    }, [mediaWithGPS]);

    const getCenter = useCallback((): [number, number] => {
      if (mediaWithGPS.length > 0) {
        const sumLat = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.latitude!), 0);
        const sumLng = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.longitude!), 0);
        return [sumLng / mediaWithGPS.length, sumLat / mediaWithGPS.length];
      }
      return [-96.797, 32.7767]; // Default: Dallas, TX
    }, [mediaWithGPS]);

    // ── Active overlays ─────────────────────────────────────────────────────
    const activeOverlays = useMemo(() => overlays.filter((o) => o.isActive), [overlays]);

    // Init overlay opacity/visibility from props
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

    // ── Expose panToMedia to parent ─────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      panToMedia: (latitude: number, longitude: number, mediaId?: string) => {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo({ center: [longitude, latitude], zoom: 20, duration: 800 });
        // Find and click the marker
        if (mediaId) {
          setTimeout(() => {
            const marker = gpsMarkersRef.current.find((m) => {
              const el = m.getElement();
              return el?.getAttribute("data-media-id") === String(mediaId);
            });
            if (marker) {
              const popup = marker.getPopup();
              if (popup && !popup.isOpen()) marker.togglePopup();
            }
          }, 900);
        }
      },
      getMap: () => mapRef.current,
      isMapLoaded: () => mapLoaded,
    }), [mapLoaded]);

    // ── Initialize Mapbox map ───────────────────────────────────────────────
    useEffect(() => {
      if (!mapContainerRef.current) return;
      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!token) {
        console.error("[MapboxProjectMap] VITE_MAPBOX_TOKEN is not set");
        return;
      }
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: getCenter(),
        zoom: mediaWithGPS.length > 0 ? 15 : 12,
        pitchWithRotate: false,
      });

      map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
      map.addControl(new mapboxgl.FullscreenControl(), "top-right");

      map.on("load", () => {
        mapRef.current = map;
        setMapLoaded(true);
        // Fix blank screen on resize/load
        map.resize();
        console.log("[MapboxProjectMap] Mapbox fully loaded and rendering.");
      });

      // Also resize on window resize
      const handleResize = () => map.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        map.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Add GPS markers + flight path ───────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || sortedMedia.length === 0) return;

      // Clear old GPS markers
      gpsMarkersRef.current.forEach((m) => m.remove());
      gpsMarkersRef.current = [];

      // Clear old flight path
      if (map.getLayer("flight-path")) map.removeLayer("flight-path");
      if (map.getSource("flight-path-src")) map.removeSource("flight-path-src");

      // ── Flight Path (GeoJSON LineString) ──
      const flightPathCoords = sortedMedia.map((m) => [
        parseFloat(m.longitude!),
        parseFloat(m.latitude!),
      ]);

      map.addSource("flight-path-src", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: flightPathCoords,
          },
        },
      });

      map.addLayer({
        id: "flight-path",
        type: "line",
        source: "flight-path-src",
        paint: {
          "line-color": "#10b981",
          "line-width": 3,
          "line-opacity": 0.8,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
      });

      // ── GPS Markers ──
      sortedMedia.forEach((media, index) => {
        const lng = parseFloat(media.longitude!);
        const lat = parseFloat(media.latitude!);
        const isVideo = media.mediaType === "video";
        const markerColor = isVideo ? "#ef4444" : "#10B981";

        // Create marker element
        const el = document.createElement("div");
        el.setAttribute("data-media-id", String(media.id));
        el.style.cssText = `
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
        `;
        el.textContent = String(index + 1);

        // Create popup
        const thumbnailUrl = media.thumbnailUrl || media.url;
        const popupHtml = `
          <div style="max-width:220px;font-family:system-ui,sans-serif">
            <img src="${thumbnailUrl}" style="width:100%;border-radius:6px;margin-bottom:8px" onerror="this.style.display='none'" />
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:#fff">${media.filename}</div>
            <div style="font-size:11px;color:#94a3b8">${parseFloat(media.latitude!).toFixed(6)}, ${parseFloat(media.longitude!).toFixed(6)}</div>
            ${media.altitude ? `<div style="font-size:11px;color:#94a3b8">Alt: ${parseFloat(String(media.altitude)).toFixed(1)}m</div>` : ""}
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 20,
          closeButton: true,
          maxWidth: "260px",
          className: "mapbox-media-popup",
        }).setHTML(popupHtml);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        // On popup open, set selected media
        popup.on("open", () => setSelectedMedia(media));

        gpsMarkersRef.current.push(marker);
      });

      // Fit bounds to all markers
      if (sortedMedia.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        sortedMedia.forEach((m) => {
          bounds.extend([parseFloat(m.longitude!), parseFloat(m.latitude!)]);
        });
        map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
      }
    }, [sortedMedia, mapLoaded]);

    // ── Render overlay image sources ────────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      // Remove old overlay sources/layers
      for (const ov of activeOverlays) {
        const srcId = `overlay-src-${ov.id}`;
        const layerId = `overlay-layer-${ov.id}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      }

      // Add each active overlay
      for (const ov of activeOverlays) {
        const coords = parseCoords(ov.coordinates);
        if (!coords || coords.length < 4) continue;

        const visible = visibilityMap[ov.id] ?? true;
        const opacity = opacityMap[ov.id] ?? 0.7;
        const srcId = `overlay-src-${ov.id}`;
        const layerId = `overlay-layer-${ov.id}`;

        try {
          map.addSource(srcId, {
            type: "image",
            url: ov.fileUrl,
            coordinates: coords as [[number, number], [number, number], [number, number], [number, number]],
          });

          // Insert overlay BELOW the flight path and markers
          const beforeLayerId = map.getLayer("flight-path") ? "flight-path" : undefined;

          map.addLayer(
            {
              id: layerId,
              type: "raster",
              source: srcId,
              paint: {
                "raster-opacity": visible ? opacity : 0,
                "raster-fade-duration": 0,
              },
            },
            beforeLayerId
          );
        } catch (err) {
          console.error("[MapboxProjectMap] Failed to add overlay", ov.id, err);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOverlays, mapLoaded, visibilityMap, opacityMap]);

    // ── Overlay helpers ─────────────────────────────────────────────────────

    const handleOpacityChange = useCallback((ovId: number, value: number) => {
      setOpacityMap((prev) => ({ ...prev, [ovId]: value }));
      const map = mapRef.current;
      if (!map) return;
      const layerId = `overlay-layer-${ovId}`;
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", value);
      }
    }, []);

    const handleOpacityCommit = useCallback((ovId: number, value: number) => {
      updateOverlayOpacity.mutate(
        { overlayId: ovId, projectId, opacity: value },
        { onError: (err) => toast.error("Failed to save opacity: " + err.message) }
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleToggleVisibility = useCallback((ovId: number) => {
      setVisibilityMap((prev) => {
        const next = { ...prev, [ovId]: !prev[ovId] };
        const map = mapRef.current;
        if (map) {
          const layerId = `overlay-layer-${ovId}`;
          if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, "raster-opacity", next[ovId] ? (opacityMap[ovId] ?? 0.7) : 0);
          }
        }
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opacityMap]);

    const updateOverlaySource = useCallback((ovId: number, corners: [number, number][]) => {
      const map = mapRef.current;
      if (!map) return;
      const srcId = `overlay-src-${ovId}`;
      const src = map.getSource(srcId) as mapboxgl.ImageSource | undefined;
      if (src) {
        src.setCoordinates(corners as [[number, number], [number, number], [number, number], [number, number]]);
      }
    }, []);

    const removeOverlayFromMap = useCallback((ovId: number) => {
      const map = mapRef.current;
      if (!map) return;
      const srcId = `overlay-src-${ovId}`;
      const layerId = `overlay-layer-${ovId}`;
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch (err) {
        console.warn(`[MapboxProjectMap] Error removing overlay ${ovId}:`, err);
      }
    }, []);

    // ── Save coordinates (blocking PUT) ─────────────────────────────────────
    const saveCoordinates = useCallback(async (ovId: number, corners: [number, number][], rotation?: number): Promise<boolean> => {
      try {
        const resp = await fetch(`/api/projects/${projectId}/overlays/${ovId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            coordinates: corners,
            ...(rotation !== undefined && rotation !== 0 ? { rotation } : {}),
          }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(errText || `HTTP ${resp.status}`);
        }
        return true;
      } catch (err: any) {
        console.error("[MapboxProjectMap] Save failed:", err);
        toast.error("Failed to save: " + err.message);
        return false;
      }
    }, [projectId]);

    const autoSave = useCallback((ovId: number, corners: [number, number][], rotation?: number) => {
      saveCoordinates(ovId, corners, rotation);
    }, [saveCoordinates]);

    // ── Edit mode ───────────────────────────────────────────────────────────
    const clearEditMarkers = useCallback(() => {
      cornerMarkersRef.current.forEach((m) => m.remove());
      cornerMarkersRef.current = [];
      if (rotationMarkerRef.current) {
        rotationMarkerRef.current.remove();
        rotationMarkerRef.current = null;
      }
    }, []);

    const handleStartEdit = useCallback((ov: OverlayData) => {
      const coords = parseCoords(ov.coordinates);
      if (!coords) {
        toast.error("Cannot edit: invalid coordinates");
        return;
      }
      setEditingOverlayId(ov.id);
      setEditCorners([...coords]);
      const rot = typeof ov.rotation === "string" ? parseFloat(ov.rotation) : (ov.rotation ?? 0);
      setEditRotation(typeof rot === "number" && !isNaN(rot) ? rot : 0);
      setEditMode(true);
    }, []);

    const handleCancelEdit = useCallback(() => {
      clearEditMarkers();
      setEditMode(false);
      setEditingOverlayId(null);
      setEditCorners(null);
      setEditRotation(0);
      // Restore original overlay source coordinates from props
      for (const ov of activeOverlays) {
        const coords = parseCoords(ov.coordinates);
        if (coords) updateOverlaySource(ov.id, coords);
      }
    }, [clearEditMarkers, activeOverlays, updateOverlaySource]);

    const handleFinishEdit = useCallback(async () => {
      if (!editCorners || editingOverlayId == null) return;
      setIsSaving(true);
      try {
        const success = await saveCoordinates(editingOverlayId, editCorners, editRotation);
        if (!success) {
          setIsSaving(false);
          return;
        }
        toast.success("Overlay position saved");
        clearEditMarkers();
        setEditMode(false);
        setEditingOverlayId(null);
        setEditCorners(null);
        setEditRotation(0);
        onOverlayUpdated?.();
      } catch (err: any) {
        toast.error("Failed to save: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }, [editCorners, editingOverlayId, editRotation, saveCoordinates, onOverlayUpdated, clearEditMarkers]);

    // ── Create draggable corner markers ─────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !editMode || !editCorners || editCorners.length < 4 || editingOverlayId == null) {
        clearEditMarkers();
        return;
      }

      clearEditMarkers();
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      const currentCorners: [number, number][] = [...editCorners];

      // Corner markers
      currentCorners.forEach(([lng, lat], i) => {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 28px; height: 28px; border-radius: 50%;
          background: ${CORNER_COLORS[i]}; border: 3px solid white;
          cursor: grab; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: white;
          user-select: none; z-index: 10;
        `;
        el.textContent = CORNER_LABELS[i];

        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);

        marker.on("dragstart", () => { map.dragPan.disable(); });

        marker.on("drag", () => {
          const pos = marker.getLngLat();
          currentCorners[i] = [pos.lng, pos.lat];

          if (aspectLocked) {
            if (i === 0 || i === 2) {
              currentCorners[1] = [currentCorners[1][0], currentCorners[0][1]];
              currentCorners[3] = [currentCorners[0][0], currentCorners[3][1]];
              currentCorners[2] = [currentCorners[1][0], currentCorners[3][1]];
            } else {
              currentCorners[0] = [currentCorners[0][0], currentCorners[1][1]];
              currentCorners[2] = [currentCorners[1][0], currentCorners[2][1]];
              currentCorners[3] = [currentCorners[0][0], currentCorners[3][1]];
            }
          }

          // CRITICAL: Update the Mapbox image source live
          const source = map.getSource(`overlay-src-${editingOverlayId}`) as mapboxgl.ImageSource | undefined;
          if (source) {
            source.setCoordinates(currentCorners as [[number, number], [number, number], [number, number], [number, number]]);
          }

          // Update sibling marker positions
          cornerMarkersRef.current.forEach((m, j) => {
            if (j !== i) m.setLngLat(currentCorners[j] as [number, number]);
          });

          // Update rotation handle
          const tc = topCenter(currentCorners);
          if (rotationMarkerRef.current) rotationMarkerRef.current.setLngLat(tc);
        });

        marker.on("dragend", () => {
          map.dragPan.enable();
          setEditCorners([...currentCorners]);
          autoSave(editingOverlayId, currentCorners, editRotation);
        });

        cornerMarkersRef.current.push(marker);
      });

      // Rotation handle
      const tc = topCenter(currentCorners);
      const rotEl = document.createElement("div");
      rotEl.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: #f59e0b; border: 2px solid white;
        cursor: grab; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; user-select: none; z-index: 10;
      `;
      rotEl.textContent = "↻";

      let prevAngle = 0;
      const rotMarker = new mapboxgl.Marker({ element: rotEl, draggable: true })
        .setLngLat(tc)
        .addTo(map);

      rotMarker.on("dragstart", () => {
        map.dragPan.disable();
        const c = centroid(currentCorners);
        const pos = rotMarker.getLngLat();
        prevAngle = Math.atan2(pos.lat - c[1], pos.lng - c[0]);
      });

      rotMarker.on("drag", () => {
        const c = centroid(currentCorners);
        const pos = rotMarker.getLngLat();
        const newAngle = Math.atan2(pos.lat - c[1], pos.lng - c[0]);
        const delta = ((newAngle - prevAngle) * 180) / Math.PI;
        prevAngle = newAngle;

        const rotated = applyRotation(currentCorners, delta);
        for (let j = 0; j < 4; j++) currentCorners[j] = rotated[j];

        const source = map.getSource(`overlay-src-${editingOverlayId}`) as mapboxgl.ImageSource | undefined;
        if (source) {
          source.setCoordinates(currentCorners as [[number, number], [number, number], [number, number], [number, number]]);
        }

        cornerMarkersRef.current.forEach((m, j) => m.setLngLat(currentCorners[j]));
        setEditRotation((prev) => prev + delta);
      });

      rotMarker.on("dragend", () => {
        map.dragPan.enable();
        setEditCorners([...currentCorners]);
        autoSave(editingOverlayId, currentCorners, editRotation);
      });

      rotationMarkerRef.current = rotMarker;

      return () => {
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editMode, editCorners?.length, editingOverlayId, mapLoaded, aspectLocked]);

    // ── 2-Point Snap ────────────────────────────────────────────────────────
    const startSnapMode = useCallback((ov: OverlayData) => {
      const coords = parseCoords(ov.coordinates);
      if (!coords) return;
      setEditingOverlayId(ov.id);
      setEditCorners([...coords]);
      setEditMode(true);
      setSnapMode(true);
      setSnapStep("anchorA");
      setAnchorA(null);
      setTargetA(null);
      setAnchorB(null);
      setTargetB(null);
      setSidebarOpen(false);
    }, []);

    const cancelSnapMode = useCallback(() => {
      setSnapMode(false);
      setSnapStep("anchorA");
      setAnchorA(null);
      setTargetA(null);
      setAnchorB(null);
      setTargetB(null);
      snapMarkersRef.current.forEach((m) => m.remove());
      snapMarkersRef.current = [];
    }, []);

    // Snap click handler
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !snapMode) return;

      const addSnapMarker = (lngLat: { lng: number; lat: number }, color: string, label: string) => {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 20px; height: 20px; border-radius: 50%;
          background: ${color}; border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; font-weight: 700; color: white;
        `;
        el.textContent = label;
        const m = new mapboxgl.Marker({ element: el }).setLngLat([lngLat.lng, lngLat.lat]).addTo(map);
        snapMarkersRef.current.push(m);
      };

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const pt = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        setSnapStep((prev) => {
          if (prev === "anchorA") { setAnchorA(pt); addSnapMarker(pt, "#ef4444", "A"); return "targetA"; }
          if (prev === "targetA") { setTargetA(pt); addSnapMarker(pt, "#3b82f6", "A'"); return "anchorB"; }
          if (prev === "anchorB") { setAnchorB(pt); addSnapMarker(pt, "#ef4444", "B"); return "targetB"; }
          if (prev === "targetB") { setTargetB(pt); addSnapMarker(pt, "#3b82f6", "B'"); return "ready"; }
          return prev;
        });
      };

      map.on("click", handleClick);
      return () => { map.off("click", handleClick); };
    }, [snapMode, mapLoaded]);

    const executeSnap = useCallback(async () => {
      if (!anchorA || !targetA || !anchorB || !targetB || !editCorners || editingOverlayId == null) return;
      const transformed = calculateTwoPointTransform(anchorA, targetA, anchorB, targetB, editCorners);
      setEditCorners(transformed);
      updateOverlaySource(editingOverlayId, transformed);

      // Update corner markers
      cornerMarkersRef.current.forEach((m, i) => m.setLngLat(transformed[i]));
      const tc = topCenter(transformed);
      if (rotationMarkerRef.current) rotationMarkerRef.current.setLngLat(tc);

      // Save immediately
      setIsSaving(true);
      const success = await saveCoordinates(editingOverlayId, transformed, editRotation);
      setIsSaving(false);

      if (success) {
        toast.success("2-Point Snap applied and saved!");
        cancelSnapMode();
        clearEditMarkers();
        setEditMode(false);
        setEditingOverlayId(null);
        setEditCorners(null);
        setEditRotation(0);
        onOverlayUpdated?.();
      }
    }, [anchorA, targetA, anchorB, targetB, editCorners, editingOverlayId, editRotation, updateOverlaySource, saveCoordinates, cancelSnapMode, clearEditMarkers, onOverlayUpdated]);

    // ── Reset overlay ───────────────────────────────────────────────────────
    const handleReset = async (ov: OverlayData) => {
      if (!confirm("Reset overlay to its original GPS-derived position?")) return;
      try {
        const resp = await fetch(`/api/projects/${projectId}/overlays/${ov.id}/reset`, {
          method: "POST",
          credentials: "include",
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const newCoords = parseCoords(data.coordinates);
        if (newCoords) updateOverlaySource(ov.id, newCoords);
        toast.success("Overlay reset to default position");
        onOverlayUpdated?.();
      } catch (err: any) {
        toast.error("Reset failed: " + err.message);
      }
    };

    // ── Delete overlay ──────────────────────────────────────────────────────
    const handleDelete = async (ov: OverlayData) => {
      if (!confirm("Delete this overlay? This cannot be undone.")) return;
      setIsDeleting(true);
      try {
        const resp = await fetch(`/api/projects/${projectId}/overlays/${ov.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!resp.ok) throw new Error(await resp.text());
        removeOverlayFromMap(ov.id);
        if (editingOverlayId === ov.id) {
          clearEditMarkers();
          setEditMode(false);
          setEditingOverlayId(null);
          setEditCorners(null);
          setEditRotation(0);
        }
        setOpacityMap((prev) => { const n = { ...prev }; delete n[ov.id]; return n; });
        setVisibilityMap((prev) => { const n = { ...prev }; delete n[ov.id]; return n; });
        setSidebarOpen(false);
        toast.success("Overlay deleted successfully");
        onOverlayUpdated?.();
      } catch (err: any) {
        toast.error("Delete failed: " + err.message);
      } finally {
        setIsDeleting(false);
      }
    };

    // ── Snap step labels ────────────────────────────────────────────────────
    const snapStepLabel: Record<string, string> = {
      anchorA: "Click blueprint: place Anchor A",
      targetA: "Click map: place Target A'",
      anchorB: "Click blueprint: place Anchor B",
      targetB: "Click map: place Target B'",
      ready: "Ready to snap!",
    };

    // ── Loading state ───────────────────────────────────────────────────────
    if (isLoading) {
      return (
        <Card className="bg-card">
          <CardContent className="pt-4">
            <Skeleton className={`w-full ${heightClass} rounded-lg`} />
          </CardContent>
        </Card>
      );
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
      <Card className="bg-card">
        <CardContent className="pt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              <MapPin className="h-5 w-5 inline mr-2 text-emerald-400" />
              Project Map
              {mediaWithGPS.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({mediaWithGPS.length} location{mediaWithGPS.length !== 1 ? "s" : ""})
                </span>
              )}
              {activeOverlays.length > 0 && (
                <span className="text-sm font-normal text-blue-400 ml-2">
                  • {activeOverlays.length} overlay{activeOverlays.length !== 1 ? "s" : ""}
                </span>
              )}
            </h2>
          </div>

          {mediaWithGPS.length === 0 && activeOverlays.length === 0 ? (
            <div className={`w-full ${heightClass} rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center text-muted-foreground`}>
              <Navigation className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No GPS Data Available</p>
              <p className="text-sm">Upload media with GPS coordinates to see them on the map</p>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-slate-800">
              {/* Mapbox container */}
              <div ref={mapContainerRef} className={`w-full min-h-[500px] ${heightClass}`} />

              {/* Map status indicator */}
              <div className="absolute bottom-4 left-4 z-[5] bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-[10px] text-slate-300 border border-slate-700">
                Mapbox GL JS &bull; Satellite-Streets-V12
              </div>

              {/* Edit mode toolbar */}
              {editMode && !snapMode && (
                <div className="absolute top-3 left-3 z-[20] flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-medium bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
                    ↻ {editRotation.toFixed(1)}°
                  </span>
                  <button
                    title={aspectLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                    onClick={() => setAspectLocked((v) => !v)}
                    className={`text-xs px-2 py-1 rounded font-medium transition-colors backdrop-blur-sm ${
                      aspectLocked
                        ? "border border-emerald-500 text-emerald-400 bg-emerald-500/20"
                        : "border border-zinc-500 text-zinc-400 bg-zinc-500/20"
                    }`}
                  >
                    {aspectLocked ? "🔒 AR" : "🔓 AR"}
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/20 bg-black/60 backdrop-blur-sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleFinishEdit}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <><span className="animate-spin mr-1">⏳</span> Saving...</>
                    ) : (
                      <><Check className="h-3 w-3 mr-1" /> Save & Finish</>
                    )}
                  </Button>
                </div>
              )}

              {/* 2-Point Snap toolbar */}
              {snapMode && (
                <div className="absolute top-3 left-3 right-3 z-[20] flex items-center gap-2 bg-black/80 backdrop-blur-md rounded-lg px-4 py-3">
                  <Crosshair className="h-5 w-5 text-blue-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">2-Point Snap Alignment</p>
                    <p className="text-xs text-slate-300">{snapStepLabel[snapStep]}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1">
                      <span className={`w-2 h-2 rounded-full ${anchorA ? "bg-red-500" : "bg-slate-600"}`} title="Anchor A" />
                      <span className={`w-2 h-2 rounded-full ${targetA ? "bg-blue-500" : "bg-slate-600"}`} title="Target A'" />
                      <span className={`w-2 h-2 rounded-full ${anchorB ? "bg-red-500" : "bg-slate-600"}`} title="Anchor B" />
                      <span className={`w-2 h-2 rounded-full ${targetB ? "bg-blue-500" : "bg-slate-600"}`} title="Target B'" />
                    </div>
                    {snapStep === "ready" && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={executeSnap}
                        disabled={isSaving}
                      >
                        {isSaving ? "Snapping..." : "Snap!"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500/20 bg-black/60"
                      onClick={() => { cancelSnapMode(); handleCancelEdit(); }}
                    >
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Bottom-left badge */}
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
                {mediaWithGPS.length > 0 && (
                  <>
                    <span className="text-emerald-400 font-medium">{mediaWithGPS.length}</span> GPS points
                    <span className="text-emerald-400 ml-2">—</span> Flight path
                  </>
                )}
                {activeOverlays.length > 0 && (
                  <>
                    {mediaWithGPS.length > 0 && <span className="mx-2">•</span>}
                    <span className="text-blue-400 font-medium">{activeOverlays.length}</span> overlay{activeOverlays.length !== 1 ? "s" : ""}
                    {editMode && !snapMode && <span className="text-amber-400 ml-1">• editing</span>}
                    {snapMode && <span className="text-blue-400 ml-1">• snap mode</span>}
                  </>
                )}
              </div>

              {/* ── Overlay Manager Sidebar ── */}
              {activeOverlays.length > 0 && (
                <>
                  {!sidebarOpen && !snapMode && (
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-[100] bg-slate-900/90 backdrop-blur-md text-white p-2 rounded-l-md border-l border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
                      title="Open Overlay Manager"
                    >
                      <Layers size={18} />
                    </button>
                  )}

                  <div
                    className={`absolute right-0 top-0 h-full w-72 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl transition-transform duration-300 z-[100] ${
                      sidebarOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                  >
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="absolute -left-10 top-4 bg-slate-900 p-2 rounded-l-md border-l border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>

                    <div className="p-5 h-full overflow-y-auto flex flex-col gap-5">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                        <div className="flex items-center gap-2">
                          <Layers className="text-blue-400" size={20} />
                          <h2 className="font-bold text-lg tracking-tight">Overlay Manager</h2>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                          <X size={16} />
                        </button>
                      </div>

                      {activeOverlays.map((ov) => {
                        const opacity = opacityMap[ov.id] ?? 0.7;
                        const visible = visibilityMap[ov.id] ?? true;
                        const label = ov.label || `Plan ${ov.id}`;
                        return (
                          <div key={ov.id} className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-200 truncate max-w-[160px]" title={label}>
                                {label}
                              </span>
                              <button
                                onClick={() => handleToggleVisibility(ov.id)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                title={visible ? "Hide overlay" : "Show overlay"}
                              >
                                {visible ? <Eye size={18} /> : <EyeOff size={18} className="text-slate-500" />}
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-slate-400">
                                <span>Opacity</span>
                                <span>{Math.round(opacity * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
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

                      {!isDemoProject && (
                        <div className="pt-2 border-t border-slate-700 space-y-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tools</p>

                          <button
                            onClick={() => {
                              if (editMode) { handleCancelEdit(); }
                              else if (activeOverlays[0]) { handleStartEdit(activeOverlays[0]); setSidebarOpen(false); }
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                              editMode && !snapMode ? "bg-blue-600 shadow-lg shadow-blue-900/40" : "bg-slate-800 hover:bg-slate-700"
                            }`}
                          >
                            <Move size={18} />
                            <div className="text-left">
                              <span className="text-sm font-semibold block">{editMode && !snapMode ? "Stop Editing" : "Edit Alignment"}</span>
                              <span className="text-[10px] text-slate-400">Drag corners to resize & rotate</span>
                            </div>
                          </button>

                          {activeOverlays[0] && (
                            <button
                              onClick={() => {
                                if (snapMode) { cancelSnapMode(); handleCancelEdit(); }
                                else { startSnapMode(activeOverlays[0]); }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                snapMode ? "bg-blue-600 shadow-lg shadow-blue-900/40" : "bg-slate-800 hover:bg-slate-700"
                              }`}
                            >
                              <Crosshair size={18} />
                              <div className="text-left">
                                <span className="text-sm font-semibold block">{snapMode ? "Cancel Snap" : "2-Point Snap"}</span>
                                <span className="text-[10px] text-slate-400">Match 2 points for precise alignment</span>
                              </div>
                            </button>
                          )}

                          {activeOverlays[0] && (
                            <button
                              onClick={() => handleReset(activeOverlays[0])}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-amber-900/40 hover:text-amber-400 transition-all"
                            >
                              <RotateCcw size={18} />
                              <span className="text-sm font-semibold">Reset to Default</span>
                            </button>
                          )}

                          {activeOverlays[0] && (
                            <button
                              onClick={() => handleDelete(activeOverlays[0])}
                              disabled={isDeleting}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-red-900/40 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={18} />
                              <span className="text-sm font-semibold">{isDeleting ? "Deleting..." : "Delete Overlay"}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {editMode && !snapMode && (
                        <p className="text-xs text-slate-400 mt-auto">
                          Drag <span className="text-emerald-400">green corners</span> to resize — the image stretches live.{" "}
                          <span className="text-amber-400">↻ yellow handle</span> rotates all 4 corners. Toggle{" "}
                          <span className="text-emerald-400">🔒 AR</span> to lock aspect ratio. Click{" "}
                          <span className="text-emerald-400">Save & Finish</span> to persist.
                        </p>
                      )}

                      {snapMode && (
                        <div className="text-xs text-slate-400 mt-auto space-y-2">
                          <p className="font-semibold text-blue-400">How 2-Point Snap works:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Click a known point on the <span className="text-red-400">blueprint</span> (Anchor A)</li>
                            <li>Click where it should be on the <span className="text-blue-400">map</span> (Target A')</li>
                            <li>Repeat for a second point (Anchor B → Target B')</li>
                            <li>Click <span className="text-blue-400">Snap!</span> to align</li>
                          </ol>
                          <p>The overlay will translate, rotate, and scale to match your two reference points.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
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
                  <video src={enlargedMedia.url} controls autoPlay className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                ) : (
                  <img src={enlargedMedia.url} alt={enlargedMedia.filename} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
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

MapboxProjectMap.displayName = "MapboxProjectMap";
