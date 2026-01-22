/**
 * SkyVee Dashboard - Protected page for authenticated users
 * Shows user projects and quick actions
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Project } from "../../../drizzle/schema";
import { motion } from "framer-motion";
import {
  Bell,
  FolderOpen,
  Home,
  Layers,
  LogOut,
  Map,
  Plus,
  Settings,
  Upload,
  User,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
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

const quickActions = [
  {
    icon: Upload,
    title: "Upload Media",
    description: "Upload drone photos and videos",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  {
    icon: Map,
    title: "View Maps",
    description: "Explore your flight data on maps",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    icon: Layers,
    title: "All Projects",
    description: "Browse all your projects",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Configure your account",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = trpc.project.list.useQuery();

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

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setEditDialogOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/images/skyvee-logo-white.png"
              alt="SkyVee"
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleComingSoon}
            >
              <Bell className="h-5 w-5" />
            </Button>
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
            {/* Welcome Section */}
            <motion.div variants={fadeInUp} className="mb-8">
              <h1
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Welcome back, {user?.name?.split(" ")[0] || "Pilot"}!
              </h1>
              <p className="text-muted-foreground">
                Manage your drone mapping projects and visualize your aerial data.
              </p>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={fadeInUp} className="mb-12">
              <h2
                className="text-xl font-semibold mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Quick Actions
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <Card
                    key={action.title}
                    className="glow-card cursor-pointer group hover:border-primary/50 transition-all"
                    onClick={handleComingSoon}
                  >
                    <CardContent className="pt-6">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center border ${action.color} group-hover:scale-110 transition-transform mb-3`}
                      >
                        <action.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* Projects Section */}
            <motion.div variants={fadeInUp}>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-xl font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Your Projects
                </h2>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>

              {/* Projects Grid */}
              {projectsLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-32 w-full" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={handleEditProject}
                      onDelete={handleDeleteProject}
                    />
                  ))}
                </div>
              ) : (
                /* Empty State */
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      Create your first drone mapping project to start organizing and visualizing your aerial footage.
                    </p>
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Project
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Help Section */}
            <motion.div variants={fadeInUp} className="mt-12">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">
                        Need help getting started?
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Check out our quick start guide to learn how to upload your first drone footage and create interactive maps.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground whitespace-nowrap"
                      onClick={handleComingSoon}
                    >
                      View Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Dialogs */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <EditProjectDialog
        project={selectedProject}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      <DeleteProjectDialog
        project={selectedProject}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
