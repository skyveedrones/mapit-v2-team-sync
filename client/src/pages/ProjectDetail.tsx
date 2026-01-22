/**
 * Project Detail Page
 * Shows detailed view of a single project with management options
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Project } from "../../../drizzle/schema";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  FolderOpen,
  Image,
  Layers,
  LogOut,
  Map,
  MapPin,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Upload,
  User,
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

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch project details
  const { data: project, isLoading, error } = trpc.project.get.useQuery(
    { id: projectId },
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
              <img src="/images/skyvee-logo-white.png" alt="SkyVee" className="h-8 w-auto" />
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
              <img src="/images/skyvee-logo-white.png" alt="SkyVee" className="h-8 w-auto" />
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/skyvee-logo-white.png" alt="SkyVee" className="h-8 w-auto" />
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
                <div>
                  <div className="flex items-center gap-3 mb-2">
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
                  </div>
                  {project.description && (
                    <p className="text-muted-foreground max-w-2xl">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-border"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Project Info Cards */}
            <motion.div variants={fadeInUp} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {project.location && (
                <Card className="bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Location</span>
                    </div>
                    <p className="font-medium">{project.location}</p>
                  </CardContent>
                </Card>
              )}

              {project.clientName && (
                <Card className="bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <User className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Client</span>
                    </div>
                    <p className="font-medium">{project.clientName}</p>
                  </CardContent>
                </Card>
              )}

              {formattedFlightDate && (
                <Card className="bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Flight Date</span>
                    </div>
                    <p className="font-medium">{formattedFlightDate}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Image className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wide">Media Items</span>
                  </div>
                  <p className="font-medium">{project.mediaCount} items</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions for Project */}
            <motion.div variants={fadeInUp} className="mb-8">
              <h2
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Project Actions
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                  className="glow-card cursor-pointer group hover:border-primary/50 transition-all"
                  onClick={handleComingSoon}
                >
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:scale-110 transition-transform mb-3">
                      <Upload className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                      Upload Media
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Add photos and videos to this project
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="glow-card cursor-pointer group hover:border-primary/50 transition-all"
                  onClick={handleComingSoon}
                >
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border bg-blue-500/10 text-blue-500 border-blue-500/20 group-hover:scale-110 transition-transform mb-3">
                      <Map className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                      View Map
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      See media locations on interactive map
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="glow-card cursor-pointer group hover:border-primary/50 transition-all"
                  onClick={handleComingSoon}
                >
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border bg-purple-500/10 text-purple-500 border-purple-500/20 group-hover:scale-110 transition-transform mb-3">
                      <Layers className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                      PDF Overlay
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Add construction plans to the map
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="glow-card cursor-pointer group hover:border-primary/50 transition-all"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border bg-orange-500/10 text-orange-500 border-orange-500/20 group-hover:scale-110 transition-transform mb-3">
                      <Settings className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                      Project Settings
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Edit project details and status
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Media Section - Empty State */}
            <motion.div variants={fadeInUp}>
              <h2
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Project Media
              </h2>
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No media uploaded yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Upload drone photos and videos to this project. Media with GPS data will automatically appear on the map.
                  </p>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleComingSoon}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Media
                  </Button>
                </CardContent>
              </Card>
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
    </div>
  );
}
