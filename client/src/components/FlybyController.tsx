/**
 * FlybyController — Cinematic 360° orbital camera for Mapbox GL JS
 *
 * Attaches to a mapboxgl.Map instance via a ref and drives a smooth
 * circular orbit at 45° pitch. One full rotation takes ~60 seconds.
 * Uses requestAnimationFrame for buttery-smooth motion and easeInOutQuad
 * for the start/stop ramp so the camera never jerks.
 */

import mapboxgl from "mapbox-gl";
import { Pause, Play, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Easing ────────────────────────────────────────────────────────────────────
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FULL_ROTATION_MS = 60_000; // 60 s per orbit
const TARGET_PITCH = 45;         // degrees
const RAMP_MS = 3_000;           // ease-in / ease-out window

interface FlybyControllerProps {
  /** Live reference to the Mapbox GL map instance */
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
  /** Whether the map is fully loaded and ready */
  mapLoaded: boolean;
}

export function FlybyController({ mapRef, mapLoaded }: FlybyControllerProps) {
  const [isFlying, setIsFlying] = useState(false);

  // Internal flyby state kept in refs so RAF callbacks are always fresh
  const flyingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startBearingRef = useRef(0);
  const startPitchRef = useRef(0);
  const stopRequestedRef = useRef(false);
  const stopStartTimeRef = useRef<number | null>(null);
  const stopBearingRef = useRef(0);
  const stopPitchRef = useRef(0);

  // ── Orbit loop ──────────────────────────────────────────────────────────────
  const orbitFrame = useCallback((now: number) => {
    const map = mapRef.current;
    if (!map || !flyingRef.current) return;

    if (startTimeRef.current === null) startTimeRef.current = now;
    const elapsed = now - startTimeRef.current;

    // Ease-in ramp: first RAMP_MS ms
    const rampT = Math.min(elapsed / RAMP_MS, 1);
    const speedFactor = easeInOutQuad(rampT);

    // Bearing: degrees per ms × elapsed, wrapped to [0, 360)
    const degreesPerMs = 360 / FULL_ROTATION_MS;
    const bearing = (startBearingRef.current + degreesPerMs * elapsed * speedFactor) % 360;

    // Pitch: lerp from startPitch to TARGET_PITCH over RAMP_MS
    const pitch = startPitchRef.current + (TARGET_PITCH - startPitchRef.current) * easeInOutQuad(rampT);

    map.easeTo({ bearing, pitch, duration: 0, easing: (t) => t });

    // Handle stop request
    if (stopRequestedRef.current) {
      if (stopStartTimeRef.current === null) {
        stopStartTimeRef.current = now;
        stopBearingRef.current = bearing;
        stopPitchRef.current = pitch;
      }
      const stopElapsed = now - stopStartTimeRef.current;
      const stopT = Math.min(stopElapsed / RAMP_MS, 1);
      const stopFactor = 1 - easeInOutQuad(stopT);

      // Slow down bearing and ease pitch back to 0
      const slowBearing = (stopBearingRef.current + degreesPerMs * stopElapsed * stopFactor) % 360;
      const slowPitch = stopPitchRef.current * (1 - easeInOutQuad(stopT));
      map.easeTo({ bearing: slowBearing, pitch: slowPitch, duration: 0, easing: (t) => t });

      if (stopT >= 1) {
        // Fully stopped
        flyingRef.current = false;
        stopRequestedRef.current = false;
        stopStartTimeRef.current = null;
        setIsFlying(false);
        return;
      }
    }

    rafRef.current = requestAnimationFrame(orbitFrame);
  }, [mapRef]);

  // ── Start flyby ─────────────────────────────────────────────────────────────
  const startFlyby = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Capture current camera state as start point
    startBearingRef.current = map.getBearing();
    startPitchRef.current = map.getPitch();
    startTimeRef.current = null;
    stopRequestedRef.current = false;
    stopStartTimeRef.current = null;
    flyingRef.current = true;

    // Enable pitch+rotate so the camera can tilt
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();

    setIsFlying(true);
    rafRef.current = requestAnimationFrame(orbitFrame);
  }, [mapRef, mapLoaded, orbitFrame]);

  // ── Stop flyby ──────────────────────────────────────────────────────────────
  const stopFlyby = useCallback(() => {
    stopRequestedRef.current = true;
  }, []);

  // ── Toggle ───────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    if (isFlying) {
      stopFlyby();
    } else {
      if (!mapLoaded) {
        toast.info("Map is still loading. Please wait.");
        return;
      }
      startFlyby();
    }
  }, [isFlying, mapLoaded, startFlyby, stopFlyby]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      flyingRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Record stub ─────────────────────────────────────────────────────────────
  const handleRecord = useCallback(() => {
    toast.info("Screen recording is available on AGENCY and MUNICIPAL plans.", {
      description: "Upgrade your plan to unlock stakeholder video exports.",
    });
  }, []);

  return (
    <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-50 pointer-events-auto">
      {/* Cinematic Flyby Button */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-3 px-6 py-4 bg-[#10b981] text-slate-950 font-black rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all select-none"
        style={{ fontFamily: "var(--font-display)" }}
        title={isFlying ? "Stop cinematic flyby" : "Launch cinematic flyby"}
      >
        {isFlying ? (
          <Pause size={20} fill="currentColor" />
        ) : (
          <Play size={20} fill="currentColor" />
        )}
        <span className="text-sm tracking-widest uppercase">
          {isFlying ? "Stop Flyby" : "Launch Cinematic Flyby"}
        </span>
        {isFlying && (
          <span className="flex h-2 w-2 rounded-full bg-slate-950 animate-ping ml-1" />
        )}
      </button>

      {/* Record for Stakeholders */}
      <button
        onClick={handleRecord}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/80 border border-white/10 text-white text-xs font-bold rounded-xl backdrop-blur-md hover:bg-slate-800 transition-all"
        title="Record flyby for stakeholders (AGENCY/MUNICIPAL plans)"
      >
        <Video size={14} />
        <span className="tracking-widest uppercase">Record for Stakeholders</span>
      </button>
    </div>
  );
}
