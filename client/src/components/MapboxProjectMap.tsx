/**
 * MapboxProjectMap — Unified Mapbox GL JS map for the entire project
 *
 * Combines:
 *   1. GPS Pins (numbered markers with photo/video distinction)
 *   2. Flight Path (GeoJSON LineString layer) with toggle
 *   3. Overlay Editor (image source with 4-corner drag, rotation, 2-point snap)
 *   4. Enhanced Overlay Manager sidebar:
 *      - Overlay rename (inline edit)
 *      - Opacity slider (persisted)
 *      - Visibility toggle
 *      - Hide/Show Flight Path
 *      - Measurement tool (distance + area)
 *      - Lock overlay position
 *      - Fit to overlay bounds
 *      - Fullscreen map mode
 *      - Edit Alignment / 2-Point Snap / Reset / Delete
 */

import { authFetch } from "@/lib/authFetch";
import { apiUrl } from "@/lib/apiBase";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Check,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Lock,
  Maximize,
  Minimize,
  Move,
  Pencil,
  Route,
  RotateCcw,
  Ruler,
  Save,
  Target,
  Trash2,
  Unlock,
  X,
  MapPin,
  Navigation,
  Calculator,
  Upload,
  FileSearch,
  AlertCircle,
  Radar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PdfToOverlayConverter } from "./PdfToOverlayConverter";
import type { Media } from "../../../drizzle/schema";
import { SPCS_STATES } from "@shared/spcsZones";
import turfDistance from "@turf/distance";
import turfArea from "@turf/area";
import { polygon as turfPolygon, point as turfPoint } from "@turf/helpers";

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
  getMap: () => mapboxgl.Map | null;
  isMapLoaded: () => boolean;
  startEditingOverlay: (overlay: OverlayData) => void;
  openSidebar: () => void;
}

export interface ConvertedCoordinatePoint {
  latitude: number;
  longitude: number;
  identifier?: string;
  index: number;
  easting?: number;
  northing?: number;
  elevation?: number | null;
  description?: string;
}

interface ConversionResult {
  easting?: number;
  northing?: number;
  latitude?: number;
  longitude?: number;
  systemKey?: string;
  combinedScaleFactor?: number;
  success: boolean;
  error?: string;
  identifier?: string;
}

interface BatchResult {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  results: Array<ConversionResult & { index: number; identifier?: string }>;
  errors: Array<{ row: number; error: string }>;
  warnings?: string[];
}

interface MapboxProjectMapProps {
  projectId: number;
  projectName: string;
  flightId?: number;
  isDemoProject?: boolean;
  overlays?: OverlayData[];
  onOverlayUpdated?: () => void;
  onOverlayButtonClick?: () => void;
  heightClass?: string;
  showFullScreenLink?: boolean;
  /** Raw "lat, lng" string from project.location — used to suppress No GPS overlay and place primary marker */
  projectLocation?: string | null;
  /** Called when the sidebar is opened — used by parent to dismiss onboarding guides */
  onSidebarOpen?: () => void;
  /** When true, disables manual sidebar toggle — tour automation retains full control */
  isTourActive?: boolean;
  /** When true, hides the 'Project Map' card header (used in full-screen ProjectMap page) */
  hideHeader?: boolean;
  /** When true, user is unauthenticated/demo — lock Add Map Overlay and Show Flight Path with premium popups */
  isGuestUser?: boolean;
  /** When false, survey control points are hidden from the map (default: true) */
  showSurveyPoints?: boolean;
  /** Called whenever the converterPoints array changes — used by parent to display Smart Survey tab */
  onConverterPointsChange?: (points: ConvertedCoordinatePoint[]) => void;
  /** Called by Single/Batch imports to APPEND new points to the parent's surveyPoints (does not replace) */
  onAppendSurveyPoints?: (points: ConvertedCoordinatePoint[]) => void;
  /** Pre-loaded survey points from DB — seeds converterPoints on mount so markers appear immediately */
  initialSurveyPoints?: ConvertedCoordinatePoint[];
  /** Pre-fetched media array — when provided, skips the internal tRPC media fetch */
  initialMedia?: Array<{
    id: number;
    filename: string;
    url: string;
    thumbnailUrl?: string | null;
    mediaType: string;
    latitude: number | string;
    longitude: number | string;
    altitude?: number | string | null;
    capturedAt?: string | null;
  }>;
}

// ── Corner labels & colors ──────────────────────────────────────────────────
const CORNER_LABELS = ["NW", "NE", "SE", "SW"];
const CORNER_COLORS = ["#10B981", "#10B981", "#10B981", "#10B981"];
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-v9";

