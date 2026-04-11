/**
 * MAPIT — /create Drop Zone
 * Extracts GPS coordinates from dropped files via exifr,
 * stores them in sessionStorage, then transitions to /map.
 */

import { useCallback, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr";

type DropState = "idle" | "dragging" | "analyzing" | "locating";

/** Try to extract GPS from the first file that has it. */
async function extractGPS(
  files: File[]
): Promise<{ lat: number; lng: number } | null> {
  for (const file of files) {
    try {
      const gps = await exifr.gps(file);
      if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
        return { lat: gps.latitude, lng: gps.longitude };
      }
    } catch {
      // file has no EXIF or unsupported format — try next
    }
  }
  return null;
}

export default function Create() {
  const [, setLocation] = useLocation();
  const [dropState, setDropState] = useState<DropState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Analyzing...");

  // Progress bar animation → redirect to /map
  useEffect(() => {
    if (dropState !== "analyzing" && dropState !== "locating") return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setLocation("/map"), 200);
          return 100;
        }
        const increment = p < 70 ? 3 : p < 90 ? 1 : 0.4;
        return Math.min(p + increment, 100);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [dropState, setLocation]);

  const processFiles = useCallback(async (files: File[]) => {
    setDropState("analyzing");
    setStatusText("Analyzing...");

    // Try GPS extraction in parallel with the progress animation
    const coords = await extractGPS(files);

    if (coords) {
      // Store for MapView to consume
      sessionStorage.setItem(
        "mapit_fly_coords",
        JSON.stringify({ lat: coords.lat, lng: coords.lng })
      );
      setStatusText("Located.");
      setDropState("locating");
    } else {
      // No GPS found — clear any stale coords, fly to default
      sessionStorage.removeItem("mapit_fly_coords");
      setDropState("analyzing");
    }
  }, []);

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
      if (files.length > 0) processFiles(files);
    },
    [processFiles]
  );

  const isDragging = dropState === "dragging";
  const isProcessing = dropState === "analyzing" || dropState === "locating";

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
      <div className="absolute top-8 left-8 z-20">
        <button
          onClick={() => setLocation("/welcome")}
          className="flex items-center gap-2 text-white/30 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* ─── Drop Zone ─── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.label
          htmlFor="file-input"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`
            relative w-full max-w-3xl aspect-video flex flex-col items-center justify-center
            border rounded-3xl select-none transition-all duration-300
            ${isProcessing ? "cursor-default" : "cursor-pointer"}
            ${isDragging
              ? "border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_40px_rgba(0,200,83,0.08)]"
              : "border-white/5 bg-transparent hover:border-white/10"
            }
          `}
        >
          {/* Metallic hook */}
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.p
                key="processing"
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

          {/* Instruction */}
          <AnimatePresence>
            {!isProcessing && (
              <motion.div
                key="instructions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center pointer-events-none"
              >
                <p className="text-white/40 text-base leading-relaxed">
                  Drag your drone imagery or .mp4 files here to begin.
                </p>
                <p className="mt-4 text-white/15 text-xs tracking-widest uppercase">
                  or click to browse
                </p>
                <p className="mt-3 text-white/15 text-[11px] tracking-wide">
                  JPG · PNG · TIFF · MP4 · MOV
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invisible file input */}
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*,video/mp4,.mp4,.mov,.avi,.jpg,.jpeg,.png,.tiff,.tif"
            className="sr-only"
            onChange={handleFileInput}
            disabled={isProcessing}
          />
        </motion.label>
      </div>
    </div>
  );
}
