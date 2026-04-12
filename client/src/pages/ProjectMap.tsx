/**
 * Project Map Page — Full-screen production Mapbox map
 * Uses the production MapboxProjectMap component for all mapping logic.
 * Keeps: Prestige modal, CityParkTour, FlybyController, project info panel.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { BackToDashboard } from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FlybyController, FlybyControllerHandle } from "@/components/FlybyController";
import { CityParkTour } from "@/components/CityParkTour";
import { MapboxProjectMap, MapboxProjectMapHandle } from "@/components/MapboxProjectMap";
import {
  ArrowLeft,
  MapPin,
  Image,
  FolderOpen,
} from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc as trpcClient } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { getLoginUrl } from "@/const";

// ── Coordinate helpers ────────────────────────────────────────────────────────
// DB stores "lat, lng"; Mapbox needs [lng, lat]
function parseLocation(str: string | null | undefined): [number, number] | null {
  if (!str) return null;
  const parts = str.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[1], parts[0]]; // [lng, lat]
  }
  return null;
}

function getSessionCoords(): [number, number] | null {
  try {
    const stored = sessionStorage.getItem("mapit_fly_coords");
    if (!stored) return null;
    const { lat, lng } = JSON.parse(stored);
    if (typeof lat === "number" && typeof lng === "number") return [lng, lat];
  } catch { /* ignore */ }
  return null;
}

