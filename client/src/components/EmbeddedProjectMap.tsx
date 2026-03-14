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
import { Check, Expand, Layers, MapPin, Navigation, Pencil, X } from "lucide-react";
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
    const cornerMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const editOverlayRef = useRef<google.maps.GroundOverlay | null>(null);
    const editRectRef = useRef<google.maps.Polygon | null>(null);

    // ── Opacity state — keyed by overlay id ──────────────────────────────────
    const [opacityMap, setOpacityMap] = useState<Record<number, number>>({});

    // Initialise opacity from props when overlays first load
    useEffect(() => {
      const init: Record<number, number> = {};
      for (const ov of overlays) {
        if (!(ov.id in opacityMap)) {
          const val = typeof ov.opacity === "string" ? parseFloat(ov.opacity) : (ov.opacity ?? 0.7);
          init[ov.id] = isNaN(val) ? 0.7 : val;
        }
      }
      if (Object.keys(init).length > 0) setOpacityMap((prev) => ({ ...prev, ...init }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [overlays]);

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

    // ── Edit Mode: render draggable corner markers + live-update overlay ─────
    useEffect(() => {
      if (!mapReady || !mapRef.current) return;
      const map = mapRef.current;

      // Cleanup previous edit markers
      cornerMarkersRef.current.forEach((m) => (m.map = null));
      cornerMarkersRef.current = [];
      if (editOverlayRef.current) { editOverlayRef.current.setMap(null); editOverlayRef.current = null; }
      if (editRectRef.current) { editRectRef.current.setMap(null); editRectRef.current = null; }

      if (!editMode || !editCorners || editCorners.length < 4) return;

      const ov = overlays.find((o) => o.id === editingOverlayId);
      if (!ov) return;

      // Draw the edit overlay (live preview)
      const rebuildOverlay = (corners: [number, number][]) => {
        if (editOverlayRef.current) editOverlayRef.current.setMap(null);
        const sw = new google.maps.LatLng(corners[3][1], corners[3][0]);
        const ne = new google.maps.LatLng(corners[1][1], corners[1][0]);
        const bounds = new google.maps.LatLngBounds(sw, ne);
        const opacity = typeof ov.opacity === "string" ? parseFloat(ov.opacity as string) : (ov.opacity ?? 0.5);
        editOverlayRef.current = new google.maps.GroundOverlay(ov.fileUrl, bounds, { opacity, clickable: false });
        editOverlayRef.current.setMap(map);
      };

      // Draw outline polygon
      const rebuildRect = (corners: [number, number][]) => {
        if (editRectRef.current) editRectRef.current.setMap(null);
        editRectRef.current = new google.maps.Polygon({
          paths: corners.map(([lng, lat]) => ({ lat, lng })),
          strokeColor: "#10B981",
          strokeWeight: 2,
          fillOpacity: 0,
          map,
        });
      };

      rebuildOverlay(editCorners);
      rebuildRect(editCorners);

      const LABELS = ["TL", "TR", "BR", "BL"];
      const currentCorners: [number, number][] = [...editCorners] as [number, number][];

      currentCorners.forEach(([lng, lat], i) => {
        const el = document.createElement("div");
        el.style.cssText = `
          background: #10B981;
          color: white;
          border: 2px solid white;
          border-radius: 4px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          user-select: none;
        `;
        el.textContent = LABELS[i];

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat, lng },
          map,
          content: el,
          gmpDraggable: true,
        });

        marker.addListener("drag", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          currentCorners[i] = [e.latLng.lng(), e.latLng.lat()];
          rebuildOverlay(currentCorners);
          rebuildRect(currentCorners);
        });

        marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          currentCorners[i] = [e.latLng.lng(), e.latLng.lat()];
          setEditCorners([...currentCorners]);
        });

        cornerMarkersRef.current.push(marker);
      });

      return () => {
        cornerMarkersRef.current.forEach((m) => (m.map = null));
        cornerMarkersRef.current = [];
        if (editOverlayRef.current) { editOverlayRef.current.setMap(null); editOverlayRef.current = null; }
        if (editRectRef.current) { editRectRef.current.setMap(null); editRectRef.current = null; }
      };
    }, [editMode, editCorners, editingOverlayId, mapReady, overlays]);

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
                  <span className="text-xs text-amber-400 font-medium">Drag corners to align</span>
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
              <div className="relative">
                <MapView
                  className="w-full h-[500px] rounded-lg overflow-hidden"
                  initialCenter={getCenter()}
                  initialZoom={14}
                  onMapReady={handleMapReady}
                />
                {mediaWithGPS.length > 0 && (
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{mediaWithGPS.length}</span> GPS points •{" "}
                    <span className="text-emerald-500 ml-1">—</span> Flight path
                  </div>
                )}
                {activeOverlays.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{activeOverlays.length}</span> overlay
                    {activeOverlays.length !== 1 ? "s" : ""}
                    {editMode && <span className="text-amber-400 ml-1">• editing</span>}
                  </div>
                )}
              </div>
              {/* Opacity slider(s) — shown when overlays are active and not in edit mode */}
              {!editMode && activeOverlays.length > 0 && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border space-y-3">
                  {activeOverlays.map((ov) => {
                    const opacity = opacityMap[ov.id] ?? 0.7;
                    return (
                      <div key={ov.id} className="flex items-center gap-3">
                        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground shrink-0 w-16 truncate">
                          Opacity
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={opacity}
                          onChange={(e) => handleOpacityChange(ov.id, parseFloat(e.target.value))}
                          onMouseUp={(e) => handleOpacityCommit(ov.id, parseFloat((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => handleOpacityCommit(ov.id, parseFloat((e.target as HTMLInputElement).value))}
                          className="flex-1 h-2 accent-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-foreground w-8 text-right shrink-0">
                          {Math.round(opacity * 100)}%
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span>{" "}
                    Drag the slider to fade the plan overlay. Use <span className="text-amber-400">Align Overlay</span> to reposition corners.
                  </p>
                </div>
              )}
              {editMode && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span>{" "}
                    Drag the green corner handles to align the plan overlay with the satellite map, then click Finish.
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
