import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Cpu, LayoutDashboard, ChevronRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import Link from "next/link";
import { ContactModal } from "@/components/ContactModal";
import { Features } from "@/components/Features";

export default function Home() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [setLocation] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  const features = [
    {
      title: "Easy Upload",
      description: "Upload drone photos and videos with automatic GPS metadata extraction",
      image: "/images/feature-upload.jpg",
      icon: Upload,
      link: "#upload",
    },
    {
      title: "Interactive Maps",
      description: "Visualize your flights on Google Maps with markers, popups, and key data",
      image: "/images/feature-maps.jpg",
      icon: LayoutDashboard,
      link: "#maps",
    },
    {
      title: "Flight Path Tracking",
      description: "Automatic flight path visualization connecting sequential GPS points",
      image: "/images/feature-flightpath.jpg",
      icon: Upload,
      link: "#tracking",
    },
    {
      title: "GPS Data Export",
      description: "Export in KML, CSV, GeoJSON, and GPX formats for any mapping software",
      image: "/images/gps-data-export.png",
      icon: Cpu,
      link: "#export",
    },
    {
      title: "PDF Map Overlay",
      description: "Overlay construction plans and blueprints on your maps with precise corner positioning",
      image: "/images/feature-overlay.jpg",
      icon: LayoutDashboard,
      link: "#overlay",
    },
    {
      title: "Project Templates",
      description: "Save and reuse project configurations for faster workflow and consistent results",
      image: "/images/SxjCbukJOAezRSZP.png",
      icon: Upload,
      link: "#templates",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative bg-white dark:bg-black pt-32 pb-0 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white mb-6 font-orbitron">
              ELEVATE YOUR <span className="text-[#14E114]">VISION</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
              Precise drone mapping and geospatial data for smarter project planning.
            </p>
          </div>

          {/* Video Embed */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl mb-8">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="MAPIT Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>
        </div>
      </section>

      {/* --- 1. BUTTON BRIDGE (Theme Responsive) --- */}
      <div className="bg-white dark:bg-black pt-20 pb-10 flex flex-col md:flex-row justify-center items-center gap-6 relative z-50 transition-colors duration-300">
        <button 
          onClick={() => setShowContactModal(true)}
          className="px-10 py-4 bg-[#14E114] text-black font-extrabold rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(20,225,20,0.3)] tracking-wide uppercase text-sm"
        >
          Get Started
        </button>
        <button 
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          className="px-10 py-4 border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white font-bold rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-all tracking-wide uppercase text-sm"
        >
          Learn More
        </button>
      </div>

      {/* --- 2. HOW IT WORKS (Stepper Cards) --- */}
      <section className="relative bg-white dark:bg-black pt-16 pb-32 px-6 z-40 transition-colors duration-300">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 font-orbitron">
              From Flight to <span className="text-[#14E114]">Data</span> in Minutes
            </h2>
            <p className="text-slate-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
              The streamlined workflow designed for drone professionals and project managers.
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
                <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* DIVIDER: Topographic Slant */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] transform rotate-180">
          <svg className="relative block w-[calc(100%+1.3px)] h-20 text-slate-50 dark:text-black fill-current" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M1200 120L0 120 307.75 0 1200 120z"></path>
          </svg>
        </div>
      </section>

      {/* --- 3. FEATURES SECTION (Restored Links & Mobile Brightness) --- */}
      <section id="features" className="relative bg-slate-50 dark:bg-black pt-24 pb-24 px-6 z-10 border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 font-orbitron">
              Powerful Drone <span className="text-[#14E114]">Mapping</span> Features
            </h2>
            <p className="text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage and share your aerial projects in one professional interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <a key={index} href={feature.link}>
                <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-[#14E114]/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                  <div className="h-48 overflow-hidden bg-slate-200 dark:bg-gray-900 relative">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-full object-cover opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-all duration-700"
                      onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80"; }}
                    />
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
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* --- 4. UNIVERSAL COMPATIBILITY (With Neon Mapping Grid) --- */}
      <section className="relative bg-white dark:bg-black py-24 border-y border-slate-200 dark:border-white/5 z-20 transition-colors duration-300 overflow-hidden">
        {/* NEON MAPPING GRID PATTERN */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.12]"
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

      {/* CTA Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        <div className="absolute inset-0 grid-pattern" />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
              Ready to Map Your Projects?
            </h2>
            <p className="text-slate-600 dark:text-gray-400 mb-8">
              Start organizing and visualizing your drone footage today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg px-8 py-6 rounded-lg"
                onClick={() => setShowContactModal(true)}
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6 rounded-lg"
                onClick={() => setLocation('/welcome')}
              >
                Start New Trial
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
      )}
    </div>
  );
}
