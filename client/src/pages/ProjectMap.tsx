/**
 * Project Map Page — Full-screen production Mapbox map
 * Uses the production MapboxProjectMap component for all mapping logic.
 * Keeps: Prestige modal, trial badge, CityParkTour, FlybyController,
 *        selected media preview, enlarged image viewer, project info panel.
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
  X,
  Image,
  FolderOpen,
} from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc as trpcClient } from "@/lib/trpc";
import { Link, useParams } from "wouter";

export default function ProjectMap() {
  const { id, flightId: flightIdParam } = useParams<{ id: string; flightId?: string }>();
  const projectId = parseInt(id || "0", 10);
  const flightId = flightIdParam ? parseInt(flightIdParam, 10) : undefined;
  const isDemoProject = projectId === 1;
  const { user } = useAuth();

  const mapCompRef = useRef<MapboxProjectMapHandle | null>(null);
  const flybyRef = useRef<FlybyControllerHandle | null>(null);
  const mapRef = useRef<any>(null); // passed to FlybyController

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Demo tour state — only shown for the City Park demo project
  const [showTour, setShowTour] = useState(isDemoProject);

  // ── Prestige modal (onboarding funnel) ───────────────────────────────
  const isOnboardingProject = !isDemoProject && !!sessionStorage.getItem("mapit_project_id") && sessionStorage.getItem("mapit_project_id") === String(projectId);
  const [showPrestige, setShowPrestige] = useState(false);
  const [prestigeEmail, setPrestigeEmail] = useState("");
  const [prestigeSubmitting, setPrestigeSubmitting] = useState(false);
  const [prestigeClaimed, setPrestigeClaimed] = useState(false);
  const claimProject = trpcClient.onboarding.claimProject.useMutation();
  const onboardingProjectName = sessionStorage.getItem("mapit_project_name") || "your project";

  // Fire Prestige modal 5 seconds after map is ready (onboarding flow only)
  useEffect(() => {
    if (!isOnboardingProject || !mapReady) return;
    const timer = setTimeout(() => setShowPrestige(true), 5000);
    return () => clearTimeout(timer);
  }, [isOnboardingProject, mapReady]);

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

  const handlePrestigeClaim = async () => {
    if (!prestigeEmail.trim() || prestigeSubmitting) return;
    setPrestigeSubmitting(true);
    try {
      await claimProject.mutateAsync({ projectId, email: prestigeEmail.trim() });
      setPrestigeClaimed(true);
      // Clear onboarding session markers
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

  // Overlays from project data
  const overlays = useMemo(() => {
    const p = project as any;
    return (p?.overlays || []).filter((o: any) => o.isActive);
  }, [project]);

  if (projectLoading || mediaLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
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
        />
      </div>

      {/* ── Project Info Panel — Top Left ── */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/70 backdrop-blur-md rounded-lg border border-white/10 p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <Link href={flightId ? `/project/${projectId}/flight/${flightId}` : `/project/${projectId}`}>
              <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 px-2 gap-1.5 text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-xs">Return to {flightId ? "Flight" : "Project"}</span>
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold truncate text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                {flightId ? `Flight Map` : project.name}
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
                {project.location && (
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {project.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cinematic Flyby Controller — Bottom Right ── */}
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
              className="relative max-w-md w-full mx-6 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "24px",
                padding: "3rem 2.5rem",
                backdropFilter: "blur(32px)",
              }}
            >
              {!prestigeClaimed ? (
                <>
                  {/* Massive metallic hook */}
                  <p
                    className="font-bold tracking-tighter bg-clip-text text-transparent mb-4"
                    style={{
                      fontSize: "clamp(3.5rem,12vw,5.5rem)",
                      backgroundImage: "linear-gradient(to bottom, #ffffff 0%, #6b7280 100%)",
                      lineHeight: 1,
                    }}
                  >
                    Engineering triumph
                  </p>
                  <p className="text-white/60 text-base leading-relaxed mb-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                    You have officially conquered the complexity of{" "}
                    <span className="text-white font-semibold">{onboardingProjectName}</span>. In one swift motion,
                    you've transformed raw data into a high-precision digital twin—a feat that used to take teams weeks
                    to engineer. You are in control now.
                    <br /><br />
                    Claim your 14-day free trial to secure your work.
                  </p>
                  {/* Underline email input */}
                  <input
                    type="email"
                    value={prestigeEmail}
                    onChange={(e) => setPrestigeEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePrestigeClaim()}
                    placeholder="Email address"
                    className="w-full bg-transparent border-0 border-b border-white/30 focus:border-white/80 outline-none text-white text-lg text-center pb-3 placeholder:text-white/25 transition-colors duration-200 mb-8"
                    style={{ caretColor: "#10b981" }}
                    disabled={prestigeSubmitting}
                  />
                  <button
                    onClick={handlePrestigeClaim}
                    disabled={!prestigeEmail.trim() || prestigeSubmitting}
                    className="w-full bg-white text-black font-bold text-base py-4 rounded-full transition-all duration-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {prestigeSubmitting ? "Claiming..." : "Claim Project"}
                  </button>
                  <button
                    onClick={() => setShowPrestige(false)}
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
    </div>
  );
}
