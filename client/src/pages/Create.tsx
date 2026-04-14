/**
 * MAPIT — /create Drop Zone (Act 2)
 * 7-Step Cinematic Flow:
 *   Step 4: Drop (idle) — text-7xl silver gradient, hero video BG
 *   Step 5a: UPLOADING — 3s pulsing dashed line, hero video BG
 *   Step 5b: PROCESSING — 5s minimum, stays until map is ready
 *   Transition: Cross-fade overlay fades out as flyTo begins (no black gap)
 *
 * GPS extraction priority:
 *  1. exifr.gps() — works for JPEG/TIFF/HEIC drone images
 *  2. exifr.parse() full parse — fallback for non-standard EXIF
 *  3. No GPS → quiet toast + world-view fallback
 */

import { useCallback, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────
type Stage = "idle" | "dragging" | "uploading" | "processing" | "done";

// ── Constants ──────────────────────────────────────────────────────────────────
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

/**
 * Robust GPS extraction — tries multiple exifr strategies.
 */
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
      const exif = await exifr.parse(file, { gps: true, tiff: true, exif: true, translateKeys: true, translateValues: true });
      if (exif) {
        const lat = exif.latitude ?? exif.GPSLatitude;
        const lng = exif.longitude ?? exif.GPSLongitude;
        if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
      }
    } catch { /* ignore */ }
  }
  return null;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function Create() {
  const [, setLocation] = useLocation();
  const [stage, setStage] = useState<Stage>("idle");
  const [shake, setShake] = useState(false);
  const [processingLabel, setProcessingLabel] = useState(0);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelTimer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether the backend work is done AND the processing timer has elapsed
  const backendDoneRef = useRef(false);
  const processingTimerDoneRef = useRef(false);
  const pendingNavRef = useRef<string | null>(null);

  const initProject = trpc.onboarding.initProject.useMutation();
  const uploadMedia = trpc.onboarding.uploadMedia.useMutation();
  const utils = trpc.useUtils();

  const PROCESSING_LABELS = [
    "Extracting GPS Telemetry & Metadata...",
    "Generating High-Precision 3D Mesh...",
    "Optimizing Georeferenced Digital Twin...",
  ];

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
      if (labelTimer1Ref.current) clearTimeout(labelTimer1Ref.current);
      if (labelTimer2Ref.current) clearTimeout(labelTimer2Ref.current);
    };
  }, []);

  // When both backend and 5s processing timer are done → navigate
  const tryNavigate = useCallback(() => {
    if (backendDoneRef.current && processingTimerDoneRef.current && pendingNavRef.current) {
      const dest = pendingNavRef.current;
      pendingNavRef.current = null;
      setStage("done");
      // 1s cross-fade then navigate
      setTimeout(() => setLocation(dest), 1000);
    }
  }, [setLocation]);

  const triggerShake = useCallback(() => {
    setShake(true);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShake(false), 600);
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

  const processFiles = useCallback(async (files: File[]) => {
    const invalid = files.filter((f) => !isAcceptedFile(f));
    if (invalid.length > 0) { triggerShake(); return; }

    // Reset refs
    backendDoneRef.current = false;
    processingTimerDoneRef.current = false;
    pendingNavRef.current = null;

    // Store photo count for Magic Windows
    sessionStorage.setItem("mapit_photo_count", String(files.length));

    // ── Step 5a: UPLOADING (3s) ────────────────────────────────────────────
    setStage("uploading");

    // Start GPS extraction in parallel
    const coordsPromise = extractGPS(files);

    // After 6s → PROCESSING
    uploadTimerRef.current = setTimeout(() => {
      setStage("processing");
      console.log('[MAPIT Analytics] Demo_Started');

      // Processing must show for at least 5s
      // Reset and cycle processing labels: 0s→label0, 4s→label1, 7s→label2
      setProcessingLabel(0);
      labelTimer1Ref.current = setTimeout(() => setProcessingLabel(1), 4000);
      labelTimer2Ref.current = setTimeout(() => setProcessingLabel(2), 7000);

      processingTimerRef.current = setTimeout(() => {
        processingTimerDoneRef.current = true;
        tryNavigate();
      }, 5000);
    }, 6000);

    // ── Backend work (runs in parallel with timers) ────────────────────────
    const coords = await coordsPromise;

    if (coords) {
      sessionStorage.setItem("mapit_fly_coords", JSON.stringify({ lat: coords.lat, lng: coords.lng }));
    } else {
      sessionStorage.removeItem("mapit_fly_coords");
      toast("No location found in file. Defaulting to world view.", {
        duration: 3500,
        style: {
          background: "#111",
          color: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "13px",
          fontFamily: "Inter, sans-serif",
        },
      });
    }

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

      // Upload media (fire-and-forget after first)
      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), "")
          );
          await uploadMedia.mutateAsync({
            projectId: result.projectId,
            filename: file.name,
            mimeType: file.type || "image/jpeg",
            fileData: base64,
          });
        } catch (uploadErr) {
          console.error("[Create] media upload failed:", file.name, uploadErr);
        }
      }

      await utils.media.list.invalidate({ projectId: result.projectId });

      pendingNavRef.current = `/project/${result.projectId}/map`;
    } catch (err) {
      console.error("[Create] Failed to create project:", err);
      pendingNavRef.current = "/map";
    }

    backendDoneRef.current = true;
    tryNavigate();
  }, [initProject, uploadMedia, utils, triggerShake, tryNavigate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (stage === "idle") setStage("dragging");
  }, [stage]);

  const handleDragLeave = useCallback(() => {
    setStage((s) => (s === "dragging" ? "idle" : s));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
    else setStage("idle");
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const isActive = stage === "uploading" || stage === "processing" || stage === "done";
  const isDragging = stage === "dragging";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col relative overflow-hidden">

      {/* ── Back arrow (hidden during active processing) ── */}
      {!isActive && (
        <div className="absolute top-8 left-8 z-20">
          <button
            onClick={() => setLocation("/name")}
            className="flex items-center gap-2 text-white/30 hover:text-white transition-colors duration-200 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="relative flex-1 flex items-center justify-center p-8" style={{ zIndex: 10 }}>

        {/* ── UPLOADING state ── */}
        <AnimatePresence mode="wait">
          {stage === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-8 select-none"
            >
              <p
                className="font-bold tracking-tighter leading-none bg-clip-text text-transparent"
                style={{
                  fontSize: "clamp(4rem,14vw,9rem)",
                  backgroundImage: "linear-gradient(to bottom, #ffffff 0%, #9ca3af 60%, #4b5563 100%)",
                }}
              >
                Uploading
              </p>
              {/* Pulsing dashed execution line */}
              <div className="w-64 flex items-center gap-1">
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-[2px] flex-1 rounded-full bg-white/40"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.075, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PROCESSING state ── */}
          {stage === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-8 select-none"
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={processingLabel}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="font-bold tracking-tighter leading-snug bg-clip-text text-transparent text-center max-w-2xl"
                  style={{
                    fontSize: "clamp(1.5rem,4vw,2.5rem)",
                    backgroundImage: "linear-gradient(to bottom, #ffffff 0%, #9ca3af 60%, #4b5563 100%)",
                  }}
                >
                  {PROCESSING_LABELS[processingLabel]}
                </motion.p>
              </AnimatePresence>
              {/* Pulsing dashed execution line */}
              <div className="w-64 flex items-center gap-1">
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-[2px] flex-1 rounded-full bg-white/40"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.085, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── IDLE / DROP state ── */}
          {(stage === "idle" || stage === "dragging") && (
            <motion.label
              key="drop"
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
              exit={{ opacity: 0, scale: 0.97 }}
              transition={shake ? { duration: 0.5, ease: "easeInOut" } : { duration: 0.4 }}
              className={`
                relative w-full max-w-3xl aspect-video flex flex-col items-center justify-center
                border rounded-3xl select-none transition-all duration-300 cursor-pointer
                ${isDragging
                  ? "border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_40px_rgba(0,200,83,0.08)]"
                  : shake
                  ? "border-red-500/40"
                  : "border-white/10 bg-black/20 hover:border-white/20"
                }
              `}
            >
              <motion.p
                animate={{ scale: isDragging ? 1.05 : 1 }}
                transition={{ duration: 0.2 }}
                className="font-bold tracking-tighter leading-none mb-6 bg-clip-text text-transparent pointer-events-none"
                style={{
                  fontSize: "clamp(5rem,14vw,9rem)",
                  backgroundImage: "linear-gradient(to bottom, #ffffff 0%, #9ca3af 60%, #4b5563 100%)",
                }}
              >
                Drop.
              </motion.p>
              <div className="text-center pointer-events-none">
                <p className="text-white/80 text-2xl leading-relaxed font-medium">
                  Drag your drone imagery or .mp4 files here to begin.
                </p>
                <p className="mt-5 text-white/40 text-sm tracking-widest uppercase font-semibold">
                  or click to browse
                </p>
                <p className="mt-3 text-white/50 text-sm tracking-wide">
                  JPG · PNG · TIFF · MP4 · MOV
                </p>
              </div>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.tiff,.tif,.mp4,.mov"
                className="sr-only"
                onChange={handleFileInput}
              />
            </motion.label>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
