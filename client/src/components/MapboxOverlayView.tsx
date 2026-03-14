/**
 * MapboxOverlayView — Mapbox GL JS overlay editor
 * Renders a plan overlay as a Mapbox image source with:
 *   - 4 draggable corner markers (NW, NE, SE, SW)
 *   - Rotation handle (top-center) with rotation matrix applied to all 4 corners
 *   - Floating sidebar: opacity slider, visibility toggle, edit/reset/delete
 *   - Auto-save on every marker drop
 *   - Delete: API call + state clear + Mapbox source/layer removal + DB row removal
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Move,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ── Types ────────────────────────────────────────────────────────────────────

export interface OverlayData {
  id: number;
  fileUrl: string;
  coordinates: string | unknown;
  opacity?: string | number;
  isActive?: number;
  rotation?: string | number;
  label?: string;
}

interface MapboxOverlayViewProps {
  projectId: number;
  overlays: OverlayData[];
  center: { lat: number; lng: number };
  zoom?: number;
  isDemoProject?: boolean;
  onOverlayUpdated?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse coordinates from DB — may be JSON string or array. Returns [[lng,lat],...] (4 corners: TL, TR, BR, BL) */
function parseCoords(raw: string | unknown): [number, number][] | null {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length >= 4) return parsed as [number, number][];
  } catch {}
  return null;
}

