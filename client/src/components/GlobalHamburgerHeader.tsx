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
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* LOGO — small and crisp */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => setLocation("/")}
        >
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/mapit-logo-transparent_db1582d4.webp"
            alt="MAPIT"
            className="h-8 w-auto object-contain select-none"
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

        {/* RIGHT: Sign In / Dashboard + Get Started */}
        <div className="flex items-center gap-3">
          {!loading && (
            isAuthenticated ? (
              <button
                onClick={handleDashboard}
                className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors duration-200"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={handleSignIn}
                  className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors duration-200"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setLocation("/pricing")}
                  className="bg-black text-white font-bold text-sm px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors"
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