// ── Measurement helpers ─────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`;
  if (meters < 1000) return `${meters.toFixed(1)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDistanceFeet(meters: number): string {
  const feet = meters * 3.28084;
  if (feet < 5280) return `${feet.toFixed(1)} ft`;
  return `${(feet / 5280).toFixed(2)} mi`;
}

function formatArea(sqMeters: number): string {
  if (sqMeters < 10000) return `${sqMeters.toFixed(1)} m²`;
  const hectares = sqMeters / 10000;
  if (hectares < 100) return `${hectares.toFixed(2)} ha`;
  return `${(sqMeters / 1000000).toFixed(3)} km²`;
}

function formatAreaFeet(sqMeters: number): string {
  const sqFeet = sqMeters * 10.7639;
  if (sqFeet < 43560) return `${sqFeet.toFixed(0)} ft²`;
  return `${(sqFeet / 43560).toFixed(2)} acres`;
}

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
      onOverlayButtonClick,
      heightClass = "h-[600px]",
      showFullScreenLink = true,
      projectLocation,
      initialMedia,
      onSidebarOpen,
      isGuestUser = false,
      hideHeader = false,
      isTourActive = false,
      showSurveyPoints = true,
      onConverterPointsChange,
      initialSurveyPoints,
      onAppendSurveyPoints,
    } = props;

    // ── Refs ──────────────────────────────────────────────────────────────────
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapWrapperRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const gpsMarkersRef = useRef<mapboxgl.Marker[]>([]); // Kept for compatibility, now unused with GeoJSON layer
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const cornerMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const rotationMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const snapMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const measureMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const converterFileInputRef = useRef<HTMLInputElement | null>(null);
    const converterMarkersRef = useRef<mapboxgl.Marker[]>([]); // DOM markers for converted survey points
    const primaryMarkerRef = useRef<mapboxgl.Marker | null>(null); // Primary project location marker
    // Tracks whether markers have been placed for the current sortedMedia set
    const markersRenderedForRef = useRef<string>("");

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

    // ── NEW: Enhanced overlay controls state ──
    const [flightPathVisible, setFlightPathVisible] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [overlayLocked, setOverlayLocked] = useState<Record<number, boolean>>({});
    const [renamingOverlayId, setRenamingOverlayId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState("");

    // Measurement state
    const [measureMode, setMeasureMode] = useState(false);
    const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
    const [measureResult, setMeasureResult] = useState<{ distance: number; area: number } | null>(null);

    // PDF Converter state
    const [showPdfConverter, setShowPdfConverter] = useState(false);

    // Coordinate Converter state
    const [coordinateConverterExpanded, setCoordinateConverterExpanded] = useState(false);
    const [coordinateConverterTab, setCoordinateConverterTab] = useState<"single" | "batch" | "pdf">("single");
    const [singleEasting, setSingleEasting] = useState("");
    const [singleNorthing, setSingleNorthing] = useState("");
    const [singlePointId, setSinglePointId] = useState("");
    // Single tab — two-step State → Zone
    const [singleCrsState, setSingleCrsState] = useState("TX");
    const [singleCrsZone, setSingleCrsZone] = useState("TX_NORTH_CENTRAL");
    const singleCRS = singleCrsZone; // alias for mutation call-sites
    const singleCrsZones = useMemo(() => SPCS_STATES.find(s => s.abbr === singleCrsState)?.zones ?? [], [singleCrsState]);
    const [singleCSF, setSingleCSF] = useState("1.0");
    const [singleResult, setSingleResult] = useState<ConversionResult | null>(null);
    const [batchFile, setBatchFile] = useState<File | null>(null);
    // Shared (Batch + PDF) — two-step State → Zone
    const [sharedCrsState, setSharedCrsState] = useState("TX");
    const [sharedCrsZone, setSharedCrsZone] = useState("TX_NORTH_CENTRAL");
    const sharedCRS = sharedCrsZone; // alias for mutation call-sites
    const sharedCrsZones = useMemo(() => SPCS_STATES.find(s => s.abbr === sharedCrsState)?.zones ?? [], [sharedCrsState]);
    const [sharedCSF, setSharedCSF] = useState("1.0");
    // Aliases so existing mutation call-sites keep working without changes
    const batchCRS = sharedCRS;
    const batchCSF = sharedCSF;
    const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
    const [batchLoading, setBatchLoading] = useState(false);
     const [converterPoints, setConverterPoints] = useState<ConvertedCoordinatePoint[]>(() => initialSurveyPoints ?? []);
    // Notify parent whenever converterPoints changes (for Smart Survey tab)
    useEffect(() => { onConverterPointsChange?.(converterPoints); }, [converterPoints, onConverterPointsChange]);
    // Sync initialSurveyPoints into converterPoints when they arrive from DB (after async project load)
    useEffect(() => {
      if (initialSurveyPoints && initialSurveyPoints.length > 0) {
        setConverterPoints(prev => {
          // Only seed if converterPoints is still empty (don't overwrite user edits)
          if (prev.length === 0) return initialSurveyPoints;
          return prev;
        });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSurveyPoints?.length]);
    // ── ArcGIS Map Layers auto-detect state ─────────────────────────────────────
    const [arcgisLayerData, setArcgisLayerData] = useState<Array<{
      sourceId: string;
      label: string;
      color: string;
      type: 'fill' | 'line';
      featureCount: number;
      visible: boolean;
      error?: string;
    }>>([]);
    const [arcgisAutoRefresh, setArcgisAutoRefresh] = useState(() => {
      try {
        const stored = localStorage.getItem('mapit_arcgis_autorefresh');
        // Default ON if no preference has been saved yet
        return stored === null ? true : stored === 'true';
      } catch { return true; }
    });
    const arcgisAutoRefreshRef = useRef(false);
    const arcgisDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref always holds the latest arcgisLayerData so callbacks never have stale closures
    const arcgisLayerDataRef = useRef<typeof arcgisLayerData>([]);
    const arcgisQueryMutation = trpc.arcgis.queryAllByBbox.useMutation();

    // PDF Extract state
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const pdfCRS = sharedCRS;
    const pdfCSF = sharedCSF;
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfReviewPoints, setPdfReviewPoints] = useState<Array<{
      pointId: string;
      northing: number;
      easting: number;
      elevation: number | null;
      description: string;
      latitude: number | null;
      longitude: number | null;
      conversionSuccess: boolean;
      conversionError: string | null;
    }> | null>(null);
    const pdfFileInputRef = useRef<HTMLInputElement | null>(null);

    // ── Selected overlay for alignment tools ────────────────────────────────
    const [selectedOverlayId, setSelectedOverlayId] = useState<number | null>(null);

    const updateOverlayOpacity = trpc.project.updateOverlayOpacity.useMutation();
    const renameOverlayMutation = trpc.project.renameOverlay.useMutation();
    const convertSingleMutation = trpc.coordinateConverter.convertSingle.useMutation();
    const parseAndConvertMutation = trpc.coordinateConverterUpload.parseAndConvert.useMutation();
    const parsePDFMutation = trpc.coordinateConverterUpload.parsePDF.useMutation();
    const availableSystemsQuery = trpc.coordinateConverter.getAvailableSystems.useQuery();

    // ── Fetch media (skipped when initialMedia is provided) ─────────────────
    const { data: mediaList, isPending: mediaIsPending } = isDemoProject
      ? trpc.media.listDemo.useQuery({ projectId, flightId }, { enabled: !initialMedia, staleTime: Infinity, refetchOnWindowFocus: false })
      : trpc.media.list.useQuery({ projectId, flightId }, { enabled: !initialMedia, staleTime: Infinity, refetchOnWindowFocus: false });
    // isLoading: only true on the very first fetch — never during mutations or refetches.
    // Using isPending (not mediaList===undefined) prevents the skeleton from covering the map
    // when a batch mutation causes a transient cache invalidation.
    const isLoading = !initialMedia && mediaIsPending;
    const mediaWithGPS = useMemo(() => {
      if (initialMedia && initialMedia.length > 0) {
        return initialMedia.filter((m) => m.latitude && m.longitude);
      }
      return mediaList?.filter((m) => m.latitude && m.longitude) || [];
    }, [initialMedia, mediaList]);

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
      return [-96.797, 32.7767];
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

    // ── Expose panToMedia + overlay editing to parent ─────────────────────
    // Ref so useImperativeHandle can call handleStartEdit without stale closure
    const handleStartEditRef = useRef<(ov: OverlayData) => void>(() => {});
    useImperativeHandle(ref, () => ({
      panToMedia: (latitude: number, longitude: number, mediaId?: string) => {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo({ center: [longitude, latitude], zoom: 20, duration: 800 });
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
      startEditingOverlay: (overlay: OverlayData) => {
        setSidebarOpen(true);
        setSelectedOverlayId(overlay.id);
        setTimeout(() => handleStartEditRef.current(overlay), 120);
      },
      openSidebar: () => setSidebarOpen(true),
    }), [mapLoaded]);

    // ── Initialize Mapbox map ─────────────────────────────────────────
    // NOTE: Map init is intentionally NOT dependent on isLoading or sortedMedia.
    // The map initializes once; the data watcher below handles marker placement
    // whenever sortedMedia arrives (before or after mapLoaded becomes true).
    useEffect(() => {
      // Skip if already initialized
      if (mapRef.current) return;

      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!token) {
        console.error("[MapboxProjectMap] VITE_MAPBOX_TOKEN is not set");
        return;
      }
      mapboxgl.accessToken = token;

      let animationFrameId: number;

      const initializeMap = () => {
        const container = mapContainerRef.current;
        if (!container) {
          animationFrameId = requestAnimationFrame(initializeMap);
          return;
        }

        // POLLING CHECK: Ensure container has physical pixels before creating WebGL context
        if (container.clientHeight === 0) {

          animationFrameId = requestAnimationFrame(initializeMap);
          return;
        }



        const map = new mapboxgl.Map({
          container,
          style: SATELLITE_STYLE,
          center: [-96.797, 32.7767], // Default center; data watcher will flyTo markers
          zoom: 12,
          pitchWithRotate: false,
          trackResize: true,
        });

        map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

        // Force one final resize after the first frame to ensure canvas fills container
        map.on("load", () => {
          mapRef.current = map;
          setMapLoaded(true);
          requestAnimationFrame(() => map.resize());
        });

        const handleResize = () => map.resize();
        window.addEventListener("resize", handleResize);
        map.on("remove", () => window.removeEventListener("resize", handleResize));
      };

      initializeMap();

      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        setMapLoaded(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ← Run once on mount only

    // ── Data Watcher: Add GPS markers + flight path + survey points ─────────────────────────
    // This effect fires whenever sortedMedia, converterPoints, OR mapLoaded changes.
    // Survey points are merged into the same GeoJSON source as photo pins,
    // using an orange pin image to distinguish them visually.
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || (sortedMedia.length === 0 && converterPoints.length === 0)) return;

      // Build a stable key from sorted media IDs + survey point identifiers
      const surveyKey = converterPoints.map((p) => p.identifier || p.index).join("|");
      const newKey = sortedMedia.map((m) => m.id).join(",") + "||" + surveyKey;
      if (markersRenderedForRef.current === newKey) {
        // Data hasn't changed — just refresh the GeoJSON source data in place
        const allFeatures = [
          ...sortedMedia.map((media) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [parseFloat(media.longitude!), parseFloat(media.latitude!)] },
            properties: {
              id: media.id, filename: media.filename,
              latitude: media.latitude, longitude: media.longitude,
              altitude: media.altitude, mediaType: media.mediaType,
              thumbnailUrl: media.thumbnailUrl || media.url, url: media.url,
              isSurveyPoint: false,
            },
          })),
          ...(showSurveyPoints ? converterPoints
            .filter((pt) => pt.longitude && pt.latitude && !isNaN(pt.longitude) && !isNaN(pt.latitude))
            .map((pt) => ({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [pt.longitude, pt.latitude] },
              properties: {
              id: -(pt.index + 1), filename: pt.identifier || `Survey Point ${pt.index + 1}`,
              latitude: pt.latitude, longitude: pt.longitude,
              altitude: null, mediaType: 'survey',
              thumbnailUrl: null, url: null,
              isSurveyPoint: true,
              easting: pt.easting ?? null, northing: pt.northing ?? null,
              pointId: pt.identifier ?? null,
              description: pt.description ?? null,
            },
          })) : []),
        ];
        if (map.getSource('media-source')) {
          (map.getSource('media-source') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: allFeatures });
        }
        return;
      }
      markersRenderedForRef.current = newKey;

      // Clear old flight path, media pins, and survey labels
      if (map.getLayer("flight-path")) map.removeLayer("flight-path");
      if (map.getSource("flight-path-src")) map.removeSource("flight-path-src");
      if (map.getLayer("survey-labels")) map.removeLayer("survey-labels");
      if (map.getLayer("media-pins")) map.removeLayer("media-pins");
      if (map.getSource("media-source")) map.removeSource("media-source");

      // ── Flight Path (GeoJSON LineString) — photo GPS only ──
      if (sortedMedia.length > 0) {
        const flightPathCoords = sortedMedia.map((m) => [
          parseFloat(m.longitude!),
          parseFloat(m.latitude!),
        ]);
        map.addSource("flight-path-src", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: flightPathCoords } },
        });
        map.addLayer({
          id: "flight-path", type: "line", source: "flight-path-src",
          paint: { "line-color": "#10b981", "line-width": 3, "line-opacity": flightPathVisible ? 0.8 : 0 },
          layout: { "line-join": "round", "line-cap": "round" },
        });
      }

      // ── Register pin images: green for photos, orange for survey points ──
      // Returns a Promise that resolves once the image is registered in the map sprite.
      // This prevents the race condition where addLayer runs before the icon images
      // are ready, causing Mapbox to silently drop all pins.
      const registerPinImage = (id: string, color: string): Promise<void> => {
        if (map.hasImage(id)) return Promise.resolve();
        return new Promise((resolve) => {
          const svg = [
            '<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">',
            `<path d="M16 42C16 42 32 26.2426 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 26.2426 16 42 16 42Z" fill="${color}"/>`,
            '<circle cx="16" cy="16" r="6" fill="white"/>',
            '</svg>',
          ].join('');
          const img = new Image(32, 42);
          img.onload = () => { if (!map.hasImage(id)) map.addImage(id, img); resolve(); };
          img.onerror = () => resolve(); // don't block on error
          img.src = 'data:image/svg+xml;base64,' + btoa(svg);
        });
      };

      // Wait for both pin images to load before adding source + layers
      Promise.all([
        registerPinImage('skyvee-pin', '#50C878'),   // green — photo GPS
        registerPinImage('survey-pin', '#f97316'),   // orange — survey points
      ]).then(() => {

      // ── Merge photo GPS + survey points into one GeoJSON source ──
      const allFeatures = [
        ...sortedMedia.map((media) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [parseFloat(media.longitude!), parseFloat(media.latitude!)] },
          properties: {
            id: media.id, filename: media.filename,
            latitude: media.latitude, longitude: media.longitude,
            altitude: media.altitude, mediaType: media.mediaType,
            thumbnailUrl: media.thumbnailUrl || media.url, url: media.url,
            isSurveyPoint: false,
          },
        })),
        ...(showSurveyPoints ? converterPoints
          .filter((pt) => pt.longitude && pt.latitude && !isNaN(pt.longitude) && !isNaN(pt.latitude))
          .map((pt) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [pt.longitude, pt.latitude] },
            properties: {
              id: -(pt.index + 1), filename: pt.identifier || `Survey Point ${pt.index + 1}`,
              latitude: pt.latitude, longitude: pt.longitude,
              altitude: null, mediaType: 'survey',
              thumbnailUrl: null, url: null,
              isSurveyPoint: true,
              easting: pt.easting ?? null, northing: pt.northing ?? null,
              pointId: pt.identifier ?? null,
              description: pt.description ?? null,
            },
          })) : []),
      ];

      map.addSource('media-source', { type: 'geojson', data: { type: 'FeatureCollection', features: allFeatures } });
      map.addLayer({
        id: 'media-pins', type: 'symbol', source: 'media-source',
        layout: {
          // Switch pin image based on isSurveyPoint property
          'icon-image': ['case', ['==', ['get', 'isSurveyPoint'], true], 'survey-pin', 'skyvee-pin'],
          'icon-size': 0.45,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
        },
      });

      // ── Survey point labels — identifier text above each orange pin ──
      // ── Click Handler — photo popup vs survey popup ──
      const handleMediaPinClick = (e: mapboxgl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures({ layers: ['media-pins'] });
        if (!features || features.length === 0) return;
        let feature = features[0];
        if (features.length > 1) {
          const clickLngLat = e.lngLat;
          let minDistance = Infinity;
          for (const f of features) {
            const coords = (f.geometry as any).coordinates as [number, number];
            const dx = coords[0] - clickLngLat.lng;
            const dy = coords[1] - clickLngLat.lat;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) { minDistance = dist; feature = f; }
          }
        }
        const props = feature.properties as any;

        if (props.isSurveyPoint) {
          // Survey point popup — show Point ID + coordinates + easting/northing + description
          const pointId = props.pointId || props.filename || `${Math.abs(props.id)}`;
          const popupHtml = `
            <div style="max-width:240px;font-family:system-ui,sans-serif">
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px;padding-bottom:7px;border-bottom:1px solid #334155">
                <div style="width:11px;height:11px;border-radius:50%;background:#f97316;flex-shrink:0"></div>
                <div style="font-size:13px;font-weight:700;color:#fff">Survey Control Point</div>
              </div>
              <div style="font-size:13px;font-weight:700;color:#fb923c;margin-bottom:8px">Point ID: ${pointId}</div>
              <div style="font-size:11px;color:#94a3b8;margin-bottom:3px">Lat: ${parseFloat(props.latitude).toFixed(7)}</div>
              <div style="font-size:11px;color:#94a3b8;margin-bottom:3px">Lng: ${parseFloat(props.longitude).toFixed(7)}</div>
              ${props.easting ? `<div style="font-size:11px;color:#fb923c;margin-top:5px">Easting: ${parseFloat(props.easting).toFixed(3)}</div>` : ''}
              ${props.northing ? `<div style="font-size:11px;color:#fb923c">Northing: ${parseFloat(props.northing).toFixed(3)}</div>` : ''}
              ${props.description ? `<div style="font-size:11px;color:#cbd5e1;margin-top:8px;padding-top:8px;border-top:1px solid #334155"><span style="font-weight:600">Description:</span> ${props.description}</div>` : ''}
            </div>
          `;
          new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '260px', className: 'mapbox-media-popup' })
            .setLngLat((feature.geometry as any).coordinates as [number, number])
            .setHTML(popupHtml)
            .addTo(map);
          return;
        }

        // Photo GPS popup
        setSelectedMedia({
          id: props.id, filename: props.filename,
          latitude: parseFloat(props.latitude), longitude: parseFloat(props.longitude),
          altitude: props.altitude ? parseFloat(props.altitude) : null,
          mediaType: props.mediaType, thumbnailUrl: props.thumbnailUrl, url: props.url,
        } as any);
        const thumbnailUrl = props.thumbnailUrl;
        const fullUrl = props.url || thumbnailUrl;
        const popupHtml = `
          <div style="max-width:220px;font-family:system-ui,sans-serif">
            <img src="${thumbnailUrl}" data-fullurl="${fullUrl}" data-filename="${props.filename}"
              data-lat="${props.latitude}" data-lng="${props.longitude}"
              style="width:100%;border-radius:6px;margin-bottom:8px;cursor:zoom-in"
              title="Click to enlarge" onerror="this.style.display='none'" />
            <div style="font-size:10px;color:#64748b;margin-bottom:6px;text-align:center">Click image to enlarge</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:#fff">${props.filename}</div>
            <div style="font-size:11px;color:#94a3b8">${parseFloat(props.latitude).toFixed(6)}, ${parseFloat(props.longitude).toFixed(6)}</div>
            ${props.altitude ? `<div style="font-size:11px;color:#94a3b8">Alt: ${parseFloat(props.altitude).toFixed(1)}m</div>` : ''}
          </div>
        `;
        new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '260px', className: 'mapbox-media-popup' })
          .setLngLat((feature.geometry as any).coordinates as [number, number])
          .setHTML(popupHtml)
          .addTo(map);
      };

      const handleMediaPinMouseEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
      const handleMediaPinMouseLeave = () => { map.getCanvas().style.cursor = ''; };
      map.off('click', 'media-pins', handleMediaPinClick);
      map.off('mouseenter', 'media-pins', handleMediaPinMouseEnter);
      map.off('mouseleave', 'media-pins', handleMediaPinMouseLeave);
      map.on('click', 'media-pins', handleMediaPinClick);
      map.on('mouseenter', 'media-pins', handleMediaPinMouseEnter);
      map.on('mouseleave', 'media-pins', handleMediaPinMouseLeave);

      // Fit bounds to all points (photo GPS + survey)
      const allPoints = [
        ...sortedMedia.map((m) => [parseFloat(m.longitude!), parseFloat(m.latitude!)] as [number, number]),
        ...(showSurveyPoints ? converterPoints
          .filter((pt) => pt.longitude && pt.latitude && !isNaN(pt.longitude) && !isNaN(pt.latitude))
          .map((pt) => [pt.longitude, pt.latitude] as [number, number]) : []),
      ];
      if (allPoints.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        allPoints.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
      } else if (allPoints.length === 1) {
        // Single point: fly directly to it at a close zoom
        map.flyTo({ center: allPoints[0], zoom: 18, pitch: 45, bearing: 0, duration: 2500, essential: true });
      }
      }); // end Promise.all — closes the async pin-image wait
    }, [sortedMedia, converterPoints, mapLoaded, setSelectedMedia, flightPathVisible, showSurveyPoints]);

    // ── Primary Project Marker — shown when projectLocation exists but no media GPS yet ──
    // Uses a ref to track the Marker instance so it can be properly removed
    // (calling .remove() on the DOM element alone leaves the Mapbox Marker on the map).
    useEffect(() => {
      const map = mapRef.current;

      // When media GPS arrives, remove the primary marker and bail
      if (mediaWithGPS.length > 0) {
        if (primaryMarkerRef.current) {
          primaryMarkerRef.current.remove();
          primaryMarkerRef.current = null;
        }
        return;
      }

      if (!map || !mapLoaded || !projectLocation) return;

      // Parse "lat, lng" string
      const parts = projectLocation.split(',').map((s) => parseFloat(s.trim()));
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
      const [lat, lng] = parts;

      // Remove any existing primary marker before creating a new one
      if (primaryMarkerRef.current) {
        primaryMarkerRef.current.remove();
        primaryMarkerRef.current = null;
      }

      // Create bold white pin element
      const el = document.createElement('div');
      el.id = 'primary-project-marker';
      el.style.cssText = [
        'width:36px', 'height:48px', 'cursor:default',
        'background:none', 'border:none', 'padding:0',
      ].join(';');
      el.innerHTML = `<svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">`
        + `<path d="M18 48C18 48 36 30.2426 36 18C36 8.05888 27.9411 0 18 0C8.05888 0 0 7.16344 0 18C0 30.2426 18 48 18 48Z" fill="white"/>`
        + `<circle cx="18" cy="18" r="7" fill="#10b981"/>`
        + `</svg>`;

      primaryMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);
    }, [mapLoaded, projectLocation, mediaWithGPS.length]);

    // ── ArcGIS layer management ─────────────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      for (const layer of arcgisLayerData) {
        const srcId = `arcgis-src-${layer.sourceId}`;
        const layerId = `arcgis-layer-${layer.sourceId}`;
        // Update visibility if layer exists
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', layer.visible ? 'visible' : 'none');
        }
      }
    }, [arcgisLayerData, mapLoaded]);

    // ── ArcGIS auto-refresh on map move/zoom ────────────────────────────────
    const runArcgisQuery = useCallback(async (showToast = false) => {
      const map = mapRef.current;
      if (!map || isGuestUser || isDemoProject) return;
      const bounds = map.getBounds();
      if (!bounds) return;
      try {
        const results = await arcgisQueryMutation.mutateAsync({
          minLng: bounds.getWest(),
          minLat: bounds.getSouth(),
          maxLng: bounds.getEast(),
          maxLat: bounds.getNorth(),
        });
        // Remove old layers using ref so we always have fresh data
        for (const layer of arcgisLayerDataRef.current) {
          const srcId = `arcgis-src-${layer.sourceId}`;
          const layerId = `arcgis-layer-${layer.sourceId}`;
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(srcId)) map.removeSource(srcId);
        }
        const newLayers: typeof arcgisLayerData = [];
        for (const result of results) {
          const resultError = 'error' in result ? result.error : undefined;
          if (resultError || !result.geojson) { continue; }
          const srcId = `arcgis-src-${result.sourceId}`;
          const layerId = `arcgis-layer-${result.sourceId}`;
          try {
            map.addSource(srcId, { type: 'geojson', data: result.geojson as any });
            if (result.type === 'fill') {
              const isFema = result.sourceId === 'fema_flood_zones';
              const fillColor = isFema
                ? ['match', ['get', 'FLD_ZONE'],
                    'AE', '#1d4ed8', 'A', '#3b82f6',
                    'AO', '#60a5fa', 'AH', '#60a5fa',
                    'VE', '#7c3aed', 'V', '#8b5cf6',
                    'X', '#fbbf24', '#94a3b8']
                : result.color;
              const fillOpacity = isFema ? 0.35 : 0.25;
              map.addLayer({ id: layerId, type: 'fill', source: srcId, paint: { 'fill-color': fillColor as any, 'fill-opacity': fillOpacity, 'fill-outline-color': isFema ? '#1e3a8a' : result.color } });
            } else {
              map.addLayer({ id: layerId, type: 'line', source: srcId, paint: { 'line-color': result.color, 'line-width': 1.5 } });
            }
            map.on('click', layerId, (e) => {
              const feature = e.features?.[0];
              if (!feature) return;
              const props = feature.properties ?? {};
              const rows = Object.entries(props)
                .filter(([k]) => !k.startsWith('_'))
                .map(([k, v]) => `<div style="display:flex;gap:8px;border-bottom:1px solid #334155;padding:3px 0"><span style="color:#94a3b8;min-width:80px;font-size:10px">${k}</span><span style="color:#f1f5f9;font-size:10px;word-break:break-all">${v}</span></div>`)
                .join('');
              new mapboxgl.Popup({ offset: 10, maxWidth: '260px' })
                .setLngLat(e.lngLat)
                .setHTML(`<div style="background:#1e293b;border-radius:8px;padding:10px;color:#f1f5f9"><div style="font-weight:700;margin-bottom:6px;color:${result.color};font-size:12px">${result.label}</div>${rows}</div>`)
                .addTo(map);
            });
            map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
            newLayers.push({ sourceId: result.sourceId, label: result.label, color: result.color, type: result.type as 'fill' | 'line', featureCount: result.featureCount, visible: true });
          } catch (err) {
            console.error('[ArcGIS] Failed to add layer', result.sourceId, err);
          }
        }
        setArcgisLayerData(newLayers);
        if (showToast) {
          const total = newLayers.reduce((s, l) => s + l.featureCount, 0);
          if (total > 0) toast.success(`Loaded ${total} features from ${newLayers.filter(l => l.featureCount > 0).length} source(s)`);
          else toast.info('No features found in this map area');
        }
      } catch (err) {
        console.error('[ArcGIS] Auto-refresh query failed', err);
        if (showToast) toast.error('ArcGIS query failed');
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGuestUser, isDemoProject]);

    // Keep refs in sync with state
    useEffect(() => {
      arcgisAutoRefreshRef.current = arcgisAutoRefresh;
      try { localStorage.setItem('mapit_arcgis_autorefresh', String(arcgisAutoRefresh)); } catch {}
    }, [arcgisAutoRefresh]);
    useEffect(() => { arcgisLayerDataRef.current = arcgisLayerData; }, [arcgisLayerData]);

    // Attach / detach moveend listener based on auto-refresh toggle
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      const handler = () => {
        if (!arcgisAutoRefreshRef.current) return;
        if (arcgisDebounceRef.current) clearTimeout(arcgisDebounceRef.current);
        arcgisDebounceRef.current = setTimeout(() => { runArcgisQuery(); }, 800);
      };
      map.on('moveend', handler);
      return () => { map.off('moveend', handler); };
    }, [mapLoaded, runArcgisQuery]);

    // ── Toggle flight path visibility ───────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      if (map.getLayer("flight-path")) {
        map.setPaintProperty("flight-path", "line-opacity", flightPathVisible ? 0.8 : 0);
      }
    }, [flightPathVisible, mapLoaded]);

    // ── Render overlay image sources ────────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      for (const ov of activeOverlays) {
        const srcId = `overlay-src-${ov.id}`;
        const layerId = `overlay-layer-${ov.id}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      }

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
        const resp = await authFetch(apiUrl(`/api/projects/${projectId}/overlays/${ovId}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
      if (overlayLocked[ov.id]) {
        toast.error("Overlay is locked. Unlock it first.");
        return;
      }
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
    }, [overlayLocked]);
    // Keep the ref in sync so useImperativeHandle can call it without stale closure
    handleStartEditRef.current = handleStartEdit;

    const handleCancelEdit = useCallback(() => {
      clearEditMarkers();
      setEditMode(false);
      setEditingOverlayId(null);
      setEditCorners(null);
      setEditRotation(0);
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

          const source = map.getSource(`overlay-src-${editingOverlayId}`) as mapboxgl.ImageSource | undefined;
          if (source) {
            source.setCoordinates(currentCorners as [[number, number], [number, number], [number, number], [number, number]]);
          }

          cornerMarkersRef.current.forEach((m, j) => {
            if (j !== i) m.setLngLat(currentCorners[j] as [number, number]);
          });

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
      if (overlayLocked[ov.id]) {
        toast.error("Overlay is locked. Unlock it first.");
        return;
      }
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
    }, [overlayLocked]);

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

      cornerMarkersRef.current.forEach((m, i) => m.setLngLat(transformed[i]));
      const tc = topCenter(transformed);
      if (rotationMarkerRef.current) rotationMarkerRef.current.setLngLat(tc);

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
      if (overlayLocked[ov.id]) {
        toast.error("Overlay is locked. Unlock it first.");
        return;
      }
      if (!confirm("Reset overlay to its original GPS-derived position?")) return;
      try {
        const resp = await authFetch(apiUrl(`/api/projects/${projectId}/overlays/${ov.id}/reset`), {
          method: "POST",
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
        const resp = await authFetch(apiUrl(`/api/projects/${projectId}/overlays/${ov.id}`), {
          method: "DELETE",
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
        // Clear selection if the deleted overlay was selected
        if (selectedOverlayId === ov.id) setSelectedOverlayId(null);
        setSidebarOpen(false);
        toast.success("Overlay deleted successfully");
        onOverlayUpdated?.();
      } catch (err: any) {
        toast.error("Delete failed: " + err.message);
      } finally {
        setIsDeleting(false);
      }
    };

    // ── Rename overlay ──────────────────────────────────────────────────────
    const handleRename = useCallback((ov: OverlayData) => {
      setRenamingOverlayId(ov.id);
      setRenameValue(ov.label || `Plan ${ov.id}`);
    }, []);

    const handleRenameSubmit = useCallback((ovId: number) => {
      if (!renameValue.trim()) {
        toast.error("Name cannot be empty");
        return;
      }
      renameOverlayMutation.mutate(
        { overlayId: ovId, projectId, label: renameValue.trim() },
        {
          onSuccess: () => {
            toast.success("Overlay renamed");
            setRenamingOverlayId(null);
            onOverlayUpdated?.();
          },
          onError: (err) => toast.error("Rename failed: " + err.message),
        }
      );
    }, [renameValue, projectId, renameOverlayMutation, onOverlayUpdated]);

    // ── Fit to overlay bounds ───────────────────────────────────────────────
    const handleFitToOverlay = useCallback((ov: OverlayData) => {
      const map = mapRef.current;
      if (!map) return;
      const coords = parseCoords(ov.coordinates);
      if (!coords || coords.length < 4) return;
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 19, duration: 800 });
    }, []);

    // ── Toggle overlay lock ─────────────────────────────────────────────────
    const handleToggleLock = useCallback((ovId: number) => {
      setOverlayLocked((prev) => ({ ...prev, [ovId]: !prev[ovId] }));
      toast.info(overlayLocked[ovId] ? "Overlay unlocked" : "Overlay locked — alignment tools disabled");
    }, [overlayLocked]);

    // ── Fullscreen toggle ───────────────────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
      // Use CSS pseudo-fullscreen (works inside iframes where requestFullscreen is blocked)
      setIsFullscreen((prev) => {
        setTimeout(() => {
          mapRef.current?.resize();
        }, 150);
        return !prev;
      });
    }, []);

    // ── Measurement tool ────────────────────────────────────────────────────
    const clearMeasureMarkers = useCallback(() => {
      measureMarkersRef.current.forEach((m) => m.remove());
      measureMarkersRef.current = [];
      const map = mapRef.current;
      if (map) {
        if (map.getLayer("measure-line")) map.removeLayer("measure-line");
        if (map.getSource("measure-line-src")) map.removeSource("measure-line-src");
        if (map.getLayer("measure-fill")) map.removeLayer("measure-fill");
        if (map.getSource("measure-fill-src")) map.removeSource("measure-fill-src");
      }
    }, []);

    const startMeasureMode = useCallback(() => {
      setMeasureMode(true);
      setMeasurePoints([]);
      setMeasureResult(null);
      clearMeasureMarkers();
      setSidebarOpen(false);
      toast.info("Click on the map to place measurement points. Double-click to finish.");
    }, [clearMeasureMarkers]);

    const stopMeasureMode = useCallback(() => {
      setMeasureMode(false);
      setMeasurePoints([]);
      setMeasureResult(null);
      clearMeasureMarkers();
    }, [clearMeasureMarkers]);

    // Measurement click handler
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !measureMode) return;

      let points: [number, number][] = [];

      const updateMeasureLine = () => {
        if (map.getLayer("measure-line")) map.removeLayer("measure-line");
        if (map.getSource("measure-line-src")) map.removeSource("measure-line-src");
        if (map.getLayer("measure-fill")) map.removeLayer("measure-fill");
        if (map.getSource("measure-fill-src")) map.removeSource("measure-fill-src");

        if (points.length >= 2) {
          map.addSource("measure-line-src", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: points },
            },
          });
          map.addLayer({
            id: "measure-line",
            type: "line",
            source: "measure-line-src",
            paint: {
              "line-color": "#f59e0b",
              "line-width": 3,
              "line-dasharray": [3, 2],
            },
          });

          // If 3+ points, show fill
          if (points.length >= 3) {
            const closedRing = [...points, points[0]];
            map.addSource("measure-fill-src", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "Polygon", coordinates: [closedRing] },
              },
            });
            map.addLayer({
              id: "measure-fill",
              type: "fill",
              source: "measure-fill-src",
              paint: {
                "fill-color": "#f59e0b",
                "fill-opacity": 0.15,
              },
            });
          }
        }

        // Calculate distance
        let totalDist = 0;
        for (let i = 1; i < points.length; i++) {
          const from = turfPoint(points[i - 1]);
          const to = turfPoint(points[i]);
          totalDist += turfDistance(from, to, { units: "meters" });
        }

        // Calculate area (if 3+ points)
        let areaVal = 0;
        if (points.length >= 3) {
          try {
            const closedRing = [...points, points[0]];
            const poly = turfPolygon([closedRing]);
            areaVal = turfArea(poly);
          } catch {}
        }

        setMeasureResult({ distance: totalDist, area: areaVal });
      };

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        points.push(pt);
        setMeasurePoints([...points]);

        // Add marker
        const el = document.createElement("div");
        el.style.cssText = `
          width: 14px; height: 14px; border-radius: 50%;
          background: #f59e0b; border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          cursor: pointer;
        `;
        const m = new mapboxgl.Marker({ element: el }).setLngLat(pt).addTo(map);
        measureMarkersRef.current.push(m);

        updateMeasureLine();
      };

      const handleDblClick = (e: mapboxgl.MapMouseEvent) => {
        e.preventDefault();
        // Finish measurement — keep results visible but stop adding points
        setMeasureMode(false);
      };

      map.on("click", handleClick);
      map.on("dblclick", handleDblClick);
      map.doubleClickZoom.disable();

      return () => {
        map.off("click", handleClick);
        map.off("dblclick", handleDblClick);
        map.doubleClickZoom.enable();
      };
    }, [measureMode, mapLoaded]);
    // ── Sidebar open: resize map so canvas fills the narrowed viewport ────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      // When sidebar opens/closes, the visible map area changes.
      // Call resize so Mapbox recalculates canvas dimensions before any fitBounds.
      const id = requestAnimationFrame(() => {
        map.resize();
        map.triggerRepaint();
      });
      return () => cancelAnimationFrame(id);
    }, [sidebarOpen, mapLoaded]);
    // Survey points are now merged into the GPS markers useEffect above.
    // converterMarkersRef is kept for the clearConvertedCoordinates callback cleanup.

    const handleSingleCoordinateConvert = useCallback(async () => {
      const easting = parseFloat(singleEasting);
      const northing = parseFloat(singleNorthing);
      const combinedScaleFactor = parseFloat(singleCSF || "1");

      if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
        toast.error("Enter valid easting and northing values.");
        return;
      }
      if (!Number.isFinite(combinedScaleFactor) || combinedScaleFactor <= 0) {
        toast.error("Enter a valid Combined Scale Factor.");
        return;
      }

      try {
        const result = await convertSingleMutation.mutateAsync({
          easting,
          northing,
          systemKey: singleCRS as any,
          combinedScaleFactor,
        });
        setSingleResult(result as ConversionResult);
        if (result.success && typeof result.latitude === "number" && typeof result.longitude === "number") {
          const newPt: ConvertedCoordinatePoint = {
            latitude: result.latitude,
            longitude: result.longitude,
            index: Date.now(), // unique index
            identifier: singlePointId.trim() || `SP-${Date.now()}`,
            easting,
            northing,
          };
          if (onAppendSurveyPoints) {
            onAppendSurveyPoints([newPt]);
          } else {
            setConverterPoints(prev => [...prev, newPt]);
          }
          toast.success("Point added to Smart Survey table and map.");
        } else {
          toast.error(result.error || "Conversion failed.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Conversion failed.");
      }
    }, [singleEasting, singleNorthing, singleCSF, singleCRS, singlePointId, convertSingleMutation, onAppendSurveyPoints]);

    const handleConverterFile = useCallback((file: File) => {
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
        toast.error("Please upload a CSV or Excel file.");
        return;
      }
      setBatchFile(file);
      toast.success(`File selected: ${file.name}`);
    }, []);

    const handleBatchCoordinateConvert = useCallback(async () => {
      if (!batchFile) {
        toast.error("Select a CSV or Excel file first.");
        return;
      }

      const combinedScaleFactor = parseFloat(batchCSF || "1");
      if (!Number.isFinite(combinedScaleFactor) || combinedScaleFactor <= 0) {
        toast.error("Enter a valid Combined Scale Factor.");
        return;
      }

      setBatchLoading(true);
      try {
        const buffer = await batchFile.arrayBuffer();
        const result = await parseAndConvertMutation.mutateAsync({
          fileName: batchFile.name,
          fileBuffer: new Uint8Array(buffer) as any,
          systemKey: batchCRS as any,
          combinedScaleFactor,
        });

        const typedResult = result as BatchResult;
        setBatchResult(typedResult);
        const successfulPoints = typedResult.results
          .filter((r) => r.success && typeof r.latitude === "number" && typeof r.longitude === "number")
          .map((r, idx) => ({
            latitude: r.latitude!,
            longitude: r.longitude!,
            identifier: r.identifier || `Point ${r.index + 1}`,
            index: idx,
            easting: r.easting,
            northing: r.northing,
          }));

        if (successfulPoints.length > 0) {
          if (onAppendSurveyPoints) {
            onAppendSurveyPoints(successfulPoints);
          } else {
            setConverterPoints(prev => [...prev, ...successfulPoints]);
          }
          toast.success(`Added ${successfulPoints.length} converted point${successfulPoints.length === 1 ? "" : "s"} to Smart Survey table and map.`);
        } else {
          toast.warning("No valid coordinates were converted.");
        }
        typedResult.warnings?.forEach((warning) => toast.info(warning));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Batch conversion failed.");
      } finally {
        setBatchLoading(false);
      }
    }, [batchFile, batchCSF, batchCRS, parseAndConvertMutation, onAppendSurveyPoints]);

    const clearConvertedCoordinates = useCallback(() => {
      // Reset the key so the GPS markers useEffect re-runs and removes survey points from the source
      markersRenderedForRef.current = '';
      setConverterPoints([]);
      setSingleResult(null);
      setBatchResult(null);
      toast.info("Converted coordinate layer cleared from the map.");
    }, []);

    // ── PDF Extract handler ────────────────────────────────────────────────
    const handlePdfExtract = useCallback(async () => {
      if (!pdfFile) return;
      setPdfLoading(true);
      setPdfReviewPoints(null);
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const fileBuffer = Array.from(new Uint8Array(arrayBuffer));
        const result = await parsePDFMutation.mutateAsync({
          fileName: pdfFile.name,
          fileBuffer,
          systemKey: pdfCRS as 'TX_NORTH_CENTRAL' | 'TX_SOUTH_CENTRAL' | 'TX_NORTH',
          combinedScaleFactor: parseFloat(pdfCSF) || 1.0,
        });
        setPdfReviewPoints(result.reviewPoints);
        toast.success(`Extracted ${result.totalPoints} control point${result.totalPoints !== 1 ? 's' : ''} from ${result.totalPages}-page PDF.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'PDF extraction failed.');
      } finally {
        setPdfLoading(false);
      }
    }, [pdfFile, pdfCRS, pdfCSF, parsePDFMutation]);

    const handleAddPdfPointsToMap = useCallback(() => {
      if (!pdfReviewPoints) return;
      const successPoints = pdfReviewPoints.filter(p => p.conversionSuccess && p.latitude !== null && p.longitude !== null);
      if (successPoints.length === 0) {
        toast.error('No valid GPS coordinates to add to the map.');
        return;
      }
      const newPoints: ConvertedCoordinatePoint[] = successPoints.map((p, i) => ({
        latitude: p.latitude!,
        longitude: p.longitude!,
        identifier: p.pointId,
        index: converterPoints.length + i,
        easting: p.easting,
        northing: p.northing,
        elevation: p.elevation,
        description: p.description,
      }));
      markersRenderedForRef.current = '';
      setConverterPoints(prev => [...prev, ...newPoints]);
      setPdfReviewPoints(null);
      setPdfFile(null);
      toast.success(`Added ${newPoints.length} survey point${newPoints.length !== 1 ? 's' : ''} to the map.`);
    }, [pdfReviewPoints, converterPoints.length]);

    // ── Snap step labels ────────────────────────────────────────────────────
    const snapStepLabel: Record<string, string> = {
      anchorA: "Click blueprint: place Anchor A",
      targetA: "Click map: place Target A'",
      anchorB: "Click blueprint: place Anchor B",
      targetB: "Click map: place Target B'",
      ready: "Ready to snap!",
    };

       // ── Loading state ───────────────────────────────────────────────
    // NOTE: We do NOT early-return on isLoading here.
    // The map container must always be in the DOM so the useEffect can attach Mapbox to it.
    // We show a skeleton overlay on top of the map container while loading.

    // ── Render ──────────────────────────────────────────────────────────────
    return (
      <Card className="bg-card">
        <CardContent className="pt-4">
          {/* Header — hidden in full-screen ProjectMap page */}
          {!hideHeader && (
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
                    &bull; {activeOverlays.length} overlay{activeOverlays.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h2>
            </div>
          )}

          {/* Map wrapper — always rendered so mapContainerRef is never null */}
          <div
            ref={mapWrapperRef}
            onClick={(e) => {
              // Delegated handler: intercept clicks on popup thumbnail images
              const target = e.target as HTMLElement;
              if (target.tagName === 'IMG' && target.dataset.fullurl) {
                e.stopPropagation();
                // Build a minimal Media-like object so the existing lightbox can render it
                setEnlargedMedia({
                  url: target.dataset.fullurl,
                  filename: target.dataset.filename || 'Image',
                  latitude: target.dataset.lat || '0',
                  longitude: target.dataset.lng || '0',
                  mediaType: 'photo',
                } as any);
              }
            }}
            className={`relative rounded-lg overflow-hidden border border-slate-800 ${isFullscreen ? "!fixed !inset-0 !z-[9999] !rounded-none !border-0 !w-screen !h-screen" : ""}`}
            style={isFullscreen ? { background: "#000" } : undefined}
          >
            {/* Mapbox container — always in DOM, polling init waits for non-zero dimensions */}
            <div ref={mapContainerRef} className={`w-full min-h-[500px] ${isFullscreen ? "!h-screen" : heightClass}`} />

            {/* Loading skeleton overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-[10] flex items-center justify-center bg-muted/80 rounded-lg">
                <div className="w-full h-full animate-pulse bg-muted rounded-lg" />
              </div>
            )}

            {/* No GPS overlay — shown only when truly empty and not loading AND no project.location */}
            {!isLoading && mediaWithGPS.length === 0 && activeOverlays.length === 0 && !projectLocation && (
              <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                <Navigation className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No GPS Data Available</p>
                <p className="text-sm">Upload media with GPS coordinates to see them on the map</p>
              </div>
            )}

            {/* Map status indicator */}
            <div className="absolute bottom-4 left-4 z-[5] bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-[10px] text-slate-300 border border-slate-700">
              {mediaWithGPS.length > 0 ? `${mediaWithGPS.length} GPS points` : ""} Satellite Raster
            </div>

              {/* Fullscreen toggle button (top-right) */}
              <button
                onClick={toggleFullscreen}
                className="absolute top-3 right-14 z-[20] bg-white rounded shadow-md p-1.5 hover:bg-gray-100 transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize size={18} className="text-gray-700" /> : <Maximize size={18} className="text-gray-700" />}
              </button>

              {/* Measurement result floating badge */}
              {measureResult && (measureResult.distance > 0 || measureResult.area > 0) && (
                <div className="absolute top-3 left-3 z-[20] bg-black/85 backdrop-blur-md rounded-lg px-4 py-3 text-white max-w-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-semibold">Measurement</span>
                    </div>
                    <button
                      onClick={stopMeasureMode}
                      className="p-1 hover:bg-white/10 rounded"
                      title="Clear measurement"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {measureResult.distance > 0 && (
                    <div className="text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distance:</span>
                        <span className="font-mono">{formatDistance(measureResult.distance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400"></span>
                        <span className="font-mono text-slate-400">{formatDistanceFeet(measureResult.distance)}</span>
                      </div>
                    </div>
                  )}
                  {measureResult.area > 0 && (
                    <div className="text-xs space-y-0.5 mt-1 pt-1 border-t border-white/10">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Area:</span>
                        <span className="font-mono">{formatArea(measureResult.area)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400"></span>
                        <span className="font-mono text-slate-400">{formatAreaFeet(measureResult.area)}</span>
                      </div>
                    </div>
                  )}
                  {measureMode && (
                    <p className="text-[10px] text-amber-400 mt-2">Click to add points. Double-click to finish.</p>
                  )}
                </div>
              )}

              {/* Measure mode indicator (when no results yet) */}
              {measureMode && !measureResult && (
                <div className="absolute top-3 left-3 z-[20] bg-black/85 backdrop-blur-md rounded-lg px-4 py-3 text-white flex items-center gap-3">
                  <Ruler className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold">Measure Mode</p>
                    <p className="text-[10px] text-slate-300">Click to place points. Double-click to finish.</p>
                  </div>
                  <button
                    onClick={stopMeasureMode}
                    className="p-1 hover:bg-white/10 rounded ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Edit mode toolbar */}
              {editMode && !snapMode && !measureMode && (
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
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-xs text-white z-[5]">
                {mediaWithGPS.length > 0 && (
                  <>
                    <span className="text-emerald-400 font-medium">{mediaWithGPS.length}</span> GPS points
                    {flightPathVisible && <span className="text-emerald-400 ml-2">— Flight path</span>}
                  </>
                )}
                {activeOverlays.length > 0 && (
                  <>
                    {mediaWithGPS.length > 0 && <span className="mx-2">&bull;</span>}
                    <span className="text-blue-400 font-medium">{activeOverlays.length}</span> overlay{activeOverlays.length !== 1 ? "s" : ""}
                    {editMode && !snapMode && <span className="text-amber-400 ml-1">&bull; editing</span>}
                    {snapMode && <span className="text-blue-400 ml-1">&bull; snap mode</span>}
                  </>
                )}
              </div>

              {/* ── FEMA Flood Zone Legend ── */}
              {arcgisLayerData.some(l => l.sourceId === 'fema_flood_zones' && l.visible) && (
                <div className="absolute bottom-10 left-4 z-[50] bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700 px-3 py-2 text-white text-[10px] shadow-lg">
                  <div className="font-semibold text-[9px] uppercase tracking-widest text-slate-400 mb-1.5">FEMA Flood Zones</div>
                  {[
                    { color: '#1d4ed8', label: 'AE — 100-yr flood w/ BFE' },
                    { color: '#3b82f6', label: 'A — 100-yr flood' },
                    { color: '#60a5fa', label: 'AO/AH — Shallow flooding' },
                    { color: '#7c3aed', label: 'VE/V — Coastal high hazard' },
                    { color: '#fbbf24', label: 'X — 500-yr / minimal hazard' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2 py-0.5">
                      <div className="w-3 h-3 rounded-sm shrink-0 border border-white/20" style={{ backgroundColor: color, opacity: 0.85 }} />
                      <span className="text-slate-200">{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Overlay Manager Sidebar ── */}
              {(activeOverlays.length > 0 || mediaWithGPS.length > 0) && (
                <>
                  {!sidebarOpen && !snapMode && !measureMode && (
                    <button
                      onClick={() => { if (isTourActive) return; setSidebarOpen(true); onSidebarOpen?.(); }}
                      className="absolute right-0 top-14 z-[100] bg-slate-900/90 backdrop-blur-md text-white p-2 rounded-l-md border-l border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
                      title="Open Overlay Manager"
                    >
                      <Layers size={18} />
                    </button>
                  )}

                  <div
                    className={`absolute right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl transition-transform duration-300 z-[100] ${
                      sidebarOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                  >
                    <button
                      onClick={() => { if (isTourActive) return; setSidebarOpen(false); }}
                      className="absolute -left-10 top-4 bg-slate-900 p-2 rounded-l-md border-l border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>

                    <div className="p-5 h-full overflow-y-auto flex flex-col gap-4 pb-24">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                        <div className="flex items-center gap-2">
                          <Layers className="text-blue-400" size={20} />
                          <h2 className="font-bold text-lg tracking-tight">Overlay Manager</h2>
                        </div>
                        <button onClick={() => { if (isTourActive) return; setSidebarOpen(false); }} className="p-1 hover:bg-slate-800 rounded">
                          <X size={16} />
                        </button>
                      </div>

                      {/* ── MAP CONTROLS section ── */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Map Controls</p>

                        {/* Fullscreen */}
                        <button
                          onClick={toggleFullscreen}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all"
                        >
                          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                          <span className="text-sm font-medium">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                        </button>

                        {/* Hide/Show Flight Path */}
                        {mediaWithGPS.length > 0 && (
                          <button
                            onClick={() => {
                              if (isGuestUser || isDemoProject) {
                                toast.info("Telemetry Locked.", {
                                  description: "Flight paths rely on raw, encrypted drone logs. Secure your account to visualize your private flight metrics.",
                                });
                                return;
                              }
                              setFlightPathVisible((v) => !v);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                              flightPathVisible ? "bg-emerald-600/20 border border-emerald-500/30" : "bg-slate-800 hover:bg-slate-700"
                            }`}
                          >
                            <Route size={16} className={flightPathVisible ? "text-emerald-400" : "text-slate-400"} />
                            <span className="text-sm font-medium">{flightPathVisible ? "Hide Flight Path" : "Show Flight Path"}</span>
                          </button>
                        )}

                        {/* Measure */}
                        <button
                          onClick={() => {
                            if (measureMode || measureResult) {
                              stopMeasureMode();
                            } else {
                              startMeasureMode();
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                            measureMode || measureResult ? "bg-amber-600/20 border border-amber-500/30" : "bg-slate-800 hover:bg-slate-700"
                          }`}
                        >
                          <Ruler size={16} className={measureMode || measureResult ? "text-amber-400" : "text-slate-400"} />
                          <div className="text-left">
                            <span className="text-sm font-medium block">{measureMode || measureResult ? "Clear Measurement" : "Measure"}</span>
                            <span className="text-[10px] text-slate-400">Distance & area on map</span>
                          </div>
                        </button>

                        {/* Project Map Overlay */}
                        <button
                          onClick={() => {
                            if (isGuestUser || isDemoProject) {
                              toast.info("Enterprise Data Required.", {
                                description: "Map overlays require secure CAD or DXF uploads. Secure your account to sync your private engineering layers.",
                              });
                              return;
                            }
                            onOverlayButtonClick?.();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all"
                        >
                          <Layers size={16} className="text-orange-400" />
                          <span className="text-sm font-medium">Add Map Overlay</span>
                        </button>

                        {/* Auto-Detect ROWs (ArcGIS) */}
                        <div className="rounded-xl bg-slate-800/70 border border-slate-700 overflow-hidden">
                          <button
                            onClick={async () => {
                              if (isGuestUser || isDemoProject) {
                                toast.info("Feature requires account.");
                                return;
                              }
                              await runArcgisQuery(true);
                            }}
                            disabled={arcgisQueryMutation.isPending}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-all disabled:opacity-60"
                          >
                            <Radar size={16} className="text-amber-400" />
                            <div className="flex-1 text-left">
                              <span className="text-sm font-medium block">{arcgisQueryMutation.isPending ? 'Loading Layers...' : 'Map Zone Layers'}</span>
                              <span className="text-[10px] text-slate-400">Zoning, ROW & flood data for current view</span>
                            </div>
                            {arcgisLayerData.length > 0 && (
                              <span className="text-[10px] rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5">
                                {arcgisLayerData.reduce((s, l) => s + l.featureCount, 0)}
                              </span>
                            )}
                          </button>

                          {/* Auto-refresh toggle */}
                          <div className="border-t border-slate-700 px-3 py-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">Auto-refresh on pan/zoom</span>
                            <button
                              onClick={() => setArcgisAutoRefresh(v => !v)}
                              className={`relative w-8 h-4 rounded-full transition-colors ${arcgisAutoRefresh ? 'bg-amber-500' : 'bg-slate-600'}`}
                              title={arcgisAutoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                            >
                              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${arcgisAutoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                          </div>

                          {/* ArcGIS layer toggles */}
                          {arcgisLayerData.length > 0 && (
                            <div className="border-t border-slate-700 px-3 py-2 space-y-1.5">
                              {arcgisLayerData.map((layer) => (
                                <div key={layer.sourceId} className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: layer.color }} />
                                  <span className="flex-1 text-[11px] text-slate-300 truncate">{layer.label}</span>
                                  {layer.error ? (
                                    <span className="text-[10px] text-red-400">Error</span>
                                  ) : (
                                    <>
                                      <span className="text-[10px] text-slate-500">{layer.featureCount}</span>
                                      <button
                                        onClick={() => {
                                          setArcgisLayerData(prev => prev.map(l =>
                                            l.sourceId === layer.sourceId ? { ...l, visible: !l.visible } : l
                                          ));
                                        }}
                                        className="p-1 hover:bg-slate-700 rounded"
                                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                                      >
                                        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} className="text-slate-500" />}
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const map = mapRef.current;
                                  if (!map) return;
                                  for (const layer of arcgisLayerData) {
                                    const srcId = `arcgis-src-${layer.sourceId}`;
                                    const layerId = `arcgis-layer-${layer.sourceId}`;
                                    if (map.getLayer(layerId)) map.removeLayer(layerId);
                                    if (map.getSource(srcId)) map.removeSource(srcId);
                                  }
                                  setArcgisLayerData([]);
                                }}
                                className="w-full text-[10px] text-slate-500 hover:text-red-400 transition-colors pt-1"
                              >
                                Clear all layers
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Import Survey Points */}
                        <div className="rounded-xl bg-slate-800/70 border border-slate-700 overflow-hidden">
                          <button
                            onClick={() => setCoordinateConverterExpanded((v) => !v)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-all"
                          >
                            <Calculator size={16} className="text-emerald-400" />
                            <div className="flex-1 text-left">
                              <span className="text-sm font-medium block">Import Survey Points</span>
                              <span className="text-[10px] text-slate-400">Convert SPCS to GPS on this map</span>
                            </div>
                            {converterPoints.length > 0 && (
                              <span className="text-[10px] rounded-full bg-orange-500/20 text-orange-300 px-2 py-0.5">
                                {converterPoints.length}
                              </span>
                            )}
                            <ChevronRight
                              size={16}
                              className={`text-slate-400 transition-transform ${coordinateConverterExpanded ? "rotate-90" : ""}`}
                            />
                          </button>

                          {coordinateConverterExpanded && (
                            <div className="border-t border-slate-700 p-3 space-y-3">
                              {/* Tab selector */}
                              <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-900 p-1">
                                <button
                                  onClick={() => setCoordinateConverterTab("single")}
                                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${coordinateConverterTab === "single" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                                >
                                  Single
                                </button>
                                <button
                                  onClick={() => setCoordinateConverterTab("batch")}
                                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${coordinateConverterTab === "batch" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                                >
                                  Batch
                                </button>
                                <button
                                  onClick={() => setCoordinateConverterTab("pdf")}
                                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${coordinateConverterTab === "pdf" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                                >
                                  PDF
                                </button>
                              </div>
                              {/* Tab description */}
                              <div className="rounded-lg bg-slate-900/60 border border-slate-700/60 px-3 py-2">
                                {coordinateConverterTab === "single" && (
                                  <p className="text-[10px] text-slate-300 leading-relaxed">
                                    <span className="font-semibold text-emerald-400">Single Point</span> — Type one State Plane (SPCS) Easting/Northing coordinate pair and instantly convert it to a GPS pin on the map. Best for quickly locating a known control point or benchmark.
                                  </p>
                                )}
                                {coordinateConverterTab === "batch" && (
                                  <p className="text-[10px] text-slate-300 leading-relaxed">
                                    <span className="font-semibold text-emerald-400">Batch Upload</span> — Upload a <span className="text-white font-medium">.csv</span> or <span className="text-white font-medium">.xlsx</span> file containing a list of survey control points. All points are converted at once and plotted as orange markers on the map. Ideal for importing an entire survey network from your data collector or office software.
                                  </p>
                                )}
                                {coordinateConverterTab === "pdf" && (
                                  <p className="text-[10px] text-slate-300 leading-relaxed">
                                    <span className="font-semibold text-emerald-400">PDF Extract</span> — Upload a survey plat or engineering PDF that contains a <span className="text-white font-medium">Control Point table</span>. The system scans the document, extracts the coordinates automatically, and lets you review them before adding to the map. No manual data entry required.
                                  </p>
                                )}
                              </div>

                              {coordinateConverterTab === "single" ? (
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">State</label>
                                    <select
                                      value={singleCrsState}
                                      onChange={(e) => {
                                        setSingleCrsState(e.target.value);
                                        const zones = SPCS_STATES.find(s => s.abbr === e.target.value)?.zones ?? [];
                                        setSingleCrsZone(zones[0]?.key ?? '');
                                      }}
                                      className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    >
                                      {SPCS_STATES.map(s => (
                                        <option key={s.abbr} value={s.abbr}>{s.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Zone</label>
                                    <select
                                      value={singleCrsZone}
                                      onChange={(e) => setSingleCrsZone(e.target.value)}
                                      className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    >
                                      {singleCrsZones.map(z => (
                                        <option key={z.key} value={z.key}>{z.name} (EPSG:{z.epsg})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Point ID <span className="text-slate-600 normal-case">(optional)</span></label>
                                    <input
                                      type="text"
                                      value={singlePointId}
                                      onChange={(e) => setSinglePointId(e.target.value)}
                                      placeholder="e.g. BM-01"
                                      className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Easting</label>
                                      <input
                                        type="number"
                                        value={singleEasting}
                                        onChange={(e) => setSingleEasting(e.target.value)}
                                        placeholder="2000000"
                                        className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Northing</label>
                                      <input
                                        type="number"
                                        value={singleNorthing}
                                        onChange={(e) => setSingleNorthing(e.target.value)}
                                        placeholder="500000"
                                        className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Combined Scale Factor</label>
                                    <input
                                      type="number"
                                      step="0.00001"
                                      value={singleCSF}
                                      onChange={(e) => setSingleCSF(e.target.value)}
                                      className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <button
                                    onClick={handleSingleCoordinateConvert}
                                    disabled={convertSingleMutation.isPending}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-2 text-xs font-semibold text-white transition-colors"
                                  >
                                    <MapPin size={14} />
                                    {convertSingleMutation.isPending ? "Converting..." : "Convert & Add to Survey Table"}
                                  </button>
                                  {singleResult?.success && (
                                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                                      <p className="text-emerald-300 font-semibold mb-1">Conversion Result</p>
                                      <p className="font-mono text-slate-200">Lat: {singleResult.latitude?.toFixed(8)}</p>
                                      <p className="font-mono text-slate-200">Lng: {singleResult.longitude?.toFixed(8)}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {/* Shared: State → Zone + Combined Scale Factor */}
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">State</label>
                                    <select
                                      value={sharedCrsState}
                                      onChange={(e) => {
                                        setSharedCrsState(e.target.value);
                                        const zones = SPCS_STATES.find(s => s.abbr === e.target.value)?.zones ?? [];
                                        setSharedCrsZone(zones[0]?.key ?? '');
                                      }}
                                      className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    >
                                      {SPCS_STATES.map(s => (
                                        <option key={s.abbr} value={s.abbr}>{s.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Zone</label>
                                    <select
                                      value={sharedCrsZone}
                                      onChange={(e) => setSharedCrsZone(e.target.value)}
                                      className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    >
                                      {sharedCrsZones.map(z => (
                                        <option key={z.key} value={z.key}>{z.name} (EPSG:{z.epsg})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Combined Scale Factor</label>
                                    <input
                                      type="number"
                                      step="0.00001"
                                      value={sharedCSF}
                                      onChange={(e) => setSharedCSF(e.target.value)}
                                      className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>

                                  {/* Conditional instructions */}
                                  {coordinateConverterTab === "batch" ? (
                                    <div className="rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2.5 space-y-1.5">
                                      <p className="text-[10px] uppercase tracking-wide text-orange-400 font-bold">Required Column Headers</p>
                                      <div className="space-y-1">
                                        <div className="flex items-start gap-1.5">
                                          <span className="text-orange-400 text-[10px] mt-0.5">▸</span>
                                          <span className="text-[10px] text-slate-300"><span className="font-semibold text-white">Point / Identifier</span> — name of the point (e.g. id, name, label)</span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                          <span className="text-orange-400 text-[10px] mt-0.5">▸</span>
                                          <span className="text-[10px] text-slate-300"><span className="font-semibold text-white">Easting / X</span> — state plane easting coordinate</span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                          <span className="text-orange-400 text-[10px] mt-0.5">▸</span>
                                          <span className="text-[10px] text-slate-300"><span className="font-semibold text-white">Northing / Y</span> — state plane northing coordinate</span>
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-700">File must be <span className="text-slate-300">.csv</span> or <span className="text-slate-300">.xlsx</span> — headers in first row.</p>
                                    </div>
                                  ) : (
                                    <div className="rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2.5 space-y-1.5">
                                      <p className="text-[10px] uppercase tracking-wide text-orange-400 font-bold">PDF Extract — How It Works</p>
                                      <div className="space-y-1">
                                        <div className="flex items-start gap-1.5">
                                          <span className="text-orange-400 text-[10px] mt-0.5">▸</span>
                                          <span className="text-[10px] text-slate-300">Upload a survey plat or engineering PDF containing a <span className="font-semibold text-white">CONTROL POINT</span> table</span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                          <span className="text-orange-400 text-[10px] mt-0.5">▸</span>
                                          <span className="text-[10px] text-slate-300">Table must have columns: <span className="font-semibold text-white">Northing, Easting, Elevation, Description</span></span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                          <span className="text-orange-400 text-[10px] mt-0.5">▸</span>
                                          <span className="text-[10px] text-slate-300">Review extracted points before adding to map</span>
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-700">Supports digital PDFs — max <span className="text-slate-300">20MB</span>.</p>
                                    </div>
                                  )}

                                  {/* Single unified drop zone */}
                                  <div
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const file = e.dataTransfer.files?.[0];
                                      if (!file) return;
                                      if (coordinateConverterTab === 'batch') {
                                        handleConverterFile(file);
                                      } else {
                                        if (file.name.toLowerCase().endsWith('.pdf')) setPdfFile(file);
                                        else toast.error('Please drop a PDF file.');
                                      }
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onClick={() => coordinateConverterTab === 'batch' ? converterFileInputRef.current?.click() : pdfFileInputRef.current?.click()}
                                    className="cursor-pointer rounded-lg border border-dashed border-slate-600 bg-slate-950/70 p-4 text-center hover:border-emerald-500 transition-colors"
                                  >
                                    {coordinateConverterTab === 'batch'
                                      ? <Upload className="mx-auto mb-2 text-slate-400" size={18} />
                                      : <FileSearch className="mx-auto mb-2 text-slate-400" size={18} />
                                    }
                                    <p className="text-xs font-medium text-slate-200">
                                      {coordinateConverterTab === 'batch'
                                        ? (batchFile ? batchFile.name : 'Drop or select CSV / XLSX')
                                        : (pdfFile ? pdfFile.name : 'Drop or select PDF')
                                      }
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                      {coordinateConverterTab === 'batch' ? 'Max 1,000 rows and 5MB' : 'Survey plats, engineering docs — max 20MB'}
                                    </p>
                                    <input ref={converterFileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) handleConverterFile(f); }} />
                                    <input ref={pdfFileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) setPdfFile(f); }} />
                                  </div>

                                  {/* Action button */}
                                  {coordinateConverterTab === 'batch' ? (
                                    <button onClick={handleBatchCoordinateConvert} disabled={!batchFile || batchLoading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-2 text-xs font-semibold text-white transition-colors">
                                      <Upload size={14} />
                                      {batchLoading ? 'Processing...' : 'Convert Batch & Add to Survey Table'}
                                    </button>
                                  ) : (
                                    <button onClick={handlePdfExtract} disabled={!pdfFile || pdfLoading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-2 text-xs font-semibold text-white transition-colors">
                                      <FileSearch size={14} />
                                      {pdfLoading ? 'Scanning PDF...' : 'Scan & Extract Points'}
                                    </button>
                                  )}

                                  {/* Batch results */}
                                  {coordinateConverterTab === 'batch' && batchResult && (
                                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs space-y-2">
                                      <div className="grid grid-cols-3 gap-2 text-center">
                                        <div><p className="text-slate-500">Total</p><p className="font-semibold text-white">{batchResult.totalRows}</p></div>
                                        <div><p className="text-slate-500">Added</p><p className="font-semibold text-emerald-300">{batchResult.successfulRows}</p></div>
                                        <div><p className="text-slate-500">Failed</p><p className="font-semibold text-red-300">{batchResult.failedRows}</p></div>
                                      </div>
                                      {batchResult.errors.length > 0 && (
                                        <div className="border-t border-slate-800 pt-2 text-red-300">
                                          {batchResult.errors.slice(0, 3).map((error, idx) => (
                                            <p key={idx}>Row {error.row}: {error.error}</p>
                                          ))}
                                          {batchResult.errors.length > 3 && <p>...and {batchResult.errors.length - 3} more errors</p>}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* PDF review list */}
                                  {coordinateConverterTab === 'pdf' && pdfReviewPoints && (
                                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400 font-semibold">Review — {pdfReviewPoints.length} point{pdfReviewPoints.length !== 1 ? 's' : ''} found</span>
                                        <span className="text-emerald-400">{pdfReviewPoints.filter(p => p.conversionSuccess).length} valid</span>
                                      </div>
                                      <div className="max-h-40 overflow-y-auto space-y-1">
                                        {pdfReviewPoints.map((pt) => (
                                          <div key={pt.pointId} className={`flex items-start gap-2 rounded p-1.5 ${pt.conversionSuccess ? 'bg-slate-900' : 'bg-red-950/30'}`}>
                                            <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${pt.conversionSuccess ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
                                              {pt.conversionSuccess ? pt.pointId : '!'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-slate-200 font-medium truncate">#{pt.pointId} {pt.description}</p>
                                              {pt.conversionSuccess ? (
                                                <p className="text-slate-500">{pt.latitude?.toFixed(6)}, {pt.longitude?.toFixed(6)} · elev {pt.elevation?.toFixed(2) ?? 'N/A'}</p>
                                              ) : (
                                                <p className="text-red-400">{pt.conversionError}</p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <button
                                        onClick={handleAddPdfPointsToMap}
                                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 px-3 py-2 text-xs font-semibold text-white transition-colors"
                                      >
                                        <MapPin size={14} />
                                        Add {pdfReviewPoints.filter(p => p.conversionSuccess).length} Points to Map
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {converterPoints.length > 0 && (
                                <button
                                  onClick={clearConvertedCoordinates}
                                  className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                                >
                                  Clear Converted Layer ({converterPoints.length})
                                </button>
                              )}
                            </div>
                          )}
                        </div>


                      </div>

                      {/* ── PER-OVERLAY CONTROLS ── */}
                      {activeOverlays.map((ov) => {
                        const opacity = opacityMap[ov.id] ?? 0.7;
                        const visible = visibilityMap[ov.id] ?? true;
                        const locked = overlayLocked[ov.id] ?? false;
                        const label = ov.label || `Plan ${ov.id}`;
                        const isRenaming = renamingOverlayId === ov.id;
                        const isSelected = selectedOverlayId === ov.id;

                        return (
                          <div
                            key={ov.id}
                            className={`space-y-3 border-t pt-4 rounded-lg px-2 transition-all ${
                              isSelected
                                ? "border-emerald-500/70 bg-emerald-950/30"
                                : "border-slate-700"
                            }`}
                          >
                            {/* Overlay name + visibility + lock */}
                            <div className="flex items-center gap-2">
                              {isRenaming ? (
                                <div className="flex-1 flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleRenameSubmit(ov.id);
                                      if (e.key === "Escape") setRenamingOverlayId(null);
                                    }}
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleRenameSubmit(ov.id)}
                                    className="p-1 hover:bg-slate-700 rounded text-emerald-400"
                                    title="Save name"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setRenamingOverlayId(null)}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-400"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                  <span
                                    className="text-sm font-medium text-slate-200 truncate cursor-pointer hover:text-white"
                                    title={`${label} — click to rename`}
                                    onClick={() => !isDemoProject && handleRename(ov)}
                                  >
                                    {label}
                                  </span>
                                  {!isDemoProject && (
                                    <button
                                      onClick={() => handleRename(ov)}
                                      className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 shrink-0"
                                      title="Rename overlay"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={() => handleToggleVisibility(ov.id)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                                title={visible ? "Hide overlay" : "Show overlay"}
                              >
                                {visible ? <Eye size={16} /> : <EyeOff size={16} className="text-slate-500" />}
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

                            {/* Quick actions row */}
                            {!isDemoProject && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Select for alignment */}
                                <button
                                  onClick={() => setSelectedOverlayId(isSelected ? null : ov.id)}
                                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-xs ${
                                    isSelected
                                      ? "bg-emerald-600/30 border border-emerald-500/60 text-emerald-300"
                                      : "bg-slate-800 hover:bg-emerald-900/40 hover:text-emerald-400"
                                  }`}
                                  title={isSelected ? "Deselect overlay" : "Select as alignment target"}
                                >
                                  <Crosshair size={13} />
                                  <span>{isSelected ? "Selected ✓" : "Select"}</span>
                                </button>
                                <button
                                  onClick={() => handleFitToOverlay(ov)}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs"
                                  title="Fit map to overlay bounds"
                                >
                                  <Target size={13} />
                                  <span>Fit</span>
                                </button>
                                <button
                                  onClick={() => handleToggleLock(ov.id)}
                                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-xs ${
                                    locked ? "bg-amber-600/20 border border-amber-500/30 text-amber-400" : "bg-slate-800 hover:bg-slate-700"
                                  }`}
                                  title={locked ? "Unlock overlay" : "Lock overlay position"}
                                >
                                  {locked ? <Lock size={13} /> : <Unlock size={13} />}
                                  <span>{locked ? "Locked" : "Lock"}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* ── ALIGNMENT TOOLS section ── */}
                      {!isDemoProject && activeOverlays.length > 0 && (() => {
                        const selectedOv = selectedOverlayId != null
                          ? activeOverlays.find((o) => o.id === selectedOverlayId) ?? null
                          : null;
                        const noSelection = selectedOv == null;
                        return (
                          <div className="pt-2 border-t border-slate-700 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Alignment Tools</p>
                              {noSelection && (
                                <span className="text-[10px] text-amber-400/80 italic">Select an overlay above</span>
                              )}
                            </div>

                            {/* Edit Alignment */}
                            <button
                              disabled={noSelection}
                              onClick={() => {
                                if (editMode) { handleCancelEdit(); }
                                else if (selectedOv) { handleStartEdit(selectedOv); setSidebarOpen(false); }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                                noSelection
                                  ? "bg-slate-800/40 opacity-40 cursor-not-allowed"
                                  : editMode && !snapMode
                                    ? "bg-blue-600 shadow-lg shadow-blue-900/40"
                                    : "bg-slate-800 hover:bg-slate-700"
                              }`}
                            >
                              <Move size={16} />
                              <div className="text-left">
                                <span className="text-sm font-medium block">{editMode && !snapMode ? "Stop Editing" : "Edit Alignment"}</span>
                                <span className="text-[10px] text-slate-400">
                                  {noSelection ? "Select an overlay first" : "Drag corners to resize & rotate"}
                                </span>
                              </div>
                            </button>

                            {/* 2-Point Snap */}
                            <button
                              disabled={noSelection}
                              onClick={() => {
                                if (snapMode) { cancelSnapMode(); handleCancelEdit(); }
                                else if (selectedOv) { startSnapMode(selectedOv); }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                                noSelection
                                  ? "bg-slate-800/40 opacity-40 cursor-not-allowed"
                                  : snapMode
                                    ? "bg-blue-600 shadow-lg shadow-blue-900/40"
                                    : "bg-slate-800 hover:bg-slate-700"
                              }`}
                            >
                              <Crosshair size={16} />
                              <div className="text-left">
                                <span className="text-sm font-medium block">{snapMode ? "Cancel Snap" : "2-Point Snap"}</span>
                                <span className="text-[10px] text-slate-400">
                                  {noSelection ? "Select an overlay first" : "Match 2 points for precise alignment"}
                                </span>
                              </div>
                            </button>

                            {/* Reset to Default */}
                            {selectedOv && (
                              <button
                                onClick={() => handleReset(selectedOv)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-amber-900/40 hover:text-amber-400 transition-all"
                              >
                                <RotateCcw size={16} />
                                <span className="text-sm font-medium">Reset to Default</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── DANGER ZONE ── */}
                      {!isDemoProject && selectedOverlayId != null && (() => {
                        const selectedOv = activeOverlays.find((o) => o.id === selectedOverlayId);
                        if (!selectedOv) return null;
                        return (
                          <div className="pt-2 border-t border-red-900/30 space-y-2">
                            <p className="text-[10px] uppercase tracking-widest text-red-500/60 font-bold">Danger Zone</p>
                            <button
                              onClick={() => handleDelete(selectedOv)}
                              disabled={isDeleting}
                              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/40 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={16} />
                              <span className="text-sm font-medium">{isDeleting ? "Deleting..." : "Delete Overlay"}</span>
                            </button>
                          </div>
                        );
                      })()}

                      {/* Edit mode tip */}
                      {editMode && !snapMode && (
                        <p className="text-xs text-slate-400 mt-auto">
                          Drag <span className="text-emerald-400">green corners</span> to resize — the image stretches live.{" "}
                          <span className="text-amber-400">↻ yellow handle</span> rotates all 4 corners. Toggle{" "}
                          <span className="text-emerald-400">🔒 AR</span> to lock aspect ratio. Click{" "}
                          <span className="text-emerald-400">Save & Finish</span> to persist.
                        </p>
                      )}

                      {/* Snap mode tip */}
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

          {/* PDF to Overlay Converter Dialog */}
          <PdfToOverlayConverter
            open={showPdfConverter}
            onOpenChange={setShowPdfConverter}
            projectId={projectId}
            onConversionComplete={(pngUrl, filename) => {
              toast.success(`Overlay converted: ${filename}`);
            }}
            onOverlayCreated={() => {
              // Refresh overlays after new one is created
              window.location.reload();
            }}
          />
        </CardContent>
      </Card>
    );
  }
);
MapboxProjectMap.displayName = "MapboxProjectMap";