/** Centroid of N [lng,lat] points */
function centroid(pts: [number, number][]): [number, number] {
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

/** Rotate a point around a pivot by angleDeg degrees */
function rotatePoint(pt: [number, number], pivot: [number, number], angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = pt[0] - pivot[0];
  const dy = pt[1] - pivot[1];
  return [
    pivot[0] + dx * Math.cos(rad) - dy * Math.sin(rad),
    pivot[1] + dx * Math.sin(rad) + dy * Math.cos(rad),
  ];
}

/** Apply rotation to all corners around their centroid */
function applyRotation(corners: [number, number][], angleDeg: number): [number, number][] {
  const c = centroid(corners);
  return corners.map((pt) => rotatePoint(pt, c, angleDeg));
}

/** Top-center handle position — sits above the TL–TR midpoint */
function topCenter(corners: [number, number][]): [number, number] {
  return [
    (corners[0][0] + corners[1][0]) / 2,
    Math.max(corners[0][1], corners[1][1]) + 0.0003,
  ];
}

// Corner labels and colors
const CORNER_LABELS = ["NW", "NE", "SE", "SW"];
const CORNER_COLORS = ["#10B981", "#10B981", "#10B981", "#10B981"]; // emerald

// ── Component ────────────────────────────────────────────────────────────────

export function MapboxOverlayView({
  projectId,
  overlays,
  center,
  zoom = 16,
  isDemoProject = false,
  onOverlayUpdated,
}: MapboxOverlayViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const rotationMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [mapLoaded, setMapLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingOverlayId, setEditingOverlayId] = useState<number | null>(null);
  const [editCorners, setEditCorners] = useState<[number, number][] | null>(null);
  const [editRotation, setEditRotation] = useState(0);
  const [aspectLocked, setAspectLocked] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [opacityMap, setOpacityMap] = useState<Record<number, number>>({});
  const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const updateOverlayOpacity = trpc.project.updateOverlayOpacity.useMutation();

  const activeOverlays = useMemo(() => overlays.filter((o) => o.isActive), [overlays]);

  // ── Init opacity/visibility from props ─────────────────────────────────────
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

  // ── Initialize Mapbox map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.error("[MapboxOverlay] VITE_MAPBOX_TOKEN is not set");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [center.lng, center.lat],
      zoom,
      pitchWithRotate: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render overlays as Mapbox image sources ────────────────────────────────
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

      // Mapbox image source expects coordinates as [[lng,lat]] in order: TL, TR, BR, BL
      try {
        map.addSource(srcId, {
          type: "image",
          url: ov.fileUrl,
          coordinates: coords as [[number, number], [number, number], [number, number], [number, number]],
        });

        map.addLayer({
          id: layerId,
          type: "raster",
          source: srcId,
          paint: {
            "raster-opacity": visible ? opacity : 0,
            "raster-fade-duration": 0,
          },
        });
      } catch (err) {
        console.error("[MapboxOverlay] Failed to add overlay", ov.id, err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlays, mapLoaded, visibilityMap, opacityMap]);

  // ── Update overlay opacity live ────────────────────────────────────────────
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

  // ── Toggle visibility ──────────────────────────────────────────────────────
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

  // ── Edit Mode: create draggable markers on corners ─────────────────────────
  const clearEditMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (rotationMarkerRef.current) {
      rotationMarkerRef.current.remove();
      rotationMarkerRef.current = null;
    }
  }, []);

  /** Update the Mapbox image source coordinates — THIS is the critical link between handles and image */
  const updateOverlaySource = useCallback((ovId: number, corners: [number, number][]) => {
    const map = mapRef.current;
    if (!map) return;
    const srcId = `overlay-src-${ovId}`;
    const src = map.getSource(srcId) as mapboxgl.ImageSource | undefined;
    if (src) {
      src.setCoordinates(corners as [[number, number], [number, number], [number, number], [number, number]]);
    }
  }, []);

  /** Remove a specific overlay's Mapbox source and layer from the map */
  const removeOverlayFromMap = useCallback((ovId: number) => {
    const map = mapRef.current;
    if (!map) return;
    const srcId = `overlay-src-${ovId}`;
    const layerId = `overlay-layer-${ovId}`;
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(srcId)) map.removeSource(srcId);
      console.log(`[MapboxOverlay] Removed source/layer for overlay ${ovId}`);
    } catch (err) {
      console.warn(`[MapboxOverlay] Error removing overlay ${ovId} from map:`, err);
    }
  }, []);

  // Auto-save coordinates on drag end — saves the actual 4-corner array, not just cardinal bounds
  const autoSave = useCallback(async (ovId: number, corners: [number, number][], rotation?: number) => {
    try {
      const lats = corners.map((c) => c[1]);
      const lngs = corners.map((c) => c[0]);
      await fetch(`/api/projects/${projectId}/overlays/${ovId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          north: Math.max(...lats),
          south: Math.min(...lats),
          east: Math.max(...lngs),
          west: Math.min(...lngs),
          ...(rotation !== undefined && rotation !== 0 ? { rotation } : {}),
        }),
      });
    } catch (err) {
      console.error("[MapboxOverlay] Auto-save failed", err);
    }
  }, [projectId]);

  // ── Start/Stop/Cancel edit ─────────────────────────────────────────────────
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

    // Restore original overlay source coordinates
    for (const ov of activeOverlays) {
      const coords = parseCoords(ov.coordinates);
      if (coords) updateOverlaySource(ov.id, coords);
    }
  }, [clearEditMarkers, activeOverlays, updateOverlaySource]);

  const handleFinishEdit = useCallback(async () => {
    if (!editCorners || editingOverlayId == null) return;
    try {
      const lats = editCorners.map((c) => c[1]);
      const lngs = editCorners.map((c) => c[0]);
      const resp = await fetch(`/api/projects/${projectId}/overlays/${editingOverlayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          north: Math.max(...lats),
          south: Math.min(...lats),
          east: Math.max(...lngs),
          west: Math.min(...lngs),
          ...(editRotation !== 0 ? { rotation: editRotation } : {}),
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success("Overlay position saved");
      onOverlayUpdated?.();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    }
    clearEditMarkers();
    setEditMode(false);
    setEditingOverlayId(null);
    setEditCorners(null);
    setEditRotation(0);
  }, [editCorners, editingOverlayId, editRotation, projectId, onOverlayUpdated, clearEditMarkers]);

  // ── Create/update draggable markers when editCorners changes ───────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !editMode || !editCorners || editCorners.length < 4 || editingOverlayId == null) {
      clearEditMarkers();
      return;
    }

    // Clear old markers
    clearEditMarkers();

    // Disable map rotation during edit
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    // Use a mutable array that persists across drag events
    const currentCorners: [number, number][] = [...editCorners];

    // ── Create corner markers ──
    currentCorners.forEach(([lng, lat], i) => {
      const el = document.createElement("div");
      el.className = "mapbox-corner-handle";
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

      marker.on("dragstart", () => {
        map.dragPan.disable();
      });

      marker.on("drag", () => {
        const pos = marker.getLngLat();
        currentCorners[i] = [pos.lng, pos.lat];

        // Aspect ratio lock: adjust adjacent corners
        if (aspectLocked) {
          if (i === 0 || i === 2) {
            // NW or SE: update NE.lat and SW.lng
            currentCorners[1] = [currentCorners[1][0], currentCorners[0][1]]; // NE lat = NW lat
            currentCorners[3] = [currentCorners[0][0], currentCorners[3][1]]; // SW lng = NW lng
            currentCorners[2] = [currentCorners[1][0], currentCorners[3][1]]; // SE = NE.lng, SW.lat
          } else {
            // NE or SW: update NW.lat and SE.lng
            currentCorners[0] = [currentCorners[0][0], currentCorners[1][1]]; // NW lat = NE lat
            currentCorners[2] = [currentCorners[1][0], currentCorners[2][1]]; // SE lng = NE lng
            currentCorners[3] = [currentCorners[0][0], currentCorners[3][1]]; // SW lng = NW lng
          }
        }

        // *** CRITICAL: Update the Mapbox image source so the image stretches/shrinks live ***
        const source = map.getSource(`overlay-src-${editingOverlayId}`) as mapboxgl.ImageSource | undefined;
        if (source) {
          source.setCoordinates(currentCorners as [[number, number], [number, number], [number, number], [number, number]]);
        }

        // Sync all marker positions
        currentCorners.forEach(([lng2, lat2], j) => {
          if (j !== i && markersRef.current[j]) {
            markersRef.current[j].setLngLat([lng2, lat2]);
          }
        });

        // Sync rotation handle
        const tc = topCenter(currentCorners);
        if (rotationMarkerRef.current) {
          rotationMarkerRef.current.setLngLat([tc[0], tc[1]]);
        }
      });

      marker.on("dragend", () => {
        map.dragPan.enable();
        setEditCorners([...currentCorners]);
        autoSave(editingOverlayId!, currentCorners, editRotation);
      });

      markersRef.current.push(marker);
    });

    // ── Rotation handle ──
    const tc = topCenter(currentCorners);
    const rotEl = document.createElement("div");
    rotEl.style.cssText = `
      width: 32px; height: 32px; border-radius: 50%;
      background: #F59E0B; border: 3px solid white;
      cursor: grab; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: white; user-select: none; z-index: 11;
    `;
    rotEl.textContent = "↻";

    const rotMarker = new mapboxgl.Marker({ element: rotEl, draggable: true })
      .setLngLat([tc[0], tc[1]])
      .addTo(map);

    let rotStartAngle = 0;
    let rotBaseAngle = editRotation;

    // Store the base (unrotated) corners for rotation calculations
    const baseCorners = parseCoords(
      activeOverlays.find((o) => o.id === editingOverlayId)?.coordinates ?? "[]"
    );

    rotMarker.on("dragstart", () => {
      map.dragPan.disable();
      const c = centroid(currentCorners);
      const pos = rotMarker.getLngLat();
      rotStartAngle = Math.atan2(pos.lat - c[1], pos.lng - c[0]);
      rotBaseAngle = editRotation;
    });

    rotMarker.on("drag", () => {
      // Calculate the center point of the 4 coordinates
      const c = centroid(currentCorners);
      const pos = rotMarker.getLngLat();
      // Determine the angle of the drag
      const currentAngle = Math.atan2(pos.lat - c[1], pos.lng - c[0]);
      const deltaAngle = ((currentAngle - rotStartAngle) * 180) / Math.PI;
      const newRotation = rotBaseAngle + deltaAngle;

      // Apply a Rotation Matrix to all 4 corner points
      if (baseCorners) {
        const rotated = applyRotation(baseCorners, newRotation);
        rotated.forEach(([lng, lat], j) => {
          currentCorners[j] = [lng, lat];
          if (markersRef.current[j]) markersRef.current[j].setLngLat([lng, lat]);
        });

        // *** CRITICAL: Update the Mapbox image source so the image pivots with the handle ***
        const source = map.getSource(`overlay-src-${editingOverlayId}`) as mapboxgl.ImageSource | undefined;
        if (source) {
          source.setCoordinates(rotated as [[number, number], [number, number], [number, number], [number, number]]);
        }

        setEditRotation(newRotation);
      }
    });

    rotMarker.on("dragend", () => {
      map.dragPan.enable();
      setEditCorners([...currentCorners]);
      autoSave(editingOverlayId!, currentCorners, editRotation);
    });

    rotationMarkerRef.current = rotMarker;

    return () => {
      clearEditMarkers();
      if (map) {
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, mapLoaded, editingOverlayId]);

  // ── Sidebar handlers ───────────────────────────────────────────────────────

  const handleReset = async (ov: OverlayData) => {
    if (!confirm("Reset overlay to its original GPS-derived position?")) return;
    try {
      const resp = await fetch(`/api/projects/${projectId}/overlays/${ov.id}/reset`, {
        method: "POST",
        credentials: "include",
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success("Overlay reset to original GPS bounds");
      onOverlayUpdated?.();
    } catch (err: any) {
      toast.error("Reset failed: " + err.message);
    }
  };

  /**
   * DELETE OVERLAY — Priority #1 fix
   * 1. Sends DELETE /api/projects/:projectId/overlays/:overlayId
   * 2. On success: removes Mapbox source/layer from map
   * 3. Clears React state (edit mode, sidebar)
   * 4. Backend removes DB row + S3 file
   * 5. Calls onOverlayUpdated to refetch project data
   */
  const handleDelete = async (ov: OverlayData) => {
    if (!confirm(`Delete "${ov.label || "this overlay"}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      // 1. API call to delete from DB + S3
      const resp = await fetch(`/api/projects/${projectId}/overlays/${ov.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `HTTP ${resp.status}`);
      }

      // 2. Remove the overlay source and layer from the Mapbox map immediately
      removeOverlayFromMap(ov.id);

      // 3. Clear edit state if we were editing this overlay
      if (editingOverlayId === ov.id) {
        clearEditMarkers();
        setEditMode(false);
        setEditingOverlayId(null);
        setEditCorners(null);
        setEditRotation(0);
      }

      // 4. Clear local state for this overlay
      setOpacityMap((prev) => {
        const next = { ...prev };
        delete next[ov.id];
        return next;
      });
      setVisibilityMap((prev) => {
        const next = { ...prev };
        delete next[ov.id];
        return next;
      });

      // 5. Close sidebar
      setSidebarOpen(false);

      toast.success("Overlay deleted successfully");

      // 6. Refetch project data to remove overlay from parent state
      onOverlayUpdated?.();
    } catch (err: any) {
      console.error("[MapboxOverlay] Delete failed:", err);
      toast.error("Delete failed: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative rounded-lg overflow-hidden">
      {/* Mapbox map container */}
      <div ref={mapContainerRef} className="w-full h-[600px]" />

      {/* Edit mode toolbar */}
      {editMode && (
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
          >
            <Check className="h-3 w-3 mr-1" /> Finish
          </Button>
        </div>
      )}

      {/* Bottom-right overlay count badge */}
      {activeOverlays.length > 0 && (
        <div className="absolute bottom-3 right-3 z-[10] bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
          <span className="text-emerald-400 font-medium">{activeOverlays.length}</span> overlay
          {activeOverlays.length !== 1 ? "s" : ""}
          {editMode && <span className="text-amber-400 ml-1">• editing</span>}
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
            {/* Close / collapse button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute -left-10 top-4 bg-slate-900 p-2 rounded-l-md border-l border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={20} />
            </button>

            <div className="p-5 h-full overflow-y-auto flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-2">
                  <Layers className="text-blue-400" size={20} />
                  <h2 className="font-bold text-lg tracking-tight">Overlay Manager</h2>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                  <X size={16} />
                </button>
              </div>

              {/* Per-overlay controls */}
              {activeOverlays.map((ov) => {
                const opacity = opacityMap[ov.id] ?? 0.7;
                const visible = visibilityMap[ov.id] ?? true;
                const label = ov.label || `Plan ${ov.id}`;
                return (
                  <div key={ov.id} className="space-y-4">
                    {/* Overlay name + visibility toggle */}
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

                    {/* Opacity slider */}
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

              {/* Tools section */}
              {!isDemoProject && (
                <div className="pt-2 border-t border-slate-700 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tools</p>

                  {/* Edit Alignment */}
                  <button
                    onClick={() => {
                      if (editMode) {
                        handleCancelEdit();
                      } else if (activeOverlays[0]) {
                        handleStartEdit(activeOverlays[0]);
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      editMode ? "bg-blue-600 shadow-lg shadow-blue-900/40" : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    <Move size={18} />
                    <span className="text-sm font-semibold">{editMode ? "Stop Editing" : "Edit Alignment"}</span>
                  </button>

                  {/* Reset to Default */}
                  {activeOverlays[0] && (
                    <button
                      onClick={() => handleReset(activeOverlays[0])}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-amber-900/40 hover:text-amber-400 transition-all"
                    >
                      <RotateCcw size={18} />
                      <span className="text-sm font-semibold">Reset to Default</span>
                    </button>
                  )}

                  {/* Delete Overlay — Priority #1 */}
                  {activeOverlays[0] && (
                    <button
                      onClick={() => handleDelete(activeOverlays[0])}
                      disabled={isDeleting}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 hover:bg-red-900/40 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                      <span className="text-sm font-semibold">
                        {isDeleting ? "Deleting..." : "Delete Overlay"}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Edit mode tip */}
              {editMode && (
                <p className="text-xs text-slate-400 mt-auto">
                  Drag <span className="text-emerald-400">green corners</span> to resize — the image stretches live.{" "}
                  <span className="text-amber-400">↻ yellow handle</span> rotates all 4 corners via rotation matrix. Toggle{" "}
                  <span className="text-emerald-400">🔒 AR</span> to lock aspect ratio. Position auto-saves on drop.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
