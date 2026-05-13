/**
 * Project Detail Page
 * Shows detailed view of a single project with management options
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { uploadProjectOverlay } from "@/app/actions/overlay";
import { useClientAccess } from "@/hooks/useClientAccess";
import { BackToDashboard } from "@/components/BackToDashboard";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { MapboxProjectMap, type MapboxProjectMapHandle, type ConvertedCoordinatePoint } from "@/components/MapboxProjectMap";
import { LazyMapWrapper } from "@/components/LazyMapWrapper";
import { ExportDataDialog } from "@/components/ExportDataDialog";
import { FlightCard } from "@/components/FlightCard";
import { MediaGallery } from "@/components/MediaGallery";
import { ProjectDocuments } from "@/components/ProjectDocuments";
import { MediaUploadDialog } from "@/components/MediaUploadDialog";
import { NewFlightDialog } from "@/components/NewFlightDialog";
import { ReportGeneratorDialog } from "@/components/ReportGeneratorDialog";
import { IssueReportDialog } from "@/components/IssueReportDialog";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
import { WarrantyReminderDialog } from "@/components/WarrantyReminderDialog";
import { ProjectLogoDialog } from "@/components/ProjectLogoDialog";
import { DemoBanner } from "@/components/DemoBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Project } from "../../../drizzle/schema";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  Image,
  ImagePlus,
  Layers,
  LogOut,
  Map,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Share2,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
  ScanLine,
  BarChart2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import proj4 from 'proj4';
import { SPCS_STATES, SPCS_ZONE_BY_KEY, DEFAULT_SPCS_KEY } from '../../../shared/spcsZones';
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};



const statusColors = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const statusLabels = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export default function ProjectDetail() {
  const { user, logout } = useAuth();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0", 10);
  const mapRef = useRef<MapboxProjectMapHandle>(null);
  
  // Check if this is the demo project (read-only mode)
  const isDemoProject = projectId === 1;
  
  // Check user access permissions for this project
  const { isClientOnly, canEdit, canDelete } = useClientAccess(projectId);
  
  // Listen for viewOnProjectMap events from MediaGallery
  useEffect(() => {
    const handleViewOnMap = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { latitude, longitude, mediaId } = customEvent.detail;
      if (mapRef.current && latitude && longitude) {
        setTimeout(() => {
          mapRef.current?.panToMedia(parseFloat(latitude), parseFloat(longitude), mediaId);
          // Scroll to map
          const mapElement = document.getElementById('project-map-section');
          if (mapElement) {
            mapElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    };
    
    window.addEventListener('viewOnProjectMap', handleViewOnMap);
    return () => window.removeEventListener('viewOnProjectMap', handleViewOnMap);
  }, []);
  // Override permissions for demo project - lock to read-only
  const demoCanEdit = isDemoProject ? false : canEdit;
  const demoCanDelete = isDemoProject ? false : canDelete;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [newFlightDialogOpen, setNewFlightDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [correctiveReportOpen, setCorrectiveReportOpen] = useState(false);
  const [punchlistReportOpen, setPunchlistReportOpen] = useState(false);
  const [warrantyReminderDialogOpen, setWarrantyReminderDialogOpen] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [sampleReportDialogOpen, setSampleReportDialogOpen] = useState(false);

  // ── Horizontal tab state ──────────────────────────────────────────────────
  type SidebarTab = 'media' | 'documents' | 'smart-survey' | 'reports';
  const [activeTab, setActiveTab] = useState<SidebarTab>('media');
  const [surveyPoints, setSurveyPoints] = useState<ConvertedCoordinatePoint[]>([]);
  const [showSurveyPoints, setShowSurveyPoints] = useState(true);
  const [mediaPage, setMediaPage] = useState(1);
  const MEDIA_PAGE_SIZE = 12;

  // ── CRS cascading state ───────────────────────────────────────────────────
  const [crsState, setCrsState] = useState<string>('TX'); // 2-letter abbr
  const [crsZoneKey, setCrsZoneKey] = useState<string>(DEFAULT_SPCS_KEY);
  const [invalidCells, setInvalidCells] = useState<Set<string>>(new Set());
  const crsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive zone list from selected state
  const crsZones = useMemo(() => {
    const found = SPCS_STATES.find(s => s.abbr === crsState);
    return found ? found.zones : [];
  }, [crsState]);

  // When state changes, auto-select first zone
  useEffect(() => {
    if (crsZones.length > 0) {
      setCrsZoneKey(crsZones[0].key);
    }
  }, [crsState, crsZones]);

  // tRPC mutation to persist defaultCrs
  const updateProjectMutation = trpc.project.update.useMutation();

  // Client-side proj4 re-projection
  const reprojectPoint = useCallback((northing: number, easting: number, zoneKey: string): { lat: number; lng: number } | null => {
    try {
      const zone = SPCS_ZONE_BY_KEY[zoneKey];
      if (!zone) return null;
      const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';
      const [lng, lat] = proj4(zone.proj4String, WGS84, [easting, northing]) as [number, number];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    } catch {
      return null;
    }
  }, []);

  // Handle editable cell changes
  const handleSurveyEdit = useCallback((index: number, field: keyof ConvertedCoordinatePoint, rawValue: string) => {
    setSurveyPoints(prev => {
      const updated = [...prev];
      const pt = { ...updated[index] };
      const cellId = `${index}-${field}`;

      if (field === 'description') {
        pt.description = rawValue;
        setInvalidCells(s => { const n = new Set(s); n.delete(cellId); return n; });
      } else if (field === 'elevation') {
        const num = parseFloat(rawValue);
        if (!Number.isFinite(num) && rawValue !== '' && rawValue !== '-') {
          setInvalidCells(s => new Set(s).add(cellId));
        } else {
          pt.elevation = rawValue === '' ? null : num;
          setInvalidCells(s => { const n = new Set(s); n.delete(cellId); return n; });
        }
      } else if (field === 'northing' || field === 'easting') {
        const num = parseFloat(rawValue);
        if (!Number.isFinite(num) && rawValue !== '' && rawValue !== '-') {
          setInvalidCells(s => new Set(s).add(cellId));
        } else {
          if (field === 'northing') pt.northing = rawValue === '' ? undefined : num;
          if (field === 'easting') pt.easting = rawValue === '' ? undefined : num;
          setInvalidCells(s => { const n = new Set(s); n.delete(cellId); return n; });
          // Re-project if both northing and easting are valid
          const newNorthing = field === 'northing' ? num : (pt.northing ?? NaN);
          const newEasting = field === 'easting' ? num : (pt.easting ?? NaN);
          if (Number.isFinite(newNorthing) && Number.isFinite(newEasting)) {
            const result = reprojectPoint(newNorthing, newEasting, crsZoneKey);
            if (result) {
              pt.latitude = result.lat;
              pt.longitude = result.lng;
            }
          }
        }
      }
      updated[index] = pt;
      return updated;
    });
  }, [crsZoneKey, reprojectPoint]);


  // Fetch project details - always call both hooks, enable only the correct one
  const demoProjectQuery = trpc.project.getDemo.useQuery(
    { id: projectId },
    { enabled: isDemoProject && projectId > 0 }
  );
  const normalProjectQuery = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !isDemoProject && projectId > 0 }
  );
  const { data: project, isLoading, error } = isDemoProject ? demoProjectQuery : normalProjectQuery;

  // Seed CRS from project.defaultCrs when project loads
  useEffect(() => {
    const saved = (project as any)?.defaultCrs;
    if (!saved) return;
    for (const s of SPCS_STATES) {
      if (s.zones.some(z => z.key === saved)) {
        setCrsState(s.abbr);
        setCrsZoneKey(saved);
        break;
      }
    }
  }, [(project as any)?.defaultCrs]);

  // Fetch media list - always call both hooks, enable only the correct one
  const demoMediaQuery = trpc.media.listDemo.useQuery(
    { projectId },
    { enabled: isDemoProject && projectId > 0 }
  );
  const normalMediaQuery = trpc.media.list.useQuery(
    { projectId },
    { enabled: !isDemoProject && projectId > 0 }
  );
  const { data: mediaList } = isDemoProject ? demoMediaQuery : normalMediaQuery;

  // Fetch flights - always call both hooks, enable only the correct one
  const demoFlightQuery = trpc.flight.listDemo.useQuery(
    { projectId },
    { enabled: isDemoProject && projectId > 0 }
  );
  const normalFlightQuery = trpc.flight.list.useQuery(
    { projectId },
    { enabled: !isDemoProject && projectId > 0 }
  );
  const { data: flights } = isDemoProject ? demoFlightQuery : normalFlightQuery;

  // Overlay upload logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingOverlay, setIsUploadingOverlay] = useState(false);
  const handleOverlayClick = () => {
    // Defer the click until after the dropdown has fully closed (avoids browser
    // security block on programmatic .click() inside a closing popover)
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 150);
  };
  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected if needed
    e.target.value = "";
    const formData = new FormData();
    formData.append("file", file);
    setIsUploadingOverlay(true);
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const loadingMsg = isPdf
      ? `Converting PDF "${file.name}" — this may take 10–20 seconds…`
      : `Uploading "${file.name}"…`;
    toast.loading(loadingMsg, { id: "overlay-upload" });
    try {
      const result = await uploadProjectOverlay(formData, projectId);
      if (result.success) {
        toast.success("Overlay added to map!", { id: "overlay-upload" });
        // Refetch project data so the map picks up the new overlay without a full reload
        if (isDemoProject) {
          demoProjectQuery.refetch();
        } else {
          normalProjectQuery.refetch();
        }
      } else {
        toast.error("Upload completed but returned no data.", { id: "overlay-upload" });
      }
    } catch (err: any) {
      toast.error(`Upload failed: ${err?.message || "Unknown error"}`, { id: "overlay-upload" });
    } finally {
      setIsUploadingOverlay(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    window.location.href = "/";
  };

  const handleDeleteSuccess = () => {
    setLocation("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/mapit-logo-new.png" alt="MAPIT" className="h-12 md:h-14 w-auto object-contain" />
            </Link>
          </div>
        </nav>
        <main className="pt-24 pb-12">
          <div className="container">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full mb-4" />
            <div className="grid md:grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/mapit-logo-new.png" alt="MAPIT" className="h-12 md:h-14 w-auto object-contain" />
            </Link>
          </div>
        </nav>
        <main className="pt-24 pb-12">
          <div className="container">
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  The project you're looking for doesn't exist or you don't have access to it.
                </p>
                <BackToDashboard variant="default" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const formattedFlightDate = project.flightDate
    ? new Date(project.flightDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const formattedCreatedDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hasMedia = mediaList && mediaList.length > 0;
  
  // For display purposes: show badge if user is client-only
  const isOwner = !isClientOnly;


  // Helper: get overlays from project (if available)
  const overlays = (project as any).overlays || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/mapit-logo-new.png" alt="MAPIT" className="h-12 md:h-14 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.name || user?.email || "User"}</span>
            </div>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <main className="pt-24 pb-12">
        <div className="container">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Demo Banner */}
            {isDemoProject && (
              <motion.div variants={fadeInUp} className="mb-6 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <DemoBanner />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setSampleReportDialogOpen(true)}
                >
                  See Sample Project Report
                </Button>
              </motion.div>
            )}
            {/* Back Button & Header */}
            <motion.div variants={fadeInUp} className="mb-6">
              <BackToDashboard />
              <div id="demo-welcome" className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Project Logo */}
                  {project.logoUrl && (
                    <div className="flex-shrink-0">
                      <img
                        key={project.logoUrl}
                        src={`${project.logoUrl}?t=${project.updatedAt}`}
                        alt="Project Logo"
                        className="h-16 w-16 md:h-20 md:w-20 object-contain rounded-lg border border-border bg-card p-1"
                      />
                    </div>
                  )}
                  <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1
                      className="text-2xl md:text-3xl font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {project.name}
                    </h1>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[project.status]}`}
                    >
                      {statusLabels[project.status]}
                    </span>
                    {isDemoProject && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Read-Only Demo
                      </span>
                    )}
                    {/* 14-day trial badge — shown for trialing users on their own onboarding projects */}
                    {!isDemoProject && user?.subscriptionStatus === 'trialing' && user?.currentPeriodEnd && new Date(user.currentPeriodEnd) > new Date() && (
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          backdropFilter: 'blur(8px)',
                          color: 'rgba(255,255,255,0.7)',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        14-day trial active
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-muted-foreground max-w-2xl">
                      {project.description}
                    </p>
                  )}
                </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Show access role badge for shared projects */}
                  {isClientOnly && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      <Users className="h-3 w-3 inline mr-1" />
                      Client View
                    </span>
                  )}

                  {/* Consolidated Project Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button id="project-actions" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Project Actions
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => window.open('https://www.skyveedrones.com', '_blank')}>
                        <Plane className="h-4 w-4 mr-2 text-green-500" />
                        Hire a Pilot
                      </DropdownMenuItem>
                      {demoCanEdit && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setNewFlightDialogOpen(true)}>
                            <Plane className="h-4 w-4 mr-2 text-sky-500" />
                            New Flight
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* Owner-only admin actions */}
                      {isOwner && !isDemoProject && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                            <Users className="h-4 w-4 mr-2 text-cyan-500" />
                            Share Project
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          {(user?.role === 'admin' || user?.role === 'webmaster') && (
                            <DropdownMenuItem
                              onClick={() => setDeleteDialogOpen(true)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Project
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
            {/* Condensed Project Info Tile */}
            <motion.div variants={fadeInUp} className="mb-6">
              <Card className="bg-card">
                <CardContent className="py-3">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{project.location}</span>
                      </div>
                    )}
                    {formattedFlightDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Flight:</span>
                        <span className="font-medium">{formattedFlightDate}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Media:</span>
                      <span className="font-medium">{project.mediaCount} items</span>
                    </div>
                    {/* Warranty Info */}
                    {project.warrantyEndDate && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Warranty:</span>
                        <span className="font-medium">
                          {new Date(project.warrantyStartDate!).toLocaleDateString()} - {new Date(project.warrantyEndDate).toLocaleDateString()}
                        </span>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setWarrantyReminderDialogOpen(true)}
                          >
                            <Bell className="h-3 w-3 mr-1" />
                            Reminders
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            {/* Project Map Section — Unified Mapbox Engine */}
            <motion.div variants={fadeInUp} className="mb-8" id="project-map-section">
              <LazyMapWrapper height="500px" rootMargin="300px">
                <MapboxProjectMap
                  ref={mapRef}
                  projectId={project.id}
                  projectName={project.name}
                  isDemoProject={isDemoProject}
                  overlays={overlays}
                  onOverlayUpdated={() => {
                    if (isDemoProject) {
                      demoProjectQuery.refetch();
                    } else {
                      normalProjectQuery.refetch();
                    }
                  }}
                  onOverlayButtonClick={handleOverlayClick}
                  projectLocation={(project as any)?.location}
                  showSurveyPoints={showSurveyPoints}
                  onConverterPointsChange={setSurveyPoints}
                />
              </LazyMapWrapper>
            </motion.div>

            {/* Flights Section */}
            {flights && flights.length > 0 && (
              <motion.div variants={fadeInUp} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-lg font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    <Plane className="h-5 w-5 inline mr-2 text-primary" />
                    Flights ({flights.length})
                  </h2>
                  {demoCanEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewFlightDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Flight
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Organize your drone media by flight sessions. Each flight can contain its own set of photos and videos.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {flights.map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      canEdit={demoCanEdit}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── 4-Tab Panel: Media / Documents / Smart Survey / Reports ── */}
            <motion.div variants={fadeInUp} className="mt-2">
              {/* Tab Bar */}
              <div className="flex items-center border-b border-border mb-6 overflow-x-auto">
                {([
                  { id: 'media', label: 'Media', icon: Image },
                  { id: 'documents', label: 'Documents', icon: FileText },
                  { id: 'smart-survey', label: 'Smart Survey', icon: ScanLine },
                  { id: 'reports', label: 'Reports', icon: BarChart2 },
                ] as { id: SidebarTab; label: string; icon: React.ElementType }[]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-emerald-500 text-emerald-500'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    {tab.id === 'smart-survey' && surveyPoints.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
                        {surveyPoints.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Media Tab */}
              {activeTab === 'media' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload drone photos and videos. Files with embedded GPS data automatically place a pin on the project map.
                  </p>
                  {hasMedia ? (
                    <div id="media-gallery">
                      <MediaGallery
                        isDemoProject={isDemoProject}
                        projectId={projectId}
                        canEdit={canEdit}
                        onUploadClick={() => setUploadDialogOpen(true)}
                      />
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No media uploaded yet</h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                          {demoCanEdit
                            ? 'Upload drone photos and videos to this project. Media with GPS data will automatically appear on the map.'
                            : 'No media has been uploaded to this project yet.'}
                        </p>
                        {demoCanEdit && (
                          <Button
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setUploadDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Upload Media
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload engineering PDFs, CAD files, and blueprints. PDF overlays can be pinned directly onto the project map.
                  </p>
                  <ProjectDocuments
                    projectId={projectId}
                    onOverlayAdded={(overlayId?: number, overlayData?: any) => {
                      const mapElement = document.getElementById('project-map-section');
                      if (mapElement) mapElement.scrollIntoView({ behavior: 'smooth' });
                      const refetchFn = isDemoProject ? demoProjectQuery.refetch : normalProjectQuery.refetch;
                      refetchFn().then(() => {
                        if (overlayId != null && mapRef.current) {
                          setTimeout(() => {
                            const freshOverlays: any[] = (isDemoProject
                              ? (demoProjectQuery.data as any)?.overlays
                              : (normalProjectQuery.data as any)?.overlays) ?? [];
                            const targetOverlay = freshOverlays.find((o: any) => o.id === overlayId) ?? overlayData;
                            if (targetOverlay) mapRef.current?.startEditingOverlay(targetOverlay);
                          }, 600);
                        }
                      });
                    }}
                  />
                </div>
              )}

              {/* Smart Survey Tab */}
              {activeTab === 'smart-survey' && (
                <div>
                  {/* Header row: title + map toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold">Extracted Survey Control Points</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Points extracted from engineering PDFs via the OCR tool (Import Survey Points → PDF tab in the map sidebar).
                      </p>
                    </div>
                    {surveyPoints.length > 0 && (
                      <button
                        onClick={() => setShowSurveyPoints((v) => !v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          showSurveyPoints
                            ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {showSurveyPoints ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        {showSurveyPoints ? 'Visible on Map' : 'Hidden from Map'}
                      </button>
                    )}
                  </div>

                  {/* Cascading CRS dropdowns */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Coordinate System:</span>
                    <select
                      value={crsState}
                      onChange={e => {
                        setCrsState(e.target.value);
                      }}
                      className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {SPCS_STATES.map(s => (
                        <option key={s.abbr} value={s.abbr}>{s.name}</option>
                      ))}
                    </select>
                    <select
                      value={crsZoneKey}
                      onChange={e => {
                        const newKey = e.target.value;
                        setCrsZoneKey(newKey);
                        // Re-project all existing points with new zone
                        setSurveyPoints(prev => prev.map(pt => {
                          if (pt.northing != null && pt.easting != null) {
                            const result = reprojectPoint(pt.northing, pt.easting, newKey);
                            if (result) return { ...pt, latitude: result.lat, longitude: result.lng };
                          }
                          return pt;
                        }));
                        // Persist to project
                        if (!isDemoProject && projectId > 0) {
                          if (crsDebounceRef.current) clearTimeout(crsDebounceRef.current);
                          crsDebounceRef.current = setTimeout(() => {
                            updateProjectMutation.mutate({ id: projectId, defaultCrs: newKey });
                          }, 800);
                        }
                      }}
                      className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {crsZones.map(z => (
                        <option key={z.key} value={z.key}>{z.name} (EPSG:{z.epsg})</option>
                      ))}
                    </select>
                    {updateProjectMutation.isPending && (
                      <span className="text-xs text-muted-foreground">Saving…</span>
                    )}
                  </div>

                  {surveyPoints.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-10 text-center">
                        <ScanLine className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <h3 className="text-base font-semibold mb-1">No survey points extracted yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          Use the <strong>Import Survey Points → PDF</strong> tab inside the map's Overlay Manager to scan an engineering PDF and extract PNEZD control points.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="px-2 py-2 text-left font-semibold text-muted-foreground">#</th>
                            <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Point ID</th>
                            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Northing</th>
                            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Easting</th>
                            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Elev</th>
                            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Lat</th>
                            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Lng</th>
                            <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {surveyPoints.map((pt, i) => {
                            const editableCell = (field: keyof ConvertedCoordinatePoint, value: string | number | null | undefined, align: 'left' | 'right' = 'right') => {
                              const cellId = `${i}-${field}`;
                              const isInvalid = invalidCells.has(cellId);
                              return (
                                <td className={`px-1 py-1 ${align === 'right' ? 'text-right' : 'text-left'}`}>
                                  <input
                                    type="text"
                                    defaultValue={value != null ? String(value) : ''}
                                    onBlur={e => handleSurveyEdit(i, field, e.target.value)}
                                    className={`w-full bg-transparent font-mono text-xs text-right px-1 py-0.5 rounded border ${
                                      isInvalid
                                        ? 'border-red-500 text-red-400'
                                        : 'border-transparent hover:border-border focus:border-orange-500'
                                    } focus:outline-none focus:bg-muted/30 transition-colors`}
                                    style={{ minWidth: field === 'description' ? '80px' : '70px', textAlign: align }}
                                  />
                                </td>
                              );
                            };
                            return (
                              <tr key={pt.index} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                                i % 2 === 0 ? '' : 'bg-muted/10'
                              }`}>
                                <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                                <td className="px-2 py-1 font-medium text-orange-400">{pt.identifier || `SP-${pt.index + 1}`}</td>
                                {editableCell('northing', pt.northing != null ? pt.northing.toFixed(3) : '', 'right')}
                                {editableCell('easting', pt.easting != null ? pt.easting.toFixed(3) : '', 'right')}
                                {editableCell('elevation', pt.elevation != null ? pt.elevation.toFixed(3) : '', 'right')}
                                <td className="px-2 py-1 text-right font-mono text-muted-foreground">{pt.latitude.toFixed(7)}</td>
                                <td className="px-2 py-1 text-right font-mono text-muted-foreground">{pt.longitude.toFixed(7)}</td>
                                {editableCell('description', pt.description || '', 'left')}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border/50">
                        Click any Northing, Easting, Elev, or Description cell to edit. Lat/Lng update automatically when Northing or Easting changes.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reports Tab */}
              {activeTab === 'reports' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-5">
                    Generate and export project reports. All reports are compiled from the current project data.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setReportDialogOpen(true)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-orange-500/40 hover:bg-orange-500/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Generate Report</p>
                        <p className="text-xs text-muted-foreground">Full project summary PDF</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setCorrectiveReportOpen(true)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-red-500/40 hover:bg-red-500/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Corrective Actions Report</p>
                        <p className="text-xs text-muted-foreground">Document corrective actions</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setPunchlistReportOpen(true)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Punchlist Report</p>
                        <p className="text-xs text-muted-foreground">Track outstanding items</p>
                      </div>
                    </button>

                    <button
                      onClick={() => isDemoProject ? toast.info('Export disabled on demo project') : setExportDialogOpen(true)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-purple-500/40 hover:bg-purple-500/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Download className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Export GPS Data</p>
                        <p className="text-xs text-muted-foreground">KML, CSV, GeoJSON, GPX</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        if (surveyPoints.length === 0) {
                          toast.info('No survey points to export. Extract points via the map\'s PDF tool first.');
                          return;
                        }
                        const rows = ['Point ID,Northing,Easting,Latitude,Longitude'];
                        surveyPoints.forEach((pt) => {
                          rows.push(`${pt.identifier || 'SP-' + (pt.index + 1)},${pt.northing ?? ''},${pt.easting ?? ''},${pt.latitude},${pt.longitude}`);
                        });
                        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `${project.name}-survey-points.csv`; a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Survey points exported as CSV');
                      }}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <ScanLine className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Export Smart Survey</p>
                        <p className="text-xs text-muted-foreground">Download survey points as CSV</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Project Metadata */}
            <motion.div variants={fadeInUp} className="mt-8 text-sm text-muted-foreground">
              <p>Created on {formattedCreatedDate}</p>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Dialogs */}
      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onOpenLogoDialog={() => setLogoDialogOpen(true)}
      />

      <DeleteProjectDialog
        project={project}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      <MediaUploadDialog
        projectId={projectId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <ExportDataDialog
        projectId={projectId}
        projectName={project.name}
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      <ShareProjectDialog
        projectId={projectId}
        projectName={project.name}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      <NewFlightDialog
        projectId={projectId}
        open={newFlightDialogOpen}
        onOpenChange={setNewFlightDialogOpen}
      />

      <ReportGeneratorDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        projectId={projectId}
        projectName={project?.name || "Project"}
        media={mediaList || []}
        isDemoProject={isDemoProject}
      />

      <IssueReportDialog
        projectId={projectId}
        projectName={project?.name || "Project"}
        issueReportType="corrective"
        open={correctiveReportOpen}
        onOpenChange={setCorrectiveReportOpen}
      />

      <IssueReportDialog
        projectId={projectId}
        projectName={project?.name || "Project"}
        issueReportType="punchlist"
        open={punchlistReportOpen}
        onOpenChange={setPunchlistReportOpen}
      />

      <WarrantyReminderDialog
        projectId={projectId}
        projectName={project?.name || "Project"}
        warrantyStartDate={project?.warrantyStartDate ? new Date(project.warrantyStartDate) : null}
        warrantyEndDate={project?.warrantyEndDate ? new Date(project.warrantyEndDate) : null}
        open={warrantyReminderDialogOpen}
        onOpenChange={setWarrantyReminderDialogOpen}
      />

      <ProjectLogoDialog
        projectId={projectId}
        currentLogoUrl={project?.logoUrl}
        open={logoDialogOpen}
        onOpenChange={setLogoDialogOpen}
      />

      {/* Sample Report Dialog - Shows the PDF sample report */}
      {sampleReportDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Sample Project Report</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSampleReportDialogOpen(false)}
              >
                X
              </Button>
            </div>
            <div className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
              <h3 className="text-xl font-semibold mb-2">DemoSampleReport.pdf</h3>
              <p className="text-muted-foreground mb-6">Click below to view the sample project report</p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  window.open('https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/riHovZjBSqWGYnSa.pdf', '_blank');
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                View PDF
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden file input for overlay upload — MUST be outside all dropdowns/popovers */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={onFileSelected}
      />

      {/* Full-screen uploading overlay */}
      {isUploadingOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Layers className="absolute inset-0 m-auto h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Adding Map Overlay</p>
              <p className="text-sm text-muted-foreground mt-1">PDF files may take 10–20 seconds to render…</p>
              <p className="text-xs text-muted-foreground/60 mt-2">Please wait, do not close this page</p>
            </div>
            {/* Animated progress bar */}
            <div className="w-full bg-primary/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ animation: 'progress 18s ease-in-out forwards' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
