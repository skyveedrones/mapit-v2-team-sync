import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.9)",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  fontSize: "0.875rem",
  transition: "color 0.2s ease",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  position: "relative",
};

interface GlobalHamburgerHeaderProps {
  onBriefingRequest?: () => void;
}

function GlobalHamburgerHeader({ onBriefingRequest }: GlobalHamburgerHeaderProps = {}) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = () => {
    window.location.href = getLoginUrl();
  };

  const handleDashboard = () => {
    setLocation("/dashboard");
    setMenuOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMenuOpen(false);
    }
  };

  const isAppRoute = location.startsWith("/dashboard") || location.startsWith("/project");

  const isHowItWorksActive = false;
  const isMunicipalActive = location === "/municipal";
  const isProvidersActive = location === "/providers";
  const isPricingActive = location === "/pricing";

  if (isAppRoute) {
    return null;
  }

  const NavLink = ({ label, onClick, isActive }: { label: string; onClick: () => void; isActive: boolean }) => (
    <button
      onClick={onClick}
      style={navLinkStyle}
      onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,1)")}
      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
    >
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
      )}
    </button>
  );

  return (
    <>
      <header
        className="sticky top-0 left-0 w-full z-50 border-b border-white/10"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          {/* LOGO */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              setLocation("/");
              setMenuOpen(false);
            }}
          >
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/mapit-logo-transparent_db1582d4.webp"
              alt="MAPIT"
              className="h-12 w-auto object-contain select-none brightness-0 invert md:brightness-100 md:invert-0"
              draggable={false}
            />
          </div>

          {/* CENTER: Navigation - HIDDEN */}
          <nav className="hidden">
            {location === "/" && (
              <NavLink
                label="How It Works"
                onClick={() => scrollToSection("how-it-works")}
                isActive={isHowItWorksActive}
              />
            )}
            <NavLink
              label="Municipal"
              onClick={() => setLocation("/municipal")}
              isActive={isMunicipalActive}
            />
            <NavLink
              label="For Pilots"
              onClick={() => setLocation("/providers")}
              isActive={isProvidersActive}
            />
            <NavLink
              label="Pricing"
              onClick={() => setLocation("/pricing")}
              isActive={isPricingActive}
            />
          </nav>

          {/* RIGHT: Hamburger Menu Icon */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center justify-center w-8 h-8 hover:opacity-75 transition-opacity"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </header>

      {/* MENU OVERLAY */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setMenuOpen(false)}
          style={{
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        />
      )}

      {/* SLIDE-OUT MENU PANEL */}
      <div
        className={`fixed top-12 right-0 w-full max-w-sm bg-black/95 border-l border-white/10 z-50 transition-transform duration-300 ease-out overflow-y-auto max-h-[calc(100vh-48px)] ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <nav className="flex flex-col p-6 gap-6">
          {/* Navigation Links */}
          <button
            onClick={() => {
              setLocation("/");
              setMenuOpen(false);
            }}
            className="text-left text-white/90 hover:text-white transition-colors font-medium text-base"
          >
            Home
          </button>

          <button
            onClick={() => {
              setLocation("/municipal");
              setMenuOpen(false);
            }}
            className="text-left text-white/90 hover:text-white transition-colors font-medium text-base"
          >
            Municipal
          </button>
          <button
            onClick={() => {
              setLocation("/providers");
              setMenuOpen(false);
            }}
            className="text-left text-white/90 hover:text-white transition-colors font-medium text-base"
          >
            For Pilots
          </button>
          <button
            onClick={() => {
              setLocation("/pricing");
              setMenuOpen(false);
            }}
            className="text-left text-white/90 hover:text-white transition-colors font-medium text-base"
          >
            Pricing
          </button>
          <button
            onClick={() => {
              onBriefingRequest?.();
              setMenuOpen(false);
            }}
            className="text-left text-white/90 hover:text-white transition-colors font-medium text-base"
          >
            Briefing Request
          </button>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Auth Section */}
          {!loading && (
            isAuthenticated ? (
              <button
                onClick={handleDashboard}
                className="text-left text-white/90 hover:text-white transition-colors font-medium text-base"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={handleSignIn}
                  className="text-left text-white/90 hover:text-white transition-colors font-medium text-base"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setLocation("/pricing");
                    setMenuOpen(false);
                  }}
                  className="bg-white text-black font-bold text-sm px-4 py-2 rounded-full hover:bg-gray-200 transition-colors w-full"
                >
                  Choose Your Plan
                </button>
              </>
            )
          )}
        </nav>
      </div>
    </>
  );
}

export { GlobalHamburgerHeader };
export default GlobalHamburgerHeader;
export type { GlobalHamburgerHeaderProps };
