import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

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

  // Determine if we should show the navigation (hide on app routes like /dashboard, /project, etc.)
  const isAppRoute = location.startsWith("/dashboard") || location.startsWith("/project");

  // Check which nav item is active
  const isHowItWorksActive = location === "/" && false; // Only active when user scrolls to section
  const isMunicipalActive = location === "/municipal";
  const isPricingActive = location === "/pricing";

  if (isAppRoute) {
    return null; // Don't render on app routes
  }

  const NavLink = ({ label, onClick, isActive }: { label: string; onClick: () => void; isActive: boolean }) => (
    <button
      onClick={onClick}
      className="relative text-muted-foreground hover:text-foreground font-medium text-sm transition-colors duration-200 group"
    >
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-foreground rounded-full mt-1" />
      )}
    </button>
  );

  return (
    <header className="sticky top-0 left-0 w-full z-50 backdrop-blur-md bg-white/70 border-b border-border/30">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* LOGO — 64px height with 8px vertical margin */}
        <div
          className="flex items-center cursor-pointer py-2"
          onClick={() => setLocation("/")}
        >
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/mapit-logo-transparent_db1582d4.webp"
            alt="MAPIT"
            className="h-16 w-auto object-contain select-none transition-opacity hover:opacity-80"
            draggable={false}
          />
        </div>

        {/* CENTER: Navigation Items — generous spacing, no dividers */}
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

        {/* RIGHT: Sign In — white text, ghost/outline style */}
        <div>
          {!loading && (
            <button
              onClick={handleSignIn}
              className="text-white hover:text-white/80 font-medium text-sm transition-colors duration-200 px-3 py-1.5 rounded-md hover:bg-white/10"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default GlobalHamburgerHeader;
