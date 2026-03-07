/**
 * Mapit - Home Page
 * Design: Aurora Borealis Theme
 * - Dark forest green interface with lime/neon green accents
 * - Colors: Spearmint #117660, Forest Green #09323B, Lime Green #04B16F, Neon Green #14E114
 * - Orbitron display font, Inter body font
 * - Glowing card effects on hover
 * - Grid/topographic patterns
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { AppDownloadDialog } from "@/components/AppDownloadDialog";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import {
  Upload,
  Map,
  Route,
  Download,
  Layers,
  FileText,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  Moon,
  Sun,
  Eye,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";

const features = [
  {
    icon: Upload,
    title: "Easy Upload",
    description:
      "Upload drone photos and videos with automatic GPS metadata extraction",
    image: "/images/feature-upload-new.jpg",
    link: "/features/easy-upload",
  },
  {
    icon: Map,
    title: "Interactive Maps",
    description:
      "Visualize your flights on Google Maps with markers, popups, and key data",
    image: "/images/feature-maps-new.jpg",
    link: "/features/interactive-maps",
  },
  {
    icon: Route,
    title: "Flight Path Tracking",
    description:
      "Automatic flight path visualization connecting sequential GPS points",
    image: "/images/feature-flightpath-new.jpg",
    link: "/features/flight-path-tracking",
  },
  {
    icon: Download,
    title: "GPS Data Export",
    description:
      "Export in KML, CSV, GeoJSON, and GPX formats for any mapping software",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/gkNBTHRsPHDBWczp.png",
    link: "/features/gps-data-export",
  },
  {
    icon: Layers,
    title: "PDF Map Overlay",
    description:
      "Overlay construction plans and blueprints on your maps with precise corner positioning",
    image: "/images/feature-overlay-new.jpg",
    link: "/features/pdf-map-overlay",
  },

  {
    icon: FileText,
    title: "Project Templates",
    description:
      "Save project configurations as templates and create new projects in seconds",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/SxjCbukJOAezRSZP.png",
    link: "/features/project-templates",
  },
];

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

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = () => {
    setLocation("/login");
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen text-foreground">
      {/* Minimalist Navigation - Scroll-triggered transition */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled
          ? 'bg-black/60 backdrop-blur-md border-b border-white/10'
          : 'bg-black/20 backdrop-blur-md border-b border-white/10'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Minimalist Logo Group with Hover Glow */}
          <div className="flex items-center gap-3 group cursor-pointer hover:opacity-90 transition-opacity">
            <div className="relative">
              {/* Subtle glow behind logo on hover */}
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src="/images/mapit-logo-new.png"
                alt="MAPIT"
                className="h-7 md:h-8 w-auto relative z-10 transition-transform group-hover:scale-105"
              />
            </div>
            <span className="text-white font-bold tracking-tighter text-lg md:text-xl relative z-10">
              MAPIT
            </span>
          </div>

          {/* Navigation - Clean and Minimal */}
          <div className="flex items-center gap-6">
            {/* Desktop Navigation Links */}
            <div className="hidden sm:flex items-center gap-6">
              <button
                onClick={() => setLocation("/demo")}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Services
              </button>
              <button
                onClick={() => setLocation("/pricing")}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Projects
              </button>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* CTA Button or Auth Buttons */}
            {isAuthenticated && user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white"
                  onClick={() => setLocation("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-full hover:shadow-[0_0_20px_rgba(20,225,20,0.4)] transition-all transform hover:scale-105 font-bold"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Get a Quote"}
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-gray-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden border-t border-white/10 bg-black/40 backdrop-blur-md"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  setLocation("/demo");
                  setMobileMenuOpen(false);
                }}
                className="text-left text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
              >
                Services
              </button>
              <button
                onClick={() => {
                  setLocation("/pricing");
                  setMobileMenuOpen(false);
                }}
                className="text-left text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
              >
                Projects
              </button>
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-300 py-2">
                    <User className="h-4 w-4" />
                    <span>{user.name || user.email || "User"}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-primary/50 text-primary"
                    onClick={() => {
                      setLocation("/dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-300"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-primary text-primary-foreground rounded-full font-bold mt-2"
                  onClick={() => {
                    handleLogin();
                    setMobileMenuOpen(false);
                  }}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Get a Quote"}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Top Gradient Overlay for Readability */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-start overflow-hidden pt-0">
        <div className="relative z-10 text-center pt-2 md:pt-3 lg:pt-4 w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="mb-8">
              {/* Glassmorphism Logo Container */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl blur-2xl" />
                <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
                  <img
                    src="/images/mapit-logo-new.png"
                    alt="Mapit - Professional Drone Mapping and Project Management Platform"
                    className="h-56 md:h-72 lg:h-80 w-auto mx-auto drop-shadow-lg"
                  />
                </div>
              </div>
            </motion.div>



          </motion.div>
        </div>

        {/* Edge-to-Edge Video Section - Robust Implementation */}
        <section className="relative w-full overflow-hidden bg-black aspect-video max-h-[70vh] flex items-center justify-center" style={{
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
        }}>
          <div className="absolute inset-0 w-full h-full">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              poster="/images/video-placeholder.jpg"
            >
              <source
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/VideoProject_e838c8e5.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>

            {/* Refined Overlay with Motion Animation */}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-6 backdrop-blur-[2px]">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-white text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow-2xl mb-6 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ELEVATE YOUR <span className="text-primary">VISION</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-gray-100 text-lg md:text-xl max-w-2xl drop-shadow-lg leading-relaxed"
              >
                Delivering precision drone mapping solutions that empower <span className="font-semibold">smarter project planning</span>, monitoring, and decision-making.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Scroll indicator - Hidden on small screens */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:flex"
        >
          <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-3 bg-primary rounded-full mt-2"
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 topo-pattern" />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Powerful Drone Mapping Features
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              Everything you need to manage, visualize, and share your aerial
              mapping projects
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <Link key={feature.title} href={feature.link}>
                <motion.div
                  variants={fadeInUp}
                  className="glow-card overflow-hidden cursor-pointer group h-full transition-transform duration-300 hover:-translate-y-2"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
                    e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
                  }}
                >
                  {/* Feature Image */}
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  {/* Feature Content */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3
                          className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        <div className="absolute inset-0 grid-pattern" />

        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Map Your Projects?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground mb-8"
            >
              Start organizing and visualizing your drone footage today
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6 rounded-lg"
                onClick={() => {
                  setLocation('/demo');
                }}
              >
                <Eye className="mr-2 h-5 w-5" />
                See Project Demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6 rounded-lg"
                onClick={() => {
                  trackEvent('demo_to_trial_click');
                  setLocation('/welcome');
                }}
              >
                <Zap className="mr-2 h-5 w-5" />
                Start New Trial
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/images/mapit-logo-new.png"
                alt="Mapit"
                className="h-12 w-auto opacity-60"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Mapit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Download Dialog */}
      {showDownloadDialog && (
        <AppDownloadDialog
          open={showDownloadDialog}
          onOpenChange={setShowDownloadDialog}
        />
      )}
    </div>
  );
}
