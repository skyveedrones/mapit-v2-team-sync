/**
 * MAPIT — /map  (Jobsian Pro Map HUD)
 * Full-bleed Mapbox dark satellite map.
 * Cinematic fly-in from world altitude → project location.
 * Glassmorphic floating HUD — no sidebars, no chrome.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Layers, Ruler, Share2, ArrowLeft, X } from "lucide-react";
import MapLayerTree from "@/components/MapLayerTree";

// ─── Map style: dark satellite with no labels for maximum contrast ───────────
const DARK_SATELLITE = "mapbox://styles/mapbox/satellite-v9";

// ─── Default project location (used when no GPS is found in dropped files) ────
const DEFAULT_LNG = -97.7431;
const DEFAULT_LAT = 30.2672; // Austin, TX — fallback only

/** Read GPS coords stored by /create after EXIF extraction. */
function getDropCoords(): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem("mapit_fly_coords");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed;
    }
  } catch {
    // malformed — ignore
  }
  return null;
}

export default function MapView() {
  const [, setLocation] = useLocation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeHud, setActiveHud] = useState<"layers" | "measure" | "share" | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  // Trigger page fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Initialize Mapbox
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !mapContainerRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: DARK_SATELLITE,
      center: [0, 20],       // Start at world view
      zoom: 1.5,             // High altitude
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      logoPosition: "bottom-right",
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapReady(true);

      // Use GPS coords from dropped files, or fall back to default
      const coords = getDropCoords();
      const center: [number, number] = coords
        ? [coords.lng, coords.lat]
        : [DEFAULT_LNG, DEFAULT_LAT];

      // Clear after use so a page refresh doesn't reuse stale coords
      sessionStorage.removeItem("mapit_fly_coords");

      // Cinematic fly-in: world altitude → exact project site
      map.flyTo({
        center,
        zoom: 17,
        pitch: 50,
        bearing: -15,
        duration: 4000,
        essential: true,
        easing: (t: number) => 1 - Math.pow(1 - t, 4), // ease-out quartic
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const toggleHud = (panel: "layers" | "measure" | "share") => {
    setActiveHud((prev) => (prev === panel ? null : panel));
  };

  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: fadeIn ? 1 : 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* ─── Full-bleed map canvas ─── */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* ─── Top-left: Back arrow + Project name ─── */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center justify-center w-8 h-8 rounded-full text-white/40 hover:text-white transition-colors"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-white/40 text-xs font-medium tracking-wide">
          New Project
        </span>
      </div>

      {/* ─── Bottom-center: Glassmorphic HUD pill ─── */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-full"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Layers */}
          <HudButton
            icon={<Layers className="w-4 h-4" />}
            label="Layers"
            active={activeHud === "layers"}
            onClick={() => toggleHud("layers")}
          />

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Measure */}
          <HudButton
            icon={<Ruler className="w-4 h-4" />}
            label="Measure"
            active={activeHud === "measure"}
            onClick={() => toggleHud("measure")}
          />

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Share */}
          <HudButton
            icon={<Share2 className="w-4 h-4" />}
            label="Share"
            active={activeHud === "share"}
            onClick={() => toggleHud("share")}
          />
        </div>
      </div>

      {/* ─── HUD Panels (float above the pill) ─── */}
      <AnimatePresence>
        {activeHud && (
          <motion.div
            key={activeHud}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 w-72 rounded-2xl p-5"
            style={{
              background: "rgba(10,10,10,0.80)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70 text-sm font-semibold capitalize">{activeHud}</span>
              <button
                onClick={() => setActiveHud(null)}
                className="text-white/30 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeHud === "layers" && <MapLayerTree map={mapRef.current} />}
            {activeHud === "measure" && <MeasurePanel />}
            {activeHud === "share" && <SharePanel />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Map loading overlay ─── */}
      <AnimatePresence>
        {!mapReady && (
          <motion.div
            key="map-loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-30 bg-[#0A0A0A] flex items-center justify-center"
          >
            <p
              className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent animate-pulse"
              style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
            >
              Loading...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── HUD Button ───────────────────────────────────────────────────────────────
function HudButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200
        ${active
          ? "bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30"
          : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}



// ─── Measure Panel ────────────────────────────────────────────────────────────
function MeasurePanel() {
  return (
    <div className="text-center py-4">
      <p className="text-white/30 text-xs leading-relaxed">
        Measurement tools coming soon.
        <br />
        Click two points on the map to measure distance.
      </p>
    </div>
  );
}

// ─── Share Panel ─────────────────────────────────────────────────────────────
function SharePanel() {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-white/30 text-xs">Share this map view</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 px-3 py-2 rounded-lg text-xs text-white/50 bg-white/5 border border-white/8 outline-none truncate"
        />
        <button
          onClick={copy}
          className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: copied ? "rgba(0,200,83,0.15)" : "rgba(255,255,255,0.08)",
            color: copied ? "#00C853" : "rgba(255,255,255,0.6)",
            border: `1px solid ${copied ? "rgba(0,200,83,0.3)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
