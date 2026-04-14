/**
 * MAPIT — /create Drop Zone + Final Reveal
 *
 * States:
 *   idle        → "Drop."  (full-screen uploader)
 *   uploading   → "Uploading..."  (uploader visible, map mounting behind)
 *   processing  → "Processing..."  (uploader fades to opacity-0, map revealed)
 *   done        → map fully visible, "Return to Dashboard" pill shown
 *
 * Demo Mode (authenticated users):
 *   Full sequence runs client-side. No DB write.
 *   Map mounts on file drop, flyTo fires when Processing starts.
 *
 * Real Mode (unauthenticated):
 *   Calls onboarding.initProject, uploads media, navigates to /project/:id/map.
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "video/mp4",
  "video/quicktime",
]);
const ACCEPTED_EXT = new Set([".jpg", ".jpeg", ".png", ".tiff", ".tif", ".mp4", ".mov"]);

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_MIME.has(file.type)) return true;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXT.has(ext);
}

async function extractGPS(files: File[]): Promise<{ lat: number; lng: number } | null> {
  for (const file of files) {
    if (file.type.startsWith("video/")) continue;
    try {
      const gps = await exifr.gps(file);
      if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
        return { lat: gps.latitude, lng: gps.longitude };
      }
    } catch { /* try next */ }
    try {
      const exif = await exifr.parse(file, { gps: true, tiff: true, exif: true });
      if (exif) {
        const lat = exif.latitude ?? exif.GPSLatitude;
        const lng = exif.longitude ?? exif.GPSLongitude;
        if (typeof lat === "number" && typeof lng === "number") {
          return { lat, lng };
        }
      }
    } catch { /* ignore */ }
  }
  return null;
}

type Phase = "idle" | "uploading" | "processing" | "done";

