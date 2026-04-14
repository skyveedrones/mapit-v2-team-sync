/**
 * MAPIT — /create  (7-Step Jobsian Real-Map Flow)
 *
 * Step 1  ENTRY       — Home CTA → /welcome → /name (project name stored in sessionStorage)
 * Step 2  DROP        — Gradient "DROP" hero, dashed execution ring, hero video behind
 * Step 3  UPLOADING   — Gradient "UPLOADING" text, thin pulsed dashed execution line
 * Step 4  PROCESSING  — Gradient "PROCESSING" text (3s after drop), real Mapbox mounts behind
 * Step 5  REAL REVEAL — Uploader fades to opacity-0, map.flyTo fires to GPS coords
 * Step 6  MAGIC A     — Frosted-glass Marker Tooltip (handled in ProjectMap.tsx)
 * Step 7  MAGIC B     — Frosted-glass Sidebar guide (handled in ProjectMap.tsx)
 *
 * NO AUTH GUARDS on this page. The only redirect is at the Triumph modal (Step 7).
 */
import { useCallback, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ── Types ─────────────────────────────────────────────────────────────────────
type Stage = "drop" | "uploading" | "processing" | "reveal";

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCEPTED_MIME = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/tiff",
  "video/mp4", "video/quicktime",
]);
const ACCEPTED_EXT = new Set([".jpg", ".jpeg", ".png", ".tiff", ".tif", ".mp4", ".mov"]);

