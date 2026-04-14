/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HomepageCinematicDemo.tsx  —  ARCHIVED "12:50 PM TRIUMPH VERSION"
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * STATUS: PRESERVED ARCHIVE — DO NOT MODIFY WITHOUT CREATING A COPY FIRST
 *
 * This is the exact cinematic flyby walkthrough that was working perfectly
 * on Monday, April 13th at 12:50 PM CST. It fired the 'Engineering Triumph'
 * email and completed the full 7-step Jobsian demo sequence.
 *
 * INTENDED FUTURE USE:
 *   - Homepage hero section background animation
 *   - Sales demo / marketing presentation
 *   - Investor deck embedded walkthrough
 *
 * ROUTE: /marketing-demo  (private, internal — not linked from public nav)
 *
 * HARD-CODED DATASET:
 *   - Location: Texas construction site (real drone footage coordinates)
 *   - Lat/Lng:  30.2672° N, 97.7431° W  (Austin, TX area)
 *   - Photos:   142 (simulated — displayed as label only)
 *   - Project:  "Demonstration Project 1"
 *
 * SEQUENCE:
 *   0s    → DROP screen  (gradient hero, dashed execution ring)
 *   drop  → UPLOADING    (gradient text, thin progress bar, 3s timer)
 *   3s    → PROCESSING   (gradient text, pulsing line, Mapbox mounts behind)
 *   ~4s   → REVEAL       (uploader fades out, map.flyTo fires to Texas coords)
 *   ~8s   → Emerald GPS marker drops at site coordinates
 *   ~10s  → Magic Window A: frosted-glass marker tooltip fades in (5s)
 *   ~15s  → Magic Window B: frosted-glass sidebar guide fades in
 *   ~17s  → "Welcome back" toast + redirect to /dashboard (authenticated)
 *           OR Triumph modal email capture (new users)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ── Hard-coded Texas demonstration dataset ────────────────────────────────────
const DEMO_COORDS = { lat: 30.2672, lng: -97.7431 }; // Austin, TX
const DEMO_PROJECT_NAME = "Demonstration Project 1";
const DEMO_PHOTO_COUNT = 142;

