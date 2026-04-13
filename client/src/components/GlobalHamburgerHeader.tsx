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

  // Dark pages use black background; light pages use white frosted glass
  const isDarkPage = location === "/pricing" || location === "/municipal";

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
      className="relative font-medium text-sm transition-colors duration-200 group"
      style={{ color: isDarkPage ? "rgba(255,255,255,0.55)" : undefined }}
    >
      {label}
      {isActive && (
        <span
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full mt-1"
          style={{ background: isDarkPage ? "#10b981" : "currentColor" }}
        />
      )}
    </button>
  );

  return (
    <header
      className="sticky top-0 left-0 w-full z-50 backdrop-blur-md border-b"
      style={
        isDarkPage
          ? { background: "rgba(10,10,10,0.85)", borderColor: "rgba(255,255,255,0.07)" }
          : { background: "rgba(255,255,255,0.70)", borderColor: "rgba(0,0,0,0.08)" }
      }
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* LOGO — 64px height */}
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

        {/* CENTER: Navigation Items */}
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

        {/* RIGHT: Sign In / Dashboard — high-contrast button adapts to page theme */}
        <div>
          {!loading && (
            isAuthenticated ? (
              <button
                onClick={handleDashboard}
                className="font-semibold text-sm transition-all duration-200 px-5 py-2.5 rounded-lg active:scale-[0.97]"
                style={
                  isDarkPage
                    ? { background: "#ffffff", color: "#0A0A0A" }
                    : { background: "#0A0A0A", color: "#ffffff" }
                }
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                className="font-semibold text-sm transition-all duration-200 px-5 py-2.5 rounded-lg active:scale-[0.97]"
                style={
                  isDarkPage
                    ? { background: "#ffffff", color: "#0A0A0A" }
                    : { background: "#0A0A0A", color: "#ffffff" }
                }
              >
                Sign In
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default GlobalHamburgerHeader;
