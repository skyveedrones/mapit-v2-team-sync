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
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import ContactModal from "@/components/ContactModal";
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
  Cpu,
  LayoutDashboard,
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
  const [showContactModal, setShowContactModal] = useState(false);
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
                className="h-12 md:h-14 w-auto relative z-10 transition-transform group-hover:scale-105"
              />
            </div>
          </div>

          {/* Navigation - Clean and Minimal */}
          <div className="flex items-center gap-6">
            {/* Desktop Navigation Links */}
            <div className="hidden sm:flex items-center gap-6">
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
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

            {/* Theme Toggle with Tooltip */}
            <div className="group relative">
              <button 
                onClick={toggleTheme} 
                className="p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-all origin-top-right bg-black border border-white/10 px-2 py-1 rounded text-[10px] text-primary font-bold tracking-widest uppercase z-[200] whitespace-nowrap">
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </div>
            </div>

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
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
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
      <section className="relative flex flex-col items-center justify-start pt-0">
        <div className="relative z-10 text-center pt-2 md:pt-3 lg:pt-4 w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >




          </motion.div>
        </div>

        {/* Video Section with CTA Buttons */}
        <section className="relative w-full pt-20 lg:pt-24 h-[70vh] min-h-[500px] overflow-hidden bg-black pb-0">
          {/* 1. THE VIDEO: Forced to cover every pixel */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/VideoProject_e838c8e5.mp4" type="video/mp4" />
          </video>
          {/* 2. THE BASE OVERLAY: Uniform dark tint */}
          <div className="absolute inset-0 bg-black/50" />
          {/* 3. THE TOP GRADIENT: Fades from black to clear for the Nav */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black via-black/60 to-transparent z-10" />
          {/* 4. THE CONTENT: Centered perfectly over the video */}
          <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white text-4xl md:text-6xl font-extrabold tracking-tighter mb-4"
            >
              ELEVATE YOUR <span className="text-primary">VISION</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-200 text-lg md:text-xl max-w-2xl leading-relaxed"
            >
              Precise drone mapping and geospatial data for smarter project planning.
            </motion.p>
          </div>

        </section>
      </section>

      {/* --- 1. BUTTON BRIDGE & TOP DIVIDER --- */}
      <div className="bg-black py-12 flex flex-col md:flex-row justify-center items-center gap-6 relative z-50">
            <button onClick={() => setShowContactModal(true)} className="px-10 py-4 bg-[#14E114] text-black font-extrabold rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(20,225,20,0.3)] tracking-wide uppercase text-sm">
              Get Started
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="px-10 py-4 border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white font-bold rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-all tracking-wide uppercase text-sm">
              Learn More
            </button>
      </div>

      {/* --- 2. HOW IT WORKS (The Stepper) --- */}
      <section className="relative bg-white dark:bg-black pt-16 pb-32 px-6 z-40 transition-colors duration-300">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 font-orbitron">
                From Flight to <span className="text-[#14E114]">Data</span> in Minutes
              </h2>
              <p className="text-slate-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
                The streamlined workflow designed for drone professionals.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-50">
              {[
                { step: "01", title: "Upload", impact: "Drag, Drop, Done.", desc: "Instant cloud sync for high-res drone media.", icon: Upload },
                { step: "02", title: "Process", impact: "Auto-Telemetry.", desc: "AI-driven extraction of GPS and flight paths.", icon: Cpu },
                { step: "03", title: "Visualize", impact: "Map Your Success.", desc: "Interactive 3D maps and pro-grade exports.", icon: LayoutDashboard },
              ].map((item, idx) => (
                <div key={idx} className="group p-8 rounded-2xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 hover:border-[#14E114]/40 transition-all duration-500 shadow-sm hover:shadow-xl">
                  <div className="text-[#14E114] font-bold text-xs tracking-widest mb-4 opacity-60 uppercase font-orbitron">Step {item.step}</div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-orbitron">{item.title}</h3>
                  <p className="text-[#14E114] font-medium italic mb-4 text-sm">{item.impact}</p>
                  <p className="text-slate-600 dark:text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DIVIDER: Topographic Slant into Features */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] transform rotate-180">
            <svg className="relative block w-[calc(100%+1.3px)] h-20 text-slate-100 dark:text-[#050505] fill-current" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M1200 120L0 120 307.75 0 1200 120z"></path>
            </svg>
          </div>
        </section>

      {/* --- 3. FEATURES SECTION (Clickable Cards) --- */}
      <section id="features" className="relative bg-slate-100 dark:bg-[#050505] pt-32 pb-24 px-6 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 font-orbitron">
              Powerful Drone <span className="text-[#14E114]">Mapping</span> Features
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Link key={index} href={feature.link}>
                <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-[#14E114]/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                  <div className="h-48 overflow-hidden bg-slate-200 dark:bg-gray-900 relative">
                    <img src={feature.image} alt={feature.title} className="w-full h-full object-cover opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-all duration-700"
                      onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80"; }} />
                    <div className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-lg text-[#14E114] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-3">
                      <feature.icon className="text-[#14E114]" size={20} />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white font-orbitron">{feature.title}</h3>
                    </div>
                    <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- 4. UNIVERSAL COMPATIBILITY (Neon Mapping Grid) --- */}
      <section className="relative bg-white dark:bg-black py-24 border-y border-slate-200 dark:border-white/5 z-20 transition-colors duration-300 overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(#14E114 1px, transparent 1px), linear-gradient(90deg, #14E114 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-sm font-bold tracking-[0.3em] text-[#14E114] uppercase mb-4 font-orbitron">Universal Integration</h2>
          <h3 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white font-orbitron">MAPIT is compatible with <span className="text-[#14E114]">any</span> drone.</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 items-center justify-items-center opacity-60 dark:opacity-40 mt-16">
            {['DJI', 'AUTEL', 'PARROT', 'SKYDIO', 'MAVLINK', 'FIXED WING'].map((brand) => (
              <div key={brand} className="flex flex-col items-center group">
                <span className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-[#14E114] transition-colors">{brand}</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 mt-1">Professional</span>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* SECTION 5: CTA - Ready to Map */}
      <section className="py-16 relative overflow-hidden">
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

      {/* Footer - Using new component */}
      <Footer />

      {/* Download Dialog */}
      {showDownloadDialog && (
        <AppDownloadDialog
          open={showDownloadDialog}
          onOpenChange={setShowDownloadDialog}
        />
      )}
      
      {/* Contact Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  );
}
