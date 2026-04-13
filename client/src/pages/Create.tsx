/**
 * MAPIT — /create Drop Zone (Act 2)
 * Extracts GPS coordinates from dropped files via exifr,
 * calls onboarding.initProject to create a real DB project,
 * then transitions to /project/[id] for the production map.
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
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

type DropState = "idle" | "dragging" | "analyzing" | "locating" | "creating";

const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "video/mp4",
  "video/quicktime", // .mov
]);
const ACCEPTED_EXT = new Set([".jpg", ".jpeg", ".png", ".tiff", ".tif", ".mp4", ".mov"]);

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_MIME.has(file.type)) return true;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXT.has(ext);
}

/**
 * Robust GPS extraction — tries multiple exifr strategies.
 * Returns { lat, lng } in decimal degrees, or null.
 */
async function extractGPS(
  files: File[]
): Promise<{ lat: number; lng: number } | null> {
  for (const file of files) {
    // Skip video files — exifr can't read MP4 EXIF reliably
    if (file.type.startsWith("video/")) continue;

    try {
      // Strategy 1: dedicated GPS parse (fastest)
      const gps = await exifr.gps(file);
      if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
        return { lat: gps.latitude, lng: gps.longitude };
      }
    } catch { /* unsupported format — try next strategy */ }

    try {
      // Strategy 2: full EXIF parse — catches non-standard GPS blocks
      const exif = await exifr.parse(file, {
        gps: true,
        tiff: true,
        exif: true,
        translateKeys: true,
        translateValues: true,
      });
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

export default function Create() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [dropState, setDropState] = useState<DropState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Analyzing...");
  const [shake, setShake] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing">("uploading");
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadPhaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initProject = trpc.onboarding.initProject.useMutation({
    onError: (error) => {
      // Suppress FORBIDDEN errors from being logged globally
      // These are expected for authenticated users and handled locally
      const errorMsg = error.message || String(error);
      if (errorMsg.includes('FORBIDDEN') || errorMsg.includes('Authenticated users cannot')) {
        // Mark error as handled so global handler doesn't process it
        (error as any).__handled = true;
      }
    },
  });
  const uploadMedia = trpc.onboarding.uploadMedia.useMutation();
  const utils = trpc.useUtils();

  // Progress bar animation
  useEffect(() => {
    if (dropState !== "analyzing" && dropState !== "locating" && dropState !== "creating") return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(interval); return 95; }
        const increment = p < 60 ? 3 : p < 80 ? 1.5 : 0.5;
        return Math.min(p + increment, 95);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [dropState]);

  const triggerShake = useCallback(() => {
    setShake(true);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => setShake(false), 600);
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
    // Validate all files before processing
    const invalid = files.filter((f) => !isAcceptedFile(f));
    if (invalid.length > 0) {
      triggerShake();
      return;
    }

    setDropState("analyzing");
    setStatusText("Analyzing...");

    // Extract GPS — must complete before initProject call
    const coords = await extractGPS(files);

    if (coords) {
      sessionStorage.setItem(
        "mapit_fly_coords",
        JSON.stringify({ lat: coords.lat, lng: coords.lng })
      );
      setStatusText("Located.");
      setDropState("locating");
    } else {
      sessionStorage.removeItem("mapit_fly_coords");
      // Quiet Jobsian toast — no GPS found
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

    // Get project name from Act 1
    const projectName = sessionStorage.getItem("mapit_project_name") || "New Project";

    setStatusText("Creating...");
    setDropState("creating");

    try {
      const result = await initProject.mutateAsync({
        name: projectName,
        lat: coords?.lat,
        lng: coords?.lng,
      });

      // Store trial info for the Prestige modal
      sessionStorage.setItem("mapit_project_id", String(result.projectId));
      sessionStorage.setItem("mapit_project_name", projectName);
      sessionStorage.setItem("mapit_trial_expires", result.trialExpiresAt);

      // Upload each file as a media record (fire-and-forget for speed,
      // but await at least the first one so the map has a pin on arrival)
      setStatusText("Uploading...");
      setUploadPhase("uploading");
      
      // Start 3-second timer to transition from Uploading to Processing
      if (uploadPhaseTimerRef.current) clearTimeout(uploadPhaseTimerRef.current);
      uploadPhaseTimerRef.current = setTimeout(() => {
        setUploadPhase("processing");
        setStatusText("Processing...");
      }, 3000);
      
      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          await uploadMedia.mutateAsync({
            projectId: result.projectId,
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
            fileData: base64,
          });
        } catch (uploadErr) {
          console.error('[Create] Failed to upload media:', file.name, uploadErr);
          // Non-blocking — project still created, just no media pin
        }
      }

      // Invalidate media.list cache so the map fetches fresh data on arrival
      await utils.media.list.invalidate({ projectId: result.projectId });

      // Complete progress bar and navigate
      setProgress(100);
      setTimeout(() => setLocation(`/project/${result.projectId}/map`), 400);
    } catch (err) {
      // Check if error is FORBIDDEN (authenticated user trying to create trial project)
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isForbidden = errorMsg.includes('FORBIDDEN') || errorMsg.includes('Authenticated users cannot');
      
      if (isForbidden) {
        // Suppress error modal and show high-end Jobsian toast
        console.log("[Create] Authenticated user attempted trial project creation, redirecting to dashboard");
        const userName = user?.name?.split(' ')[0] || 'there';
        toast(`Welcome back, ${userName}! We've saved your spot. Redirecting to your MAPIT dashboard...`, {
          duration: 6000,
          position: "top-center",
          style: {
            background: "rgba(255, 255, 255, 0.95)",
            color: "rgba(10, 10, 10, 0.9)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            borderRadius: "16px",
            fontSize: "16px",
            fontWeight: "500",
            fontFamily: "Inter, sans-serif",
            backdropFilter: "blur(30px)",
            padding: "20px 28px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1)",
            letterSpacing: "-0.3px",
          } as React.CSSProperties,
        });
        // Redirect to authenticated user dashboard after toast is visible
        setTimeout(() => setLocation("/dashboard"), 2000);
      } else {
        console.error("[Create] Failed to create project:", err);
        setProgress(100);
        setTimeout(() => setLocation("/dashboard"), 400);
      }
    }
  }, [initProject, uploadMedia, setLocation, triggerShake, user]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dropState === "idle") setDropState("dragging");
  }, [dropState]);

  const handleDragLeave = useCallback(() => {
    setDropState((s) => (s === "dragging" ? "idle" : s));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
      else setDropState("idle");
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      // Reset upload phase on new file selection
      setUploadPhase("uploading");
      if (uploadPhaseTimerRef.current) clearTimeout(uploadPhaseTimerRef.current);
      if (files.length > 0) processFiles(files);
    },
    [processFiles]
  );

  const isDragging = dropState === "dragging";
  const isProcessing = dropState === "analyzing" || dropState === "locating" || dropState === "creating";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col relative overflow-hidden">
      {/* ─── Top progress bar ─── */}
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

      {/* ─── Back arrow ─── */}
      <div className="absolute top-4 left-4 z-40">
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/60 hover:text-white" />
        </button>
      </div>

      {/* ─── Main drop zone ─── */}
      <div
        className={`flex-1 flex items-center justify-center px-4 transition-all ${
          isDragging ? "bg-white/5" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full border-2 border-[#00C853]/30 border-t-[#00C853] animate-spin mx-auto mb-6" />
              <p className="text-xl font-medium text-white mb-2">{statusText}</p>
              <p className="text-sm text-white/40">
                {uploadPhase === "processing" ? "Extracting GPS and generating map..." : ""}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`text-center transition-all ${shake ? "animate-pulse" : ""}`}
            >
              <div className="mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00C853]/20 to-[#00C853]/5 flex items-center justify-center mx-auto mb-6 border border-[#00C853]/20">
                  <svg
                    className="w-10 h-10 text-[#00C853]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Drop your drone photos</h1>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                We'll extract GPS coordinates, generate an interactive map, and organize everything for you.
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  multiple
                  accept={Array.from(ACCEPTED_EXT).join(",")}
                  onChange={handleFileInput}
                  className="hidden"
                />
                <span className="inline-block px-8 py-3 bg-[#00C853] text-black font-semibold rounded-full hover:bg-[#00C853]/90 transition-colors cursor-pointer">
                  Select Files
                </span>
              </label>
              <p className="text-xs text-white/40 mt-6">
                Supports JPEG, PNG, TIFF, MP4, MOV
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
