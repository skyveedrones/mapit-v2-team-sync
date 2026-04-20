import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

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

export const GlobalHamburgerHeader = () => {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const handleSignIn = () => {
    window.location.href = getLoginUrl();
  };

  const handleDashboard = () => {
    setLocation("/dashboard");
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isAppRoute = location.startsWith("/dashboard") || location.startsWith("/project");

  const isHowItWorksActive = false;
  const isMunicipalActive = location === "/municipal";
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
          onClick={() => setLocation("/")}
        >
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/mapit-logo-transparent_db1582d4.webp"
            alt="MAPIT"
            className="h-10 w-auto object-contain select-none"
            draggable={false}
          />
        </div>

        {/* CENTER: Navigation */}
        <nav className="hidden md:flex items-center gap-12">
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
            label="Pricing"
            onClick={() => setLocation("/pricing")}
            isActive={isPricingActive}
          />
        </nav>

        {/* RIGHT: Sign In / Dashboard + Get Started */}
        <div className="flex items-center gap-3">
          {!loading && (
            isAuthenticated ? (
              <button
                onClick={handleDashboard}
                style={navLinkStyle}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={handleSignIn}
                  style={navLinkStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setLocation("/pricing")}
                  className="bg-black text-white font-bold text-sm px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}
                >
                  Get Started
                </button>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default GlobalHamburgerHeader;
