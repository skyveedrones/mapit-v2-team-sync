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
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Upload,
  Map,
  Route,
  Download,
  Layers,
  Smartphone,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { useState } from "react";
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
    image: "/images/feature-export-new.png",
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
    icon: Smartphone,
    title: "Install as App",
    description:
      "Install on your phone or desktop for quick access and offline use - works anywhere",
    image: "/images/feature-install-new.png",
    link: "/features/install-as-app",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <a href="https://www.skyveedrones.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <img
              src="/images/skyvee-logo-white.png"
              alt="SkyVee Drones"
              className="h-10 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-foreground hover:text-primary"
              onClick={() => setLocation("/pricing")}
            >
              Pricing
            </Button>
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{user.name || user.email || "User"}</span>
                </div>
                <Button
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setLocation("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setLocation("/dashboard")}
                >
                  Client Portal
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Login"}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background"
          >
            <div className="container py-4 flex flex-col gap-2">
              <Button
                variant="ghost"
                className="w-full text-foreground"
                onClick={() => {
                  setLocation("/pricing");
                  setMobileMenuOpen(false);
                }}
              >
                Pricing
              </Button>
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <User className="h-4 w-4" />
                    <span>{user.name || user.email || "User"}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 text-primary"
                    onClick={() => setLocation("/dashboard")}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 text-primary"
                    onClick={() => setLocation("/dashboard")}
                  >
                    Client Portal
                  </Button>
                  <Button
                    className="w-full bg-primary text-primary-foreground"
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Login"}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="container relative z-10 text-center py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="mb-8">
              <img
                src="/images/mapit-logo-new.png"
                alt="Mapit"
                className="h-28 md:h-36 lg:h-40 w-auto mx-auto"
              />
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ELEVATE YOUR VISION
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Delivering precision drone mapping solutions that empower smarter
              project planning, monitoring, and decision-making.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-lg shadow-lg shadow-primary/25"
                  onClick={() => setLocation("/dashboard")}
                >
                  Go to Dashboard
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-lg shadow-lg shadow-primary/25"
                  onClick={handleLogin}
                >
                  Get Started
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6 rounded-lg"
                onClick={() => setLocation("/pricing")}
              >
                View Pricing
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
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
                  className="glow-card overflow-hidden cursor-pointer group h-full"
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
      <section className="py-24 relative overflow-hidden">
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
            <motion.div variants={fadeInUp}>
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-lg shadow-lg shadow-primary/25"
                onClick={isAuthenticated ? () => setLocation("/dashboard") : handleLogin}
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                <ChevronRight className="ml-2 h-5 w-5" />
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
                className="h-6 w-auto opacity-60"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Mapit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