export default function ProjectMap() {
  const { id, flightId: flightIdParam } = useParams<{ id: string; flightId?: string }>();
  const projectId = parseInt(id || "0", 10);
  const flightId = flightIdParam ? parseInt(flightIdParam, 10) : undefined;
  const isDemoProject = projectId === 1;
  const { user } = useAuth();

  const mapCompRef = useRef<MapboxProjectMapHandle | null>(null);
  const flybyRef = useRef<FlybyControllerHandle | null>(null);
  const mapRef = useRef<any>(null);

  // Keep mapRef in sync with MapboxProjectMap's internal map
  useEffect(() => {
    const interval = setInterval(() => {
      if (mapCompRef.current) {
        mapRef.current = mapCompRef.current.getMap();
        if (mapRef.current) clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const [mapReady, setMapReady] = useState(false);

  // Demo tour state
  const [showTour, setShowTour] = useState(isDemoProject);

  // ── Prestige modal (onboarding funnel) ───────────────────────────────
  const isOnboardingProject =
    !isDemoProject &&
    !!sessionStorage.getItem("mapit_project_id") &&
    sessionStorage.getItem("mapit_project_id") === String(projectId);
  const [showPrestige, setShowPrestige] = useState(false);
  const [prestigeEmail, setPrestigeEmail] = useState("");
  const [prestigeEmailTouched, setPrestigeEmailTouched] = useState(false);
  const [prestigeSubmitting, setPrestigeSubmitting] = useState(false);
  const [prestigeClaimed, setPrestigeClaimed] = useState(false);
  const claimProject = trpcClient.onboarding.claimProject.useMutation();
  const isPrestigeEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(prestigeEmail.trim());
  const onboardingProjectName =
    sessionStorage.getItem("mapit_project_name") || "your project";

  // Fire Prestige modal 30 seconds after map is ready (onboarding flow only)
  useEffect(() => {
    if (!isOnboardingProject || !mapReady) return;
    const timer = setTimeout(() => setShowPrestige(true), 30000);
    return () => clearTimeout(timer);
  }, [isOnboardingProject, mapReady]);

  // ── Conversion Modal (60s after Prestige dismiss) ──────────────────────────
  const [showConversionModal, setShowConversionModal] = useState(false);
  const conversionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startConversionTimer = () => {
    if (conversionTimerRef.current) clearTimeout(conversionTimerRef.current);
    conversionTimerRef.current = setTimeout(() => setShowConversionModal(true), 60000);
  };

  // ── Discovery Hint (onboarding flow) ─────────────────────────────────────
  // Fades in 3s after mapReady, dismissed by marker click or Prestige modal.
  const [showDiscoveryHint, setShowDiscoveryHint] = useState(false);
  const discoveryDismissed = useRef(false);

  const dismissDiscoveryHint = () => {
    discoveryDismissed.current = true;
    setShowDiscoveryHint(false);
  };

  // Show hint 3s after map is ready (onboarding only)
  useEffect(() => {
    if (!isOnboardingProject || !mapReady) return;
    const timer = setTimeout(() => {
      if (!discoveryDismissed.current) setShowDiscoveryHint(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOnboardingProject, mapReady]);

  // Dismiss hint when Prestige modal fires
  useEffect(() => {
    if (showPrestige) dismissDiscoveryHint();
  }, [showPrestige]);

  // Poll for map readiness from the production component
  useEffect(() => {
    const interval = setInterval(() => {
      if (mapCompRef.current?.isMapLoaded()) {
        setMapReady(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Dismiss Prestige and start 60s conversion timer
  const handlePrestigeDismiss = () => {
    setShowPrestige(false);
    startConversionTimer();
  };

  const handlePrestigeClaim = async () => {
    if (!prestigeEmail.trim() || prestigeSubmitting) return;
    setPrestigeSubmitting(true);
    try {
      await claimProject.mutateAsync({ projectId, email: prestigeEmail.trim() });
      setPrestigeClaimed(true);
      sessionStorage.removeItem("mapit_project_id");
      sessionStorage.removeItem("mapit_project_name");
      sessionStorage.removeItem("mapit_trial_expires");
      setTimeout(() => setShowPrestige(false), 2000);
    } catch {
      setPrestigeSubmitting(false);
    }
  };

  const { data: project, isLoading: projectLoading } = isDemoProject
    ? trpc.project.getDemo.useQuery({ id: projectId }, { enabled: projectId > 0 })
    : trpc.project.get.useQuery({ id: projectId }, { enabled: projectId > 0 });

  const { data: mediaItems, isLoading: mediaLoading } = isDemoProject
    ? trpc.media.listDemo.useQuery({ projectId, flightId, includeFlightMedia: false }, { enabled: projectId > 0 })
    : trpc.media.list.useQuery({ projectId, flightId, includeFlightMedia: false }, { enabled: projectId > 0 });

  const geotaggedMedia = useMemo(() => {
    return (mediaItems || [])
      .filter((m) => m.latitude !== null && m.longitude !== null)
      .map((m) => ({
        id: m.id,
        filename: m.filename,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        mediaType: m.mediaType,
        latitude: parseFloat(String(m.latitude)),
        longitude: parseFloat(String(m.longitude)),
        altitude: m.altitude ? parseFloat(String(m.altitude)) : null,
        capturedAt: m.capturedAt,
      }));
  }, [mediaItems]);

  const overlays = useMemo(() => {
    const p = project as any;
    return (p?.overlays || []).filter((o: any) => o.isActive);
  }, [project]);

  // ── Fly-in: once map is ready, fly to the best available coordinates ──────
  // Priority: sessionStorage → project.location DB → media centroid
  const hasFiredFlyIn = useRef(false);
  useEffect(() => {
    if (!mapReady || hasFiredFlyIn.current) return;
    const map = mapCompRef.current?.getMap();
    if (!map) return;

    // Tier 1: sessionStorage
    let center = getSessionCoords();
    if (center) sessionStorage.removeItem("mapit_fly_coords");

    // Tier 2: project.location from DB
    if (!center) center = parseLocation((project as any)?.location);

    // Tier 3: media centroid
    if (!center && geotaggedMedia.length > 0) {
      const avgLat = geotaggedMedia.reduce((s, m) => s + m.latitude, 0) / geotaggedMedia.length;
      const avgLng = geotaggedMedia.reduce((s, m) => s + m.longitude, 0) / geotaggedMedia.length;
      center = [avgLng, avgLat];
    }

    if (!center) return; // No coords yet — wait

    hasFiredFlyIn.current = true;
    map.resize();
    map.flyTo({ center, zoom: 18, pitch: 45, bearing: 0, duration: 3800, essential: true });
  }, [mapReady, project, geotaggedMedia]);

  // ── Determine if we have any coordinates to show the map ─────────────────
  // Rule: if project.location exists OR sessionStorage has coords, the map is
  // the hero — never block it with the No GPS overlay.
  const projectLocation = (project as any)?.location;
  const hasCoordinates =
    !!projectLocation ||
    !!getSessionCoords() ||
    geotaggedMedia.length > 0;

  // Only block on projectLoading — media can load in the background.
  // hasCoordinates uses project.location so the map shows immediately.
  if (projectLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Project Not Found</h1>
          <BackToDashboard variant="default" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0A0A0A] overflow-hidden relative">
      {/* ── Production MapboxProjectMap fills the entire viewport ── */}
      <div className="absolute inset-0 z-0">
        <MapboxProjectMap
          ref={mapCompRef}
          projectId={projectId}
          projectName={project.name}
          flightId={flightId}
          isDemoProject={isDemoProject}
          overlays={overlays}
          onOverlayUpdated={() => {}}
          onOverlayButtonClick={() => {}}
          heightClass="h-screen"
          showFullScreenLink={false}
          projectLocation={(project as any)?.location}
        />
      </div>

      {/* ── No GPS fallback — only show when truly no coordinates exist ── */}
      {!hasCoordinates && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0A0A]">
          <div className="text-center p-8">
            <MapPin className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No GPS Data Available</h2>
            <p className="text-white/40 mb-6">
              Upload drone photos with GPS metadata to see them on the map.
            </p>
            <Link href={flightId ? `/project/${projectId}/flight/${flightId}` : `/project/${projectId}`}>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-full px-8">
                Upload Media
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Project Info Panel — Top Left ── */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/70 backdrop-blur-md rounded-lg border border-white/10 p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <Link href={flightId ? `/project/${projectId}/flight/${flightId}` : `/project/${projectId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-8 px-2 gap-1.5 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-xs">Return to {flightId ? "Flight" : "Project"}</span>
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1
                className="text-base font-semibold truncate text-white"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                {flightId ? "Flight Map" : project.name}
              </h1>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {geotaggedMedia.length} locations
                </span>
                <span className="flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  {mediaItems?.length || 0} total
                </span>
                {(project as any).location && (
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {(project as any).location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cinematic Flyby Controller ── */}
      {geotaggedMedia.length > 0 && (
        <FlybyController ref={flybyRef} mapRef={mapRef} mapLoaded={mapReady} />
      )}

      {/* ── City Park Guided Tour ── */}
      {isDemoProject && showTour && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <div className="pointer-events-auto">
            <CityParkTour
              onLaunchFlyby={() => {
                setTimeout(() => flybyRef.current?.startFlyby(), 400);
              }}
              onClose={() => setShowTour(false)}
            />
          </div>
        </div>
      )}

      {/* ── Prestige Modal (Onboarding Funnel) ── */}
      <AnimatePresence>
        {showPrestige && (
          <motion.div
            key="prestige-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(20px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full mx-6 text-center"
              style={{
                maxWidth: "560px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "28px",
                padding: "4rem 3.5rem",
                backdropFilter: "blur(32px)",
              }}
            >
              {!prestigeClaimed ? (
                <>
                  {/* Award-grade hook — no period, metallic gradient, full width */}
                  <p
                    className="font-bold bg-clip-text text-transparent mb-8"
                    style={{
                      fontSize: "clamp(2.4rem,5.5vw,3.75rem)",
                      letterSpacing: "-0.04em",
                      backgroundImage: "linear-gradient(160deg, #ffffff 0%, #d1d5db 45%, #6b7280 100%)",
                      lineHeight: 1.0,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      display: "block",
                    }}
                  >
                    Engineering triumph
                  </p>
                  {/* Sequential fade-in body lines */}
                  <div className="mb-8 space-y-3" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="text-white text-lg font-medium"
                    >
                      Simply extraordinary
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65, duration: 0.5 }}
                      className="text-white/60 text-base leading-relaxed"
                    >
                      You've just turned{" "}
                      <span className="text-white font-semibold">{onboardingProjectName}</span>{" "}
                      into a living digital record. What used to take weeks, you've done in a single motion.
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.0, duration: 0.5 }}
                      className="text-white/80 text-sm font-medium tracking-wide"
                    >
                      The magic is yours. You are in control
                    </motion.p>
                  </div>
                  <input
                    type="email"
                    value={prestigeEmail}
                    onChange={(e) => { setPrestigeEmail(e.target.value); setPrestigeEmailTouched(true); }}
                    onBlur={() => setPrestigeEmailTouched(true)}
                    onKeyDown={(e) => e.key === "Enter" && isPrestigeEmailValid && handlePrestigeClaim()}
                    placeholder="your@email.com"
                    className={`w-full bg-transparent border-0 border-b outline-none text-white text-lg text-center pb-3 placeholder:text-white/25 transition-colors duration-200 ${
                      prestigeEmailTouched && !isPrestigeEmailValid && prestigeEmail.length > 0
                        ? 'border-red-400/70 focus:border-red-400'
                        : 'border-white/30 focus:border-white/80'
                    }`}
                    style={{ caretColor: "#10b981", marginBottom: prestigeEmailTouched && !isPrestigeEmailValid && prestigeEmail.length > 0 ? '0.5rem' : '2rem' }}
                    disabled={prestigeSubmitting}
                    autoComplete="email"
                  />
                  {prestigeEmailTouched && !isPrestigeEmailValid && prestigeEmail.length > 0 && (
                    <p className="text-red-400/80 text-xs text-center mb-6 mt-1">Enter a valid email address</p>
                  )}
                  <button
                    onClick={handlePrestigeClaim}
                    disabled={!isPrestigeEmailValid || prestigeSubmitting}
                    className="w-full bg-white text-black font-bold text-base py-4 rounded-full transition-all duration-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {prestigeSubmitting ? "Claiming..." : "Claim Project"}
                  </button>
                  <button
                    onClick={handlePrestigeDismiss}
                    className="mt-5 text-white/25 text-sm hover:text-white/50 transition-colors"
                  >
                    Continue exploring →
                  </button>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <p
                    className="font-bold tracking-tighter bg-clip-text text-transparent mb-4"
                    style={{
                      fontSize: "clamp(2.5rem,10vw,4rem)",
                      backgroundImage: "linear-gradient(to bottom, #10b981 0%, #059669 100%)",
                      lineHeight: 1,
                    }}
                  >
                    Done.
                  </p>
                  <p className="text-gray-300 text-base">
                    Check your inbox to activate your trial.
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Conversion Modal (60s after Prestige dismiss) ── */}
      <AnimatePresence>
        {showConversionModal && (
          <motion.div
            key="conversion-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(24px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full mx-6 text-center"
              style={{
                maxWidth: "560px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "28px",
                padding: "4rem 3.5rem",
                backdropFilter: "blur(32px)",
                fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              {/* Metallic headline */}
              <p
                className="font-bold bg-clip-text text-transparent mb-8"
                style={{
                  fontSize: "clamp(2.2rem,5vw,3.4rem)",
                  letterSpacing: "-0.04em",
                  backgroundImage: "linear-gradient(160deg, #ffffff 0%, #d1d5db 45%, #6b7280 100%)",
                  lineHeight: 1.05,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "block",
                }}
              >
                The world is yours to map
              </p>
              {/* Body */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-white/65 text-base leading-relaxed mb-10"
              >
                Now that you've explored our vision, it's time to build yours. Start your complimentary 14-day trial to preserve your data and unlock the complete platform.
              </motion.p>
              {/* CTA */}
              <button
                onClick={() => { window.location.href = getLoginUrl(); }}
                className="w-full bg-white text-black font-bold text-base py-4 rounded-full transition-all duration-200 hover:bg-gray-100"
              >
                Start Your Trial
              </button>
              <button
                onClick={() => setShowConversionModal(false)}
                className="mt-5 text-white/25 text-sm hover:text-white/50 transition-colors"
              >
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Discovery Hint Card ── */}
      {/* Square glassmorphic card, top-right, 24px below header HUD */}
      <AnimatePresence>
        {showDiscoveryHint && (
          <motion.div
            key="discovery-hint"
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="fixed top-[180px] left-8 z-[9990] pointer-events-auto"
          >
            <button
              onClick={dismissDiscoveryHint}
              className="flex flex-col items-center justify-center gap-3 px-6 py-6 rounded-2xl text-center transition-all duration-200 hover:border-white/25 select-none"
              style={{
                width: "192px",
                background: "rgba(0,0,0,0.60)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.20)",
                boxShadow: "0 25px 50px -12px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.6)",
                fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-pulse" />
              <p className="text-white/80 text-xs leading-relaxed">
                The magic is in the coordinates.<br />
                <span className="text-white/50">Click the marker to reveal the image</span>
              </p>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