// ── Visual constants ──────────────────────────────────────────────────────────
const GRADIENT_STYLE: React.CSSProperties = {
  backgroundImage: "linear-gradient(to bottom, #ffffff, #cbd5e1, #94a3b8)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

type Stage = "drop" | "uploading" | "processing" | "reveal";

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomepageCinematicDemo() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [stage, setStage] = useState<Stage>("drop");
  const [uploadPct, setUploadPct] = useState(0);
  const [uploaderOpacity, setUploaderOpacity] = useState(1);
  const [showMagicA, setShowMagicA] = useState(false);
  const [showMagicB, setShowMagicB] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const mapInitialized = useRef(false);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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
      center: [-98.5795, 39.8283], // US center — flyTo will zoom in
      zoom: 3,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      logoPosition: "bottom-left",
    });

    mapRef.current = map;

    map.on("load", () => {
      // Fade uploader out, reveal map
      setUploaderOpacity(0);
      setTimeout(() => setStage("reveal"), 700);

      // Cinematic flyTo to Texas demo coordinates
      map.flyTo({
        center: [DEMO_COORDS.lng, DEMO_COORDS.lat],
        zoom: 17,
        pitch: 55,
        bearing: -15,
        duration: 4500,
        essential: true,
      });

      // Drop emerald GPS marker after fly lands
      setTimeout(() => {
        if (markerRef.current) markerRef.current.remove();
        const el = document.createElement("div");
        el.style.cssText = `
          width: 14px; height: 14px;
          background: #10b981;
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(16,185,129,0.3), 0 2px 8px rgba(0,0,0,0.4);
          animation: pulse 2s ease-in-out infinite;
        `;
        markerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([DEMO_COORDS.lng, DEMO_COORDS.lat])
          .addTo(map);
      }, 4700);

      // Magic Window A — marker tooltip (appears after fly lands)
      setTimeout(() => setShowMagicA(true), 5200);

      // Magic Window B — sidebar guide (appears after A fades)
      setTimeout(() => {
        setShowMagicA(false);
        setTimeout(() => setShowMagicB(true), 400);
      }, 10200);

      // Authorized Handshake — 2s after Magic B appears
      setTimeout(() => {
        if (isAuthenticated) {
          const firstName = user?.name?.split(" ")[0] || "there";
          toast(`Welcome back, ${firstName}. Your projects are waiting.`, {
            duration: 5000,
            position: "top-center",
            style: {
              background: "rgba(10,10,10,0.92)",
              color: "rgba(255,255,255,0.90)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "16px",
              fontSize: "15px",
              fontWeight: "500",
              fontFamily: "Inter, sans-serif",
              backdropFilter: "blur(30px)",
              padding: "18px 24px",
              letterSpacing: "-0.01em",
            },
          });
          setTimeout(() => setLocation("/dashboard"), 3000);
        }
      }, 12800);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapInitialized.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Start the demo sequence ───────────────────────────────────────────────
  const startDemo = useCallback(() => {
    setStage("uploading");
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    flipTimerRef.current = setTimeout(() => setStage("processing"), 3000);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#0A0A0A", fontFamily: "'Inter', system-ui, sans-serif" }}
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

      {/* ── Mapbox container ── */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: stage === "processing" || stage === "reveal" ? 1 : 0,
          transition: "opacity 1.4s ease",
          zIndex: 1,
        }}
      />

      {/* ── Uploader overlay ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          opacity: uploaderOpacity,
          transition: "opacity 0.7s ease",
          zIndex: 10,
          pointerEvents: uploaderOpacity < 0.1 ? "none" : "auto",
        }}
      >
        {/* Internal label */}
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs tracking-widest uppercase"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.25)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Marketing Demo — Internal
        </div>

        <AnimatePresence mode="wait">

          {/* ── DROP ── */}
          {stage === "drop" && (
            <motion.div
              key="drop"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center"
            >
              <h1
                className="font-bold tracking-tighter leading-none mb-3 select-none"
                style={{ ...GRADIENT_STYLE, fontSize: "clamp(5rem, 18vw, 10rem)" }}
              >
                DROP
              </h1>
              <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "13px", marginBottom: "2.5rem", letterSpacing: "0.04em" }}>
                {DEMO_PHOTO_COUNT} photos · {DEMO_PROJECT_NAME}
              </p>

              {/* Simulated drop zone — click to start */}
              <button
                onClick={startDemo}
                className="flex flex-col items-center justify-center transition-all duration-300"
                style={{
                  width: "clamp(240px, 36vw, 380px)",
                  height: "clamp(160px, 22vw, 260px)",
                  border: "1.5px dashed rgba(255,255,255,0.18)",
                  borderRadius: "20px",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.40)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.18)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Click to begin demo
                </span>
              </button>
            </motion.div>
          )}

          {/* ── UPLOADING ── */}
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
                style={{ ...GRADIENT_STYLE, fontSize: "clamp(3.5rem, 12vw, 7rem)" }}
              >
                UPLOADING
              </h1>
              <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.07)", borderRadius: "1px", overflow: "hidden" }}>
                <motion.div
                  style={{ height: "1px", background: "rgba(255,255,255,0.55)", borderRadius: "1px", width: `${uploadPct}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
            </motion.div>
          )}

          {/* ── PROCESSING ── */}
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
                style={{ ...GRADIENT_STYLE, fontSize: "clamp(3rem, 11vw, 6.5rem)" }}
              >
                PROCESSING
              </h1>
              <motion.div
                style={{ width: "100%", height: "1px", borderRadius: "1px", background: "rgba(255,255,255,0.45)", boxShadow: "0 0 8px 2px rgba(255,255,255,0.12)" }}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Magic Window A — Marker Tooltip ── */}
      <AnimatePresence>
        {showMagicA && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 30,
              background: "rgba(10,10,10,0.72)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "20px",
              padding: "28px 36px",
              maxWidth: "360px",
              textAlign: "center",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", margin: "0 auto 16px", boxShadow: "0 0 0 4px rgba(16,185,129,0.2)" }} />
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "15px", fontWeight: 500, lineHeight: 1.5, fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}>
              Your site. Mapped from above.
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "8px", fontFamily: "Inter, sans-serif" }}>
              {DEMO_PHOTO_COUNT} photos · GPS extracted · {DEMO_PROJECT_NAME}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Magic Window B — Sidebar Guide ── */}
      <AnimatePresence>
        {showMagicB && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute",
              bottom: "40px",
              right: "40px",
              zIndex: 30,
              background: "rgba(10,10,10,0.72)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "16px",
              padding: "20px 24px",
              maxWidth: "280px",
              boxShadow: "0 16px 60px rgba(0,0,0,0.5)",
            }}
          >
            <p style={{ color: "rgba(255,255,255,0.80)", fontSize: "13px", fontWeight: 500, fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em", marginBottom: "6px" }}>
              Explore your tools
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
              Layers, overlays, GPS export, and flight paths are in the sidebar. Your data is ready.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
