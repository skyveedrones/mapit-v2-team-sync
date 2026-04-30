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
import posthog from "posthog-js";

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
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const mapCompRef = useRef<MapboxProjectMapHandle | null>(null);
  const flybyRef = useRef<FlybyControllerHandle | null>(null);
  const mapRef = useRef<any>(null);
  const projectCardRef = useRef<HTMLDivElement | null>(null);
  const [cardBottom, setCardBottom] = useState(160);

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
  // While true, sidebar manual toggle is disabled — tour automation has full control
  const [isTourActive, setIsTourActive] = useState(isDemoProject);
  // Fades in after the tour fully completes
  const [showTrialPill, setShowTrialPill] = useState(false);
  // Flyby pro tooltip — shown after conversion modal is dismissed
  const [showFlybyProTooltip, setShowFlybyProTooltip] = useState(false);

  // ── Prestige modal (onboarding funnel) ───────────────────────────────
  const isOnboardingProject =
    !isDemoProject &&
    !!sessionStorage.getItem("mapit_project_id") &&
    sessionStorage.getItem("mapit_project_id") === String(projectId);
  // True only when the user arrived via the sample-photo bypass
  const isSampleProject = isOnboardingProject && sessionStorage.getItem("mapit_is_sample") === "1";

  // ── Sample onboarding UX state ──────────────────────────────────────────
  const [showControlsLegend, setShowControlsLegend] = useState(false);
  const [showSamplePulseRing, setShowSamplePulseRing] = useState(false);
  const cinematicFiredRef = useRef(false);

  const [showPrestige, setShowPrestige] = useState(false);
  const [prestigeEmail, setPrestigeEmail] = useState(user?.email ?? "");
  const [prestigeEmailTouched, setPrestigeEmailTouched] = useState(false);

  // Keep email in sync if user loads after component mounts
  useEffect(() => {
    if (user?.email && !prestigeEmail) {
      setPrestigeEmail(user.email);
    }
  }, [user?.email]);
  const [prestigeSubmitting, setPrestigeSubmitting] = useState(false);
  const [prestigeClaimed, setPrestigeClaimed] = useState(false);
  const claimProject = trpcClient.onboarding.claimProject.useMutation();
  const isPrestigeEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(prestigeEmail.trim());
  const onboardingProjectName =
    sessionStorage.getItem("mapit_project_name") || "your project";

  // Track whether Triumph has ever fired (to show persistent Start Trial pill)
  const [triumphHasFired, setTriumphHasFired] = useState(false);

  // Fire Prestige modal 30 seconds after map is ready (onboarding flow only)
  useEffect(() => {
    if (!isOnboardingProject || !mapReady) return;
    const timer = setTimeout(() => {
      setShowPrestige(true);
      setTriumphHasFired(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [isOnboardingProject, mapReady]);

  // ── Conversion Modal (60s after Prestige dismiss) ──────────────────────────
  const [showConversionModal, setShowConversionModal] = useState(false);
  const conversionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startConversionTimer = () => {
    if (conversionTimerRef.current) clearTimeout(conversionTimerRef.current);
    conversionTimerRef.current = setTimeout(() => setShowConversionModal(true), 30000);
  };

  // ── Magic Window #1 (Marker/Discovery Hint) ─────────────────────────────
  // Appears 3s after mapReady, auto-dismisses after 10s, then Window #2 appears.
  const [showDiscoveryHint, setShowDiscoveryHint] = useState(false);
  const [showSidebarHint, setShowSidebarHint] = useState(false);
  const discoveryDismissed = useRef(false);

  const dismissDiscoveryHint = () => {
    discoveryDismissed.current = true;
    setShowDiscoveryHint(false);
  };

  // Show Window #1 3s after map is ready (onboarding only);
  // auto-dismiss after 10s, then show Window #2 after fade completes (~500ms)
  useEffect(() => {
    if (!isOnboardingProject || !mapReady) return;
    const showTimer = setTimeout(() => {
      if (!discoveryDismissed.current) {
        setShowDiscoveryHint(true);
        // Auto-dismiss Window #1 after 10s, then show Window #2
        const autoTimer = setTimeout(() => {
          setShowDiscoveryHint(false);
          // Wait for fade-out transition (~500ms) before showing Window #2
          setTimeout(() => {
            setShowSidebarHint(true);
            // Auto-dismiss Window #2 after 15s
            setTimeout(() => setShowSidebarHint(false), 15000);
          }, 600);
        }, 10000);
        return () => clearTimeout(autoTimer);
      }
    }, 3000);
    return () => clearTimeout(showTimer);
  }, [isOnboardingProject, mapReady]);

  // Dismiss both hints when Prestige modal fires
  useEffect(() => {
    if (showPrestige) {
      dismissDiscoveryHint();
      setShowSidebarHint(false);
    }
  }, [showPrestige]);

  // Measure project card bottom edge after render so pill positions correctly
  useEffect(() => {
    const measure = () => {
      if (projectCardRef.current) {
        const rect = projectCardRef.current.getBoundingClientRect();
        setCardBottom(rect.bottom);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [triumphHasFired]);

  // Poll for map readiness from the production component
  useEffect(() => {
    const interval = setInterval(() => {
      if (mapCompRef.current?.isMapLoaded()) {
        setMapReady(true);
        console.log('[MAPIT Analytics] Map_Rendered');
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Task 2: Off-map guard — if unauthenticated user revisits/refreshes a claimed project map
  // (sessionStorage key is gone = project was already claimed), redirect to /welcome
  // Skip if prestigeClaimed is true — user just claimed and the success modal is showing
  // Skip if isSampleProject — sample users are always allowed regardless of Clerk state
  useEffect(() => {
    if (isDemoProject || isAuthenticated || prestigeClaimed || isSampleProject) return;
    // Wait for Clerk to fully settle (including 3s timeout) before evaluating
    if (authLoading) return;
    const storedId = sessionStorage.getItem('mapit_project_id');
    // If there's no sessionStorage key for this project, the user is a ghost — redirect
    if (!storedId || storedId !== String(projectId)) {
      window.location.href = '/welcome';
    }
  }, [isDemoProject, isAuthenticated, projectId, prestigeClaimed, isSampleProject, authLoading]);

  // Block ESC globally when modal is locked after claim
  useEffect(() => {
    if (!prestigeClaimed) return;
    const blockEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') e.stopImmediatePropagation(); };
    window.addEventListener('keydown', blockEsc, true);
    return () => window.removeEventListener('keydown', blockEsc, true);
  }, [prestigeClaimed]);

  // Dismiss Prestige and start 60s conversion timer
  // Once claimed, modal is locked — only 'Go to My Dashboard' can exit
  const handlePrestigeDismiss = () => {
    if (prestigeClaimed) return;
    setShowPrestige(false);
    startConversionTimer();
  };

  const handlePrestigeClaim = async () => {
    if (!prestigeEmail.trim() || prestigeSubmitting) return;
    setPrestigeSubmitting(true);
    try {
      await claimProject.mutateAsync({ projectId, email: prestigeEmail.trim() });
      console.log('[MAPIT Analytics] Trial_Converted');
      setPrestigeClaimed(true);
      sessionStorage.removeItem("mapit_project_id");
      sessionStorage.removeItem("mapit_project_name");
      sessionStorage.removeItem("mapit_trial_expires");
      // Modal stays open — only 'Go to My Dashboard' button can exit
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

  // ── Sample-only: cinematic bearing reveal + controls legend + pulse ring ────────
  useEffect(() => {
    if (!isSampleProject || !mapReady || cinematicFiredRef.current) return;
    cinematicFiredRef.current = true;
    const map = mapCompRef.current?.getMap();

    // 1. Cinematic bearing rotate: fires 4.6s after map ready (after fly-in completes)
    const cinematicTimer = setTimeout(() => {
      if (map) {
        map.easeTo({
          bearing: -25,
          pitch: 52,
          duration: 4000,
          easing: (t: number) => t * (2 - t), // ease-out quad
        });
      }
    }, 4600);

    // 2. Controls legend: fade in 5.2s after map ready — stays permanently until × is clicked
    const legendShowTimer = setTimeout(() => setShowControlsLegend(true), 5200);

    // 3. Pulse ring on sidebar toggle: show 6s after map ready — stays until user clicks it
    const ringShowTimer = setTimeout(() => setShowSamplePulseRing(true), 6000);

    return () => {
      clearTimeout(cinematicTimer);
      clearTimeout(legendShowTimer);
      clearTimeout(ringShowTimer);
    };
  }, [isSampleProject, mapReady]);

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
          isGuestUser={isDemoProject || isOnboardingProject}
          overlays={overlays}
          onOverlayUpdated={() => {}}
          onOverlayButtonClick={() => {}}
          heightClass="h-screen"
          showFullScreenLink={false}
          hideHeader={true}
          projectLocation={(project as any)?.location}
          initialMedia={geotaggedMedia.length > 0 ? geotaggedMedia : undefined}
          onSidebarOpen={() => setShowSidebarHint(false)}
          isTourActive={isTourActive}
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
      {/* Only shown for real authenticated users — onboarding/demo users have no dashboard to return to */}
      {isAuthenticated && !isOnboardingProject && !isDemoProject && (
      <div className="absolute top-4 left-4 z-10" ref={projectCardRef}>
        {/* Desktop layout (sm and up) */}
        <div className="hidden sm:block bg-black/70 backdrop-blur-md rounded-lg border border-white/10 p-4 max-w-sm">
          <div className="flex items-start gap-3">
            {/* Hide 'Return to Project' for all unauthenticated users — no project page to go back to */}
            {isAuthenticated && (
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
            )}
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
          {/* Claim Your Project pill — visible for unauthenticated onboarding users until claimed */}
          {isOnboardingProject && !isAuthenticated && !prestigeClaimed && (
            <button
              onClick={() => setShowPrestige(true)}
              className="mt-3 w-full bg-white hover:bg-gray-100 text-black text-sm font-bold py-2.5 rounded-full shadow-lg transition-all duration-200 select-none"
              style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
            >
              Claim Your Project
            </button>
          )}
        </div>

        {/* Mobile layout (below sm) — compact pill: name + optional claim button only */}
        <div className="sm:hidden bg-black/70 backdrop-blur-md rounded-lg border border-white/10 px-3 py-2 max-w-[calc(100vw-5rem)]">
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Link href={flightId ? `/project/${projectId}/flight/${flightId}` : `/project/${projectId}`}>
                <ArrowLeft className="h-4 w-4 text-white/70 flex-shrink-0" />
              </Link>
            )}
            <h1
              className="text-sm font-semibold truncate text-white"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              {flightId ? "Flight Map" : project.name}
            </h1>
          </div>
          {isOnboardingProject && !isAuthenticated && !prestigeClaimed && (
            <button
              onClick={() => setShowPrestige(true)}
              className="mt-2 w-full bg-white hover:bg-gray-100 text-black text-xs font-bold py-1.5 rounded-full shadow-lg transition-all duration-200 select-none"
              style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
            >
              Claim Your Project
            </button>
          )}
        </div>
      </div>
      )}

      {/* ── Cinematic Flyby Controller ── */}
      {geotaggedMedia.length > 0 && (
        <FlybyController
          ref={flybyRef}
          mapRef={mapRef}
          mapLoaded={mapReady}
          onFlybyStop={() => {
            // Recenter on GPS marker after flyby ends (1.8s smooth glide)
            const map = mapCompRef.current?.getMap();
            if (!map) return;
            // Use same 3-tier GPS fallback as fly-in
            let center: [number, number] | null = null;
            const sessionCoords = getSessionCoords();
            if (sessionCoords) center = sessionCoords;
            if (!center && (project as any)?.location) center = parseLocation((project as any).location);
            if (!center && geotaggedMedia.length > 0) {
              const avgLat = geotaggedMedia.reduce((s, m) => s + m.latitude, 0) / geotaggedMedia.length;
              const avgLng = geotaggedMedia.reduce((s, m) => s + m.longitude, 0) / geotaggedMedia.length;
              center = [avgLng, avgLat];
            }
            if (!center) return;
            map.flyTo({ center, zoom: 18, pitch: 45, bearing: 0, duration: 1800, essential: true });
          }}
        />
      )}

      {/* ── City Park Guided Tour ── */}
      {isDemoProject && showTour && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <div className="pointer-events-auto">
            <CityParkTour
              onLaunchFlyby={() => {
                setTimeout(() => flybyRef.current?.startFlyby(), 400);
              }}
              onClose={() => {
                posthog.capture('demo_completed', { 
                  assets_mapped: 5,
                  processing_time_seconds: 12
                });
                setShowTour(false);
                setIsTourActive(false);
                // Small delay so the tour card fully fades before the pill appears
                setTimeout(() => setShowTrialPill(true), 400);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Post-Tour Bottom Bar (replaces tour card after it closes) ── */}
      <AnimatePresence>
        {isDemoProject && !showTour && (
          <motion.div
            key="post-tour-bar"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 sm:bottom-12 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto"
            style={{ transform: "translateX(-50%)" }}
          >
            <div
              className="flex items-center gap-4 px-6 py-3 rounded-full"
              style={{
                background: "rgba(10,10,10,0.80)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>City Park Redevelopment</span>
              <div className="w-px h-4 bg-white/15" />
              <button
                onClick={() => flybyRef.current?.startFlyby()}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
                style={{ fontSize: "12px", color: "rgba(52,211,153,0.9)", fontWeight: 600, letterSpacing: "0.02em", background: "none", border: "none", cursor: "pointer" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l8-4v8L2 6z" fill="currentColor"/></svg>
                Flyby
              </button>
              <div className="w-px h-4 bg-white/15" />
              <a
                href="/register"
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", fontWeight: 500, letterSpacing: "0.02em", textDecoration: "none" }}
                className="hover:text-white transition-colors"
              >
                Start Trial →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Post-Tour Trial Pill ── */}
      <AnimatePresence>
        {isDemoProject && showTrialPill && (
          <motion.a
            key="trial-pill"
            href="/register"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9990] bg-white text-black font-semibold text-sm px-6 py-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
          >
            Start My Free Trial
          </motion.a>
        )}
      </AnimatePresence>

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
            onKeyDown={(e) => { if (prestigeClaimed && e.key === 'Escape') e.stopPropagation(); }}
            onClick={(e) => { if (prestigeClaimed) e.stopPropagation(); }}
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
                  {user?.email && (
                    <p className="text-white/40 text-xs text-center mb-2 -mt-1">
                      Signed in as {user.email}
                    </p>
                  )}
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
                  className="text-center"
                >
                  <p
                    className="font-bold bg-clip-text text-transparent mb-6"
                    style={{
                      fontSize: "clamp(2.2rem,6vw,3.5rem)",
                      letterSpacing: "-0.04em",
                      backgroundImage: "linear-gradient(160deg, #ffffff 0%, #d1d5db 45%, #6b7280 100%)",
                      lineHeight: 1.0,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      display: "block",
                    }}
                  >
                    Achievement Saved.
                  </p>
                  <p className="text-white/60 text-base leading-relaxed mb-10" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Your project has been secured. We are now processing your data into a high-precision workspace.
                  </p>
                  <button
                    onClick={() => { window.location.href = '/dashboard'; }}
                    className="w-full bg-white hover:bg-gray-100 text-black font-bold text-base py-4 rounded-full transition-all duration-200"
                    style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
                  >
                    Go to My Dashboard
                  </button>
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
                {isSampleProject
                  ? "See how easy that was? Start your free 14-day trial to upload your own drone data and build your first live map."
                  : "Don't lose your map! Start your free 14-day trial to save, share, and export this project."}
              </motion.p>
              {/* CTA */}
              <button
                onClick={() => { window.location.href = getLoginUrl(); }}
                className="w-full bg-white text-black font-bold text-base py-4 rounded-full transition-all duration-200 hover:bg-gray-100"
              >
                Start Your Trial
              </button>
              <button
                onClick={() => {
                  setShowConversionModal(false);
                  // Show trial pill and flyby pro tooltip after dismissal
                  setTimeout(() => setShowTrialPill(true), 300);
                  setTimeout(() => setShowFlybyProTooltip(true), 800);
                  window.location.href = "/";
                }}
                className="mt-5 text-white/25 text-sm hover:text-white/50 transition-colors"
              >
                Return to MAPIT Home Page
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Flyby Pro Tooltip (appears after conversion modal dismiss) ── */}
      <AnimatePresence>
        {isDemoProject && showFlybyProTooltip && (
          <motion.div
            key="flyby-pro-tooltip"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[160px] right-6 z-[9990] pointer-events-auto"
          >
            <div
              className="relative overflow-hidden"
              style={{
                width: "300px",
                background: "rgba(6,6,6,0.88)",
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "12px",
                boxShadow: "0 40px 80px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
                fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              {/* Emerald accent bar top */}
              <div style={{ height: "2px", background: "linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.9) 40%, rgba(52,211,153,1) 60%, rgba(16,185,129,0) 100%)" }} />
              <div className="px-6 pt-5 pb-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "11px", color: "rgba(52,211,153,0.85)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pro Feature</span>
                  </div>
                  <button
                    onClick={() => setShowFlybyProTooltip(false)}
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer" }}
                    aria-label="Dismiss"
                  >✕</button>
                </div>
                <p style={{ fontSize: "22px", fontWeight: 700, color: "rgba(255,255,255,0.96)", letterSpacing: "-0.04em", lineHeight: 1.15, marginBottom: "10px" }}>
                  Cinematic Flyby.
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "20px" }}>
                  Present your project like a film director. The Flyby tool renders a smooth cinematic path over your entire site — perfect for client presentations and stakeholder reviews.
                </p>
                <button
                  onClick={() => {
                    setShowFlybyProTooltip(false);
                    setTimeout(() => flybyRef.current?.startFlyby(), 200);
                  }}
                  className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-80"
                  style={{ fontSize: "13px", color: "rgba(52,211,153,0.9)", fontWeight: 600, letterSpacing: "0.02em" }}
                >
                  Launch Flyby →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Magic Window #1 — Marker Discovery Hint ── */}
      <AnimatePresence>
        {showDiscoveryHint && (
          <motion.div
            key="discovery-hint"
            initial={{ opacity: 0, x: -24, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[160px] left-6 z-[9990] pointer-events-auto"
          >
            <div
              className="relative overflow-hidden"
              style={{
                width: "300px",
                background: "rgba(6,6,6,0.88)",
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "12px",
                boxShadow: "0 40px 80px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
                fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              {/* Emerald accent bar top */}
              <div style={{ height: "2px", background: "linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.9) 40%, rgba(52,211,153,1) 60%, rgba(16,185,129,0) 100%)" }} />
              <div className="px-6 pt-5 pb-6">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span style={{ fontSize: "11px", color: "rgba(52,211,153,0.85)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>GPS Located</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>Step</span>
                    <div className="flex gap-1">
                      <span style={{ width: "18px", height: "3px", borderRadius: "2px", background: "rgba(52,211,153,0.9)", display: "inline-block" }} />
                      <span style={{ width: "18px", height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
                    </div>
                  </div>
                </div>
                {/* Headline */}
                <p style={{ fontSize: "22px", fontWeight: 700, color: "rgba(255,255,255,0.96)", letterSpacing: "-0.04em", lineHeight: 1.15, marginBottom: "10px" }}>
                  The magic is in<br />the coordinates.
                </p>
                {/* Body */}
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "20px" }}>
                  Your drone photo is pinned to its exact GPS location. Click the marker on the map to reveal the image.
                </p>
                {/* CTA */}
                <button
                  onClick={dismissDiscoveryHint}
                  className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-80"
                  style={{ fontSize: "13px", color: "rgba(52,211,153,0.9)", fontWeight: 600, letterSpacing: "0.02em" }}
                >
                  Got it →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Magic Window #2 — Sidebar Discovery ── */}
      <AnimatePresence>
        {showSidebarHint && (
          <motion.div
            key="sidebar-hint"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[160px] left-6 z-[9990] pointer-events-auto"
          >
            <div
              className="relative overflow-hidden"
              style={{
                width: "300px",
                background: "rgba(6,6,6,0.88)",
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "12px",
                boxShadow: "0 40px 80px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
                fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              {/* Emerald accent bar top */}
              <div style={{ height: "2px", background: "linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.9) 40%, rgba(52,211,153,1) 60%, rgba(16,185,129,0) 100%)" }} />
              <div className="px-6 pt-5 pb-6">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "11px", color: "rgba(52,211,153,0.85)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pro Tools</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>Step</span>
                    <div className="flex gap-1">
                      <span style={{ width: "18px", height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
                      <span style={{ width: "18px", height: "3px", borderRadius: "2px", background: "rgba(52,211,153,0.9)", display: "inline-block" }} />
                    </div>
                  </div>
                </div>
                {/* Headline */}
                <p style={{ fontSize: "22px", fontWeight: 700, color: "rgba(255,255,255,0.96)", letterSpacing: "-0.04em", lineHeight: 1.15, marginBottom: "10px" }}>
                  Professional<br />Grade.
                </p>
                {/* Body */}
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "20px" }}>
                  Tap the diamond icon on the right to open the sidebar — measurements, layers, and professional exports.
                </p>
                {/* CTA */}
                <button
                  onClick={() => setShowSidebarHint(false)}
                  className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-80"
                  style={{ fontSize: "13px", color: "rgba(52,211,153,0.9)", fontWeight: 600, letterSpacing: "0.02em" }}
                >
                  Got it →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sample Onboarding: Glassmorphic Controls Legend ───────────────────── */}
      <AnimatePresence>
        {showControlsLegend && (
          <motion.div
            key="controls-legend"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed bottom-8 left-1/2 z-[9980] pointer-events-auto"
            style={{ transform: "translateX(-50%)" }}
          >
            <div
              className="flex items-center gap-5 px-6 py-4 rounded-2xl"
              style={{
                background: "rgba(10,10,10,0.55)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              {/* Pan */}
              <div className="flex flex-col items-center gap-1.5">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/70">
                  <path d="M10 2v16M2 10h16M6 6l-4 4 4 4M14 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-white/45 text-[10px] tracking-wide uppercase">Pan</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              {/* Zoom */}
              <div className="flex flex-col items-center gap-1.5">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/70">
                  <rect x="7" y="2" width="6" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="text-white/45 text-[10px] tracking-wide uppercase">Scroll</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              {/* Tilt & Rotate */}
              <div className="flex flex-col items-center gap-1.5">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white/70">
                  <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4"/>
                  <circle cx="10" cy="10" r="2" fill="currentColor" fillOpacity="0.6"/>
                </svg>
                <span className="text-white/45 text-[10px] tracking-wide uppercase">Tilt</span>
              </div>
              {/* Dismiss */}
              <button
                onClick={() => setShowControlsLegend(false)}
                className="ml-2 w-5 h-5 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                aria-label="Dismiss controls legend"
              >
                <span style={{ fontSize: "9px", lineHeight: 1 }}>✕</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sample Onboarding: Sidebar Toggle Pulse Ring ──────────────────────── */}
      {/* Positioned over the sidebar toggle button (top-right area of the map) */}
      <AnimatePresence>
        {showSamplePulseRing && (
          <motion.div
            key="pulse-ring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed z-[9975] pointer-events-auto cursor-pointer"
            style={{ top: "12px", right: "12px" }}
            onClick={() => setShowSamplePulseRing(false)}
            title="Dismiss"
          >
            <div className="relative w-10 h-10">
              {/* Outer pulsing ring */}
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  border: "2px solid rgba(16,185,129,0.7)",
                  animation: "sample-pulse-ring 1.8s ease-out infinite",
                }}
              />
              {/* Second ring offset */}
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  border: "2px solid rgba(16,185,129,0.4)",
                  animation: "sample-pulse-ring 1.8s ease-out 0.6s infinite",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
