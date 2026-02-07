/**
 * Project Detail Page
 * Shows detailed view of a single project with management options
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useClientAccess } from "@/hooks/useClientAccess";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { EmbeddedProjectMap } from "@/components/EmbeddedProjectMap";
import { ExportDataDialog } from "@/components/ExportDataDialog";
import { FlightCard } from "@/components/FlightCard";
import { MediaGallery } from "@/components/MediaGallery";
import { MediaUploadDialog } from "@/components/MediaUploadDialog";
import { NewFlightDialog } from "@/components/NewFlightDialog";
import { ReportGeneratorDialog } from "@/components/ReportGeneratorDialog";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
import { WarrantyReminderDialog } from "@/components/WarrantyReminderDialog";
import { ProjectLogoDialog } from "@/components/ProjectLogoDialog";
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
} from "lucide-react";
import { useState } from "react";
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
  
  // Check if this is the demo project (read-only mode)
  const isDemoProject = projectId === 1;
  
  // Check user access permissions for this project
  const { isClientOnly, canEdit, canDelete } = useClientAccess(projectId);
  // Override permissions for demo project
  // Allow authenticated users (owner) to upload to demo, but prevent unauthenticated visitors from editing
  const demoCanEdit = isDemoProject ? (user ? canEdit : false) : canEdit;
  const demoCanDelete = isDemoProject ? false : canDelete;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [newFlightDialogOpen, setNewFlightDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [warrantyReminderDialogOpen, setWarrantyReminderDialogOpen] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);

  // Fetch project details - use public demo procedures if accessing demo project
  const { data: project, isLoading, error } = isDemoProject
    ? trpc.project.getDemo.useQuery(
        { id: projectId },
        { enabled: projectId > 0 }
      )
    : trpc.project.get.useQuery(
        { id: projectId },
        { enabled: projectId > 0 }
      );

  // Fetch media list to determine if we show gallery or empty state
  const { data: mediaList } = isDemoProject
    ? trpc.media.listDemo.useQuery(
        { projectId },
        { enabled: projectId > 0 }
      )
    : trpc.media.list.useQuery(
        { projectId },
        { enabled: projectId > 0 }
      );

  // Fetch flights for this project
  const { data: flights } = isDemoProject
    ? trpc.flight.listDemo.useQuery(
        { projectId },
        { enabled: projectId > 0 }
      )
    : trpc.flight.list.useQuery(
        { projectId },
        { enabled: projectId > 0 }
      );

  const handleComingSoon = () => {
    toast.info("Feature coming soon!", {
      description: "This feature is currently under development.",
    });
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
              <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-8 w-auto" />
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
              <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-8 w-auto" />
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
                <Link href="/dashboard">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.name || user?.email || "User"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
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
            {/* Back Button & Header */}
            <motion.div variants={fadeInUp} className="mb-6">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mb-4 -ml-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
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
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Project Actions
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Owner and editor actions */}
                      {demoCanEdit && (
                        <DropdownMenuItem onClick={() => setNewFlightDialogOpen(true)}>
                          <Plane className="h-4 w-4 mr-2 text-sky-500" />
                          New Flight
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                        <FileText className="h-4 w-4 mr-2 text-orange-500" />
                        Generate Report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
                        <Download className="h-4 w-4 mr-2 text-purple-500" />
                        Export GPS Data
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleComingSoon}>
                        <Layers className="h-4 w-4 mr-2 text-orange-500" />
                        PDF Overlay
                      </DropdownMenuItem>
                      
                      {/* Owner-only actions */}
                      {isOwner && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                            <Users className="h-4 w-4 mr-2 text-cyan-500" />
                            Share Project
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setLogoDialogOpen(true)}>
                            <ImagePlus className="h-4 w-4 mr-2 text-pink-500" />
                            {project.logoUrl ? 'Change Logo' : 'Upload Logo'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
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
                    {project.clientName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Client:</span>
                        <span className="font-medium">{project.clientName}</span>
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
                    {/* Drone Pilot Info */}
                    {project.dronePilot && (
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Pilot:</span>
                        <span className="font-medium">{project.dronePilot}</span>
                      </div>
                    )}
                    {project.faaLicenseNumber && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">FAA License:</span>
                        <span className="font-medium">{project.faaLicenseNumber}</span>
                      </div>
                    )}
                    {project.laancAuthNumber && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">LAANC Auth:</span>
                        <span className="font-medium">{project.laancAuthNumber}</span>
                      </div>
                    )}
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

            {/* Project Map Section */}
            <motion.div variants={fadeInUp} className="mb-8">
              <EmbeddedProjectMap
                projectId={project.id}
                projectName={project.name}
                isDemoProject={isDemoProject}
              />
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

            {/* Media Section */}
            <motion.div variants={fadeInUp}>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Project Media
                </h2>
              </div>

              {hasMedia ? (
                <MediaGallery
                  isDemoProject={isDemoProject}
                  projectId={projectId} 
                  canEdit={canEdit}
                  onUploadClick={() => setUploadDialogOpen(true)}
                />
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No media uploaded yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      {demoCanEdit 
                        ? "Upload drone photos and videos to this project. Media with GPS data will automatically appear on the map."
                        : "No media has been uploaded to this project yet."}
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
    </div>
  );
}
