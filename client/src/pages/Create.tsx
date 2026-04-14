/**
 * MAPIT — /create Drop Zone
 * 3-state Jobsian blueprint:
 *   1. DROP     — dashed box, cloud icon, "Drop photos here"
 *   2. UPLOADING — thin horizontal progress bar + "Uploading... XX%"
 *   3. PROCESSING — pulsing glow bar + "Building your map..."
 */
import { useCallback, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CloudUpload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

type Stage = "drop" | "uploading" | "processing";

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
      const exif = await exifr.parse(file, {
        gps: true, tiff: true, exif: true,
        translateKeys: true, translateValues: true,
      });
      if (exif) {
        const lat = exif.latitude ?? exif.GPSLatitude;
        const lng = exif.longitude ?? exif.GPSLongitude;
        if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
      }
    } catch { /* ignore */ }
  }
  return null;
}

export default function Create() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("drop");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initProject = trpc.onboarding.initProject.useMutation({
    onError: (error) => {
      const msg = error.message || String(error);
      if (msg.includes("FORBIDDEN") || msg.includes("Authenticated users cannot")) {
        (error as any).__handled = true;
      }
    },
  });
  const uploadMedia = trpc.onboarding.uploadMedia.useMutation();
  const utils = trpc.useUtils();

  // Animate upload percentage 0 → 95 while in uploading stage
  useEffect(() => {
    if (stage !== "uploading") {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }
    setUploadPct(0);
    progressIntervalRef.current = setInterval(() => {
      setUploadPct((p) => {
        if (p >= 95) { clearInterval(progressIntervalRef.current!); return 95; }
        const inc = p < 60 ? 3 : p < 80 ? 1.5 : 0.5;
        return Math.min(p + inc, 95);
      });
    }, 40);
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [stage]);

  const processFiles = useCallback(async (files: File[]) => {
    const invalid = files.filter((f) => !isAcceptedFile(f));
    if (invalid.length > 0) {
      toast("Format not supported. Use drone imagery or video.", {
        duration: 3000,
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
        },
      });
      return;
    }

    // Transition to UPLOADING
    setStage("uploading");

    // Extract GPS while progress bar runs
    const coords = await extractGPS(files);
    if (coords) {
      sessionStorage.setItem("mapit_fly_coords", JSON.stringify({ lat: coords.lat, lng: coords.lng }));
    } else {
      sessionStorage.removeItem("mapit_fly_coords");
      toast("No location found in file. Defaulting to world view.", {
        duration: 3000,
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

      // Transition to PROCESSING
      setStage("processing");

      // Upload files
      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
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
      setUploadPct(100);
      setTimeout(() => setLocation(`/project/${result.projectId}/map`), 400);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isForbidden = errorMsg.includes("FORBIDDEN") || errorMsg.includes("Authenticated users cannot");

      if (isForbidden) {
        const userName = user?.name?.split(" ")[0] || "there";
        toast(`Welcome back, ${userName}! We've saved your spot. Redirecting to your MAPIT dashboard...`, {
          duration: 6000,
          position: "top-center",
          style: {
            background: "rgba(255,255,255,0.95)",
            color: "rgba(10,10,10,0.9)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "16px",
            fontSize: "16px",
            fontWeight: "500",
            fontFamily: "Inter, sans-serif",
            backdropFilter: "blur(30px)",
            padding: "20px 28px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            letterSpacing: "-0.01em",
          },
        });
        setTimeout(() => setLocation("/dashboard"), 2000);
      } else {
        toast("Something went wrong. Please try again.", {
          duration: 4000,
          style: { background: "#111", color: "rgba(255,255,255,0.7)", fontSize: "13px" },
        });
        setStage("drop");
      }
    }
  }, [initProject, uploadMedia, utils, setLocation, user]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', system-ui, sans-serif" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Back arrow */}
      <button
        onClick={() => setLocation("/")}
        className="absolute top-5 left-5 p-2 rounded-lg transition-colors"
        style={{ color: "rgba(255,255,255,0.30)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.30)")}
        aria-label="Back to home"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <AnimatePresence mode="wait">

        {/* ── STATE 1: DROP ── */}
        {stage === "drop" && (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <label
              className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
              style={{
                width: "clamp(260px, 40vw, 400px)",
                height: "clamp(200px, 28vw, 300px)",
                border: `2px dashed ${isDragging ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.15)"}`,
                borderRadius: "20px",
                background: isDragging ? "rgba(255,255,255,0.03)" : "transparent",
              }}
            >
              <input
                type="file"
                multiple
                accept={Array.from(ACCEPTED_EXT).join(",")}
                onChange={handleFileInput}
                className="hidden"
              />
              <CloudUpload
                className="mb-4"
                style={{ width: 32, height: 32, color: "rgba(255,255,255,0.25)" }}
                strokeWidth={1.5}
              />
              <span
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.30)",
                  letterSpacing: "-0.01em",
                }}
              >
                Drop photos here
              </span>
            </label>
          </motion.div>
        )}

        {/* ── STATE 2: UPLOADING ── */}
        {stage === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
            style={{ width: "clamp(260px, 40vw, 400px)" }}
          >
            <p
              className="mb-4 text-center tabular-nums"
              style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.40)", letterSpacing: "-0.01em" }}
            >
              Uploading... {Math.round(uploadPct)}%
            </p>
            <div
              style={{
                width: "100%",
                height: "1px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <motion.div
                style={{
                  height: "100%",
                  background: "rgba(255,255,255,0.65)",
                  borderRadius: "1px",
                  width: `${uploadPct}%`,
                }}
                transition={{ ease: "linear" }}
              />
            </div>
          </motion.div>
        )}

        {/* ── STATE 3: PROCESSING ── */}
        {stage === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
            style={{ width: "clamp(260px, 40vw, 400px)" }}
          >
            <p
              className="mb-4 text-center"
              style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.40)", letterSpacing: "-0.01em" }}
            >
              Building your map...
            </p>
            <div style={{ width: "100%", height: "1px", borderRadius: "1px", overflow: "visible" }}>
              <motion.div
                style={{
                  height: "1px",
                  width: "100%",
                  borderRadius: "1px",
                  background: "rgba(255,255,255,0.50)",
                  boxShadow: "0 0 6px 2px rgba(255,255,255,0.18)",
                }}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