export default function Create() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // ─── UI state ───
  const [phase, setPhase] = useState<Phase>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [shake, setShake] = useState(false);
  const [progress, setProgress] = useState(0);

  // ─── Map state ───
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapMounted, setMapMounted] = useState(false); // true once map container is in DOM
  const [mapLoaded, setMapLoaded] = useState(false);
  const flyCoords = useRef<{ lat: number; lng: number } | null>(null);
  const flyFired = useRef(false);

  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const initProject = trpc.onboarding.initProject.useMutation();
  const uploadMedia = trpc.onboarding.uploadMedia.useMutation();
  const utils = trpc.useUtils();

  // ─── Mount Mapbox map once mapMounted=true ───
  useEffect(() => {
    if (!mapMounted || mapRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    const tryInit = () => {
      const container = mapContainerRef.current;
      if (!container || container.clientHeight === 0) {
        requestAnimationFrame(tryInit);
        return;
      }
      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [-96.797, 32.7767],
        zoom: 3,
        pitchWithRotate: false,
        trackResize: true,
      });
      map.on("load", () => {
        mapRef.current = map;
        setMapLoaded(true);
        requestAnimationFrame(() => map.resize());
      });
      mapRef.current = map;
    };
    requestAnimationFrame(tryInit);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapMounted]);

  // ─── FlyTo once map is loaded and we have coords ───
  useEffect(() => {
    if (!mapLoaded || flyFired.current) return;
    const coords = flyCoords.current;
    if (!coords) return;
    flyFired.current = true;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [coords.lng, coords.lat],
      zoom: 17,
      pitch: 50,
      bearing: 0,
      duration: 4000,
      essential: true,
    });
    // Drop an emerald marker pin after the fly animation lands (~4.2s)
    const markerTimer = setTimeout(() => {
      if (!mapRef.current) return;
      const el = document.createElement('div');
      el.style.cssText = [
        'width:18px', 'height:18px', 'border-radius:50%',
        'background:#00C853', 'border:3px solid #fff',
        'box-shadow:0 0 0 4px rgba(0,200,83,0.35),0 4px 12px rgba(0,0,0,0.6)',
        'cursor:default',
      ].join(';');
      new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([coords.lng, coords.lat])
        .addTo(mapRef.current);
    }, 4200);
    return () => clearTimeout(markerTimer);
  }, [mapLoaded]);

  // ─── Progress bar helpers ───
  function startProgress(from: number) {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setProgress(from);
    progressInterval.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(progressInterval.current!); return 95; }
        const inc = p < 60 ? 3 : p < 80 ? 1.5 : 0.5;
        return Math.min(p + inc, 95);
      });
    }, 40);
  }

  function finishProgress() {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setProgress(100);
  }

  // ─── Shake on bad file ───
  const triggerShake = useCallback(() => {
    setShake(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), 600);
    toast("Format not supported. Use drone imagery or video.", {
      duration: 3500,
      position: "bottom-center",
      style: {
        background: "rgba(10,10,10,0.92)",
        color: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "14px",
        fontSize: "13px",
        fontFamily: "Inter, sans-serif",
        backdropFilter: "blur(20px)",
        padding: "12px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      },
    });
  }, []);

  // ─── Core file handler ───
  const processFiles = useCallback(
    async (files: File[]) => {
      const invalid = files.filter((f) => !isAcceptedFile(f));
      if (invalid.length > 0) { triggerShake(); return; }

      // Mount the map immediately so it loads in the background
      setMapMounted(true);
      flyFired.current = false;

      // Stage 1 → 2: show "Uploading..." immediately
      setPhase("uploading");
      startProgress(5);

      // Extract GPS
      const coords = await extractGPS(files);
      if (coords) {
        flyCoords.current = coords;
        sessionStorage.setItem("mapit_fly_coords", JSON.stringify({ lat: coords.lat, lng: coords.lng }));
      } else {
        flyCoords.current = null;
        sessionStorage.removeItem("mapit_fly_coords");
      }

      // Stage 2 → 3: flip to "Processing..." after 3 s, fade uploader, trigger flyTo
      const processingTimer = setTimeout(() => {
        setPhase("processing");
        startProgress(60);

        // If map is already loaded, fire flyTo now; otherwise the useEffect handles it
        if (mapLoaded && coords && !flyFired.current) {
          flyFired.current = true;
          mapRef.current?.flyTo({
            center: [coords.lng, coords.lat],
            zoom: 17,
            pitch: 50,
            bearing: 0,
            duration: 4000,
            essential: true,
          });
        }
      }, 3000);

      // ══════════════════════════════════════════════
      //  DEMO MODE — authenticated user, no DB write
      // ══════════════════════════════════════════════
      if (isAuthenticated) {
        // After 5 s total → show "Return to Dashboard"
        setTimeout(() => {
          clearTimeout(processingTimer);
          finishProgress();
          setPhase("done");
        }, 5000);
        return;
      }

      // ══════════════════════════════════════════════
      //  REAL MODE — unauthenticated user
      // ══════════════════════════════════════════════
      const projectName = sessionStorage.getItem("mapit_project_name") || "New Project";

      try {
        const result = await initProject.mutateAsync({
          name: projectName,
          lat: coords?.lat,
          lng: coords?.lng,
        });

        sessionStorage.setItem("mapit_project_id", String(result.projectId));
        sessionStorage.setItem("mapit_project_name", projectName);
        sessionStorage.setItem("mapit_trial_expires", result.trialExpiresAt);

        for (const file of files) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte), ""
              )
            );
            await uploadMedia.mutateAsync({
              projectId: result.projectId,
              filename: file.name,
              mimeType: file.type || "image/jpeg",
              fileData: base64,
            });
          } catch (uploadErr) {
            console.error("[Create] Failed to upload media:", file.name, uploadErr);
          }
        }

        await utils.media.list.invalidate({ projectId: result.projectId });
        finishProgress();
        setTimeout(() => setLocation(`/project/${result.projectId}/map`), 400);
      } catch (err) {
        console.error("[Create] Failed to create project:", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes("FORBIDDEN") || errorMsg.includes("Authenticated users cannot")) {
          // Authenticated user hit the real endpoint — run demo sequence
          setTimeout(() => { setPhase("processing"); startProgress(60); }, 3000);
          setTimeout(() => {
            clearTimeout(processingTimer);
            finishProgress();
            setPhase("done");
          }, 5000);
        } else {
          finishProgress();
          setTimeout(() => setLocation("/dashboard"), 400);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAuthenticated, mapLoaded, initProject, uploadMedia, setLocation, triggerShake]
  );

  // ─── Drag handlers ───
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (phase === "idle") setIsDragging(true);
  }, [phase]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) processFiles(files);
    },
    [processFiles]
  );

  const isProcessing = phase === "uploading" || phase === "processing";
  const statusText = phase === "processing" ? "Processing..." : "Uploading...";

  // Uploader opacity: fade out when processing starts (phase === "processing" or "done")
  const uploaderOpacity = phase === "processing" || phase === "done" ? 0 : 1;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col relative overflow-hidden">

      {/* ─── Layer 0: Mapbox map (always behind everything) ─── */}
      {mapMounted && (
        <div
          ref={mapContainerRef}
          className="absolute inset-0 z-0"
          style={{ width: "100%", height: "100%" }}
        />
      )}

      {/* ─── Layer 1: Dark overlay that fades away with uploader ─── */}
      <div
        className="absolute inset-0 z-10 bg-[#0A0A0A] transition-opacity duration-700"
        style={{
          opacity: uploaderOpacity,
          pointerEvents: uploaderOpacity === 0 ? "none" : "auto",
        }}
      />

      {/* ─── Layer 2: Uploader UI (fades out on Processing) ─── */}
      <div
        className="absolute inset-0 z-20 flex flex-col transition-opacity duration-700"
        style={{
          opacity: uploaderOpacity,
          pointerEvents: uploaderOpacity === 0 ? "none" : "auto",
        }}
      >
        {/* Top progress bar */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              key="progress-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-0 left-0 right-0 h-[2px] z-50 bg-transparent"
            >
              <motion.div
                className="h-full bg-[#00C853] shadow-[0_0_8px_#00C853]"
                style={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back arrow */}
        <div className="absolute top-8 left-8">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-white/30 hover:text-white transition-colors duration-200 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Drop Zone */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.label
            htmlFor="file-input"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: shake ? [0, -10, 10, -10, 10, -6, 6, -3, 3, 0] : 0,
            }}
            transition={shake ? { duration: 0.5, ease: "easeInOut" } : { duration: 0.4 }}
            className={`
              relative w-full max-w-3xl aspect-video flex flex-col items-center justify-center
              border rounded-3xl select-none transition-all duration-300
              ${isProcessing ? "cursor-default" : "cursor-pointer"}
              ${isDragging
                ? "border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_40px_rgba(0,200,83,0.08)]"
                : shake
                ? "border-red-500/40"
                : "border-white/5 bg-transparent hover:border-white/10"
              }
            `}
          >
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.p
                  key="status"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-[clamp(3rem,9vw,6rem)] font-bold tracking-tighter leading-none mb-6 bg-clip-text text-transparent animate-pulse"
                  style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                >
                  {statusText}
                </motion.p>
              ) : (
                <motion.p
                  key="drop"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, scale: isDragging ? 1.05 : 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="text-[clamp(5rem,14vw,9rem)] font-bold tracking-tighter leading-none mb-6 bg-clip-text text-transparent pointer-events-none"
                  style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
                >
                  Drop.
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === "idle" && (
                <motion.div
                  key="instructions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center pointer-events-none"
                >
                  <p className="text-white/90 text-2xl leading-relaxed font-medium">
                    Drag your drone imagery or .mp4 files here to begin.
                  </p>
                  <p className="mt-5 text-white/40 text-sm tracking-widest uppercase font-semibold">
                    or click to browse
                  </p>
                  <p className="mt-3 text-white/60 text-sm tracking-wide">
                    JPG · PNG · TIFF · MP4 · MOV
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              id="file-input"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.tiff,.tif,.mp4,.mov"
              className="sr-only"
              onChange={handleFileInput}
              disabled={isProcessing}
            />
          </motion.label>
        </div>
      </div>

      {/* ─── Layer 3: Return to Dashboard pill (above map, below nothing) ─── */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            key="demo-complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
            className="absolute bottom-12 left-0 right-0 flex justify-center z-30"
          >
            <button
              onClick={() => setLocation("/dashboard")}
              className="px-8 py-3 text-sm font-medium tracking-wide text-white/80 hover:text-white border border-white/15 hover:border-white/30 rounded-full transition-all duration-300 bg-black/40 hover:bg-black/60 backdrop-blur-md shadow-lg"
            >
              Return to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