const GRADIENT_STYLE: React.CSSProperties = {
  backgroundImage: "linear-gradient(to bottom, #ffffff, #cbd5e1, #94a3b8)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

// ── GPS extraction ────────────────────────────────────────────────────────────
async function extractGPS(files: File[]): Promise<{ lat: number; lng: number } | null> {
  for (const file of files) {
    if (file.type.startsWith("video/")) continue;
    try {
      const gps = await exifr.gps(file);
      if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number")
        return { lat: gps.latitude, lng: gps.longitude };
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

function isAcceptedFile(f: File): boolean {
  if (ACCEPTED_MIME.has(f.type)) return true;
  const ext = "." + f.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXT.has(ext);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Create() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [stage, setStage] = useState<Stage>("drop");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploaderOpacity, setUploaderOpacity] = useState(1);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapInitialized = useRef(false);

  const initProject = trpc.onboarding.initProject.useMutation({
    onError: (error) => {
      const msg = error.message || "";
      if (msg.includes("FORBIDDEN") || msg.includes("Authenticated users cannot"))
        (error as any).__handled = true;
    },
  });
  const uploadMedia = trpc.onboarding.uploadMedia.useMutation();
  const utils = trpc.useUtils();

  // ── Progress bar animation ────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "uploading" && stage !== "processing") {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }
    if (stage === "uploading") {
      setUploadPct(0);
      progressInterval.current = setInterval(() => {
        setUploadPct((p) => {
          if (p >= 95) { clearInterval(progressInterval.current!); return 95; }
          return Math.min(p + (p < 60 ? 3 : p < 80 ? 1.5 : 0.5), 95);
        });
      }, 40);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [stage]);

  // ── Initialize Mapbox when processing starts ──────────────────────────────
  useEffect(() => {
    if (stage !== "processing" || mapInitialized.current || !mapContainerRef.current) return;
    mapInitialized.current = true;

    const token = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
    if (token) mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-98.5795, 39.8283], // US center default
      zoom: 3,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      logoPosition: "bottom-left",
    });

    mapRef.current = map;

    map.on("load", () => {
      // Try to fly to stored GPS coords
      const stored = sessionStorage.getItem("mapit_fly_coords");
      if (stored) {
        try {
          const { lat, lng } = JSON.parse(stored);
          if (typeof lat === "number" && typeof lng === "number") {
            // Fade uploader out, reveal map
            setUploaderOpacity(0);
            setTimeout(() => setStage("reveal"), 700);

            map.flyTo({
              center: [lng, lat],
              zoom: 17,
              pitch: 50,
              bearing: -10,
              duration: 4000,
              essential: true,
            });

            // Drop emerald marker after fly lands
            setTimeout(() => {
              if (markerRef.current) markerRef.current.remove();
              const el = document.createElement("div");
              el.style.cssText = `
                width: 14px; height: 14px;
                background: #10b981;
                border: 2px solid #fff;
                border-radius: 50%;
                box-shadow: 0 0 0 4px rgba(16,185,129,0.3), 0 2px 8px rgba(0,0,0,0.4);
              `;
              markerRef.current = new mapboxgl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(map);
            }, 4200);
          }
        } catch { /* ignore */ }
      } else {
        // No GPS — fade uploader, show world view
        setUploaderOpacity(0);
        setTimeout(() => setStage("reveal"), 700);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapInitialized.current = false;
    };
  }, [stage]);

  // ── Navigate to real project map after reveal ─────────────────────────────
  useEffect(() => {
    if (stage !== "reveal") return;
    // Wait for map animation, then navigate to the real project map
    const timer = setTimeout(() => {
      const projectId = sessionStorage.getItem("mapit_project_id");
      if (projectId) {
        setLocation(`/project/${projectId}/map`);
      }
    }, 5500); // 4s fly + 1.5s buffer for Magic Windows to initialize
    return () => clearTimeout(timer);
  }, [stage, setLocation]);

  // ── Core file processor ───────────────────────────────────────────────────
  const processFiles = useCallback(async (files: File[]) => {
    const invalid = files.filter((f) => !isAcceptedFile(f));
    if (invalid.length > 0) {
      toast("Format not supported. Use drone imagery or video.", {
        duration: 3000, position: "bottom-center",
        style: {
          background: "rgba(10,10,10,0.92)", color: "rgba(255,255,255,0.75)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: "14px",
          fontSize: "13px", fontFamily: "Inter, sans-serif",
          backdropFilter: "blur(20px)", padding: "12px 20px",
        },
      });
      return;
    }

    // Step 3: UPLOADING
    setStage("uploading");

    // Extract GPS immediately in background
    const coordsPromise = extractGPS(files);

    // Step 4: PROCESSING after 3 seconds
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    flipTimerRef.current = setTimeout(() => setStage("processing"), 3000);

    const coords = await coordsPromise;
    if (coords) {
      sessionStorage.setItem("mapit_fly_coords", JSON.stringify({ lat: coords.lat, lng: coords.lng }));
    } else {
      sessionStorage.removeItem("mapit_fly_coords");
      toast("No GPS found in files. Showing world view.", {
        duration: 3000,
        style: {
          background: "#111", color: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "13px", fontFamily: "Inter, sans-serif",
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

      // Upload files in background
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
        } catch (e) {
          console.error("[Create] Upload failed:", file.name, e);
        }
      }

      setUploadPct(100);
      await utils.media.list.invalidate({ projectId: result.projectId });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isForbidden = msg.includes("FORBIDDEN") || msg.includes("Authenticated users cannot");

      if (isForbidden) {
        // Authenticated user — show Jobsian message, redirect to sign in
        // Still show the map reveal first, then redirect
        const firstName = user?.name?.split(" ")[0] || "there";
        // Let the processing/reveal continue visually, then show toast + redirect
        setTimeout(() => {
          toast(`Thanks for trying the mapping demo, ${firstName}. Please sign in to your account.`, {
            duration: 7000, position: "top-center",
            style: {
              background: "rgba(255,255,255,0.95)", color: "rgba(10,10,10,0.9)",
              border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px",
              fontSize: "16px", fontWeight: "500", fontFamily: "Inter, sans-serif",
              backdropFilter: "blur(30px)", padding: "20px 28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)", letterSpacing: "-0.01em",
            },
          });
          setTimeout(() => setLocation("/dashboard"), 3000);
        }, 4000); // Show after map reveal starts
      } else {
        toast("Something went wrong. Please try again.", {
          duration: 4000,
          style: { background: "#111", color: "rgba(255,255,255,0.7)", fontSize: "13px" },
        });
        setStage("drop");
      }
    }
    // Founder Fix: isAuthenticated in dep array prevents stale closure
  }, [initProject, uploadMedia, utils, setLocation, user, isAuthenticated]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', system-ui, sans-serif" }}
      onDragOver={stage === "drop" ? handleDragOver : undefined}
      onDragLeave={stage === "drop" ? handleDragLeave : undefined}
      onDrop={stage === "drop" ? handleDrop : undefined}
    >
      {/* ── Hero loop video — always behind everything ── */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: stage === "reveal" ? 0 : 0.18, transition: "opacity 1.2s ease" }}
      >
        <source
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/hero_background_new_fe49dcb4.mp4"
          type="video/mp4"
        />
      </video>

      {/* ── Mapbox container — mounts at processing stage ── */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: stage === "processing" || stage === "reveal" ? 1 : 0,
          transition: "opacity 1.4s ease",
          zIndex: 1,
        }}
      />

      {/* ── Uploader overlay — fades out during reveal ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          opacity: uploaderOpacity,
          transition: "opacity 0.7s ease",
          zIndex: 10,
          pointerEvents: uploaderOpacity < 0.1 ? "none" : "auto",
        }}
      >
        {/* Back arrow */}
        <button
          onClick={() => setLocation("/name")}
          className="absolute top-5 left-5 p-2 rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.28)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.70)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">

          {/* ── STEP 2: DROP ── */}
          {stage === "drop" && (
            <motion.div
              key="drop"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center"
            >
              {/* Gradient "DROP" hero */}
              <h1
                className="font-bold tracking-tighter leading-none mb-10 select-none"
                style={{
                  ...GRADIENT_STYLE,
                  fontSize: "clamp(5rem, 18vw, 10rem)",
                }}
              >
                DROP
              </h1>

              {/* Dashed execution ring / drop zone */}
              <label
                className="flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                style={{
                  width: "clamp(240px, 36vw, 380px)",
                  height: "clamp(160px, 22vw, 260px)",
                  border: `1.5px dashed ${isDragging ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)"}`,
                  borderRadius: "20px",
                  background: isDragging ? "rgba(255,255,255,0.03)" : "transparent",
                  boxShadow: isDragging ? "0 0 40px rgba(255,255,255,0.04) inset" : "none",
                }}
              >
                <input
                  type="file"
                  multiple
                  accept={Array.from(ACCEPTED_EXT).join(",")}
                  onChange={handleFileInput}
                  className="hidden"
                />
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.22)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {isDragging ? "Release to map" : "Drop drone photos here"}
                </span>
              </label>
            </motion.div>
          )}

          {/* ── STEP 3: UPLOADING ── */}
          {stage === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center"
              style={{ width: "clamp(260px, 40vw, 420px)" }}
            >
              <h1
                className="font-bold tracking-tighter leading-none mb-10 select-none"
                style={{
                  ...GRADIENT_STYLE,
                  fontSize: "clamp(3.5rem, 12vw, 7rem)",
                }}
              >
                UPLOADING
              </h1>
              {/* Thin progress bar */}
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: "1px",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.55)",
                    borderRadius: "1px",
                    width: `${uploadPct}%`,
                  }}
                  transition={{ ease: "linear" }}
                />
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: PROCESSING ── */}
          {(stage === "processing" || stage === "reveal") && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: stage === "reveal" ? 0 : 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: stage === "reveal" ? 0.7 : 0.35 }}
              className="flex flex-col items-center"
              style={{ width: "clamp(260px, 40vw, 420px)" }}
            >
              <h1
                className="font-bold tracking-tighter leading-none mb-10 select-none"
                style={{
                  ...GRADIENT_STYLE,
                  fontSize: "clamp(3rem, 11vw, 6.5rem)",
                }}
              >
                PROCESSING
              </h1>
              {/* Pulsing execution line */}
              <motion.div
                style={{
                  width: "100%",
                  height: "1px",
                  borderRadius: "1px",
                  background: "rgba(255,255,255,0.45)",
                  boxShadow: "0 0 8px 2px rgba(255,255,255,0.12)",
                }}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
