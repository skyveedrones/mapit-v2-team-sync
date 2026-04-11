import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export const GlobalHamburgerHeader = () => {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const handleSignIn = () => {
    setLocation("/login");
  };

  const handleDashboard = () => {
    setLocation("/dashboard");
  };

  return (
    <header className="fixed top-0 left-0 w-full z-[100] bg-transparent">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* LOGO — bare image, no background box */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => setLocation("/")}
        >
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/mapit-logo-transparent_db1582d4.webp"
            alt="MAPIT"
            className="h-[48px] w-auto object-contain select-none"
            draggable={false}
          />
        </div>

        {/* RIGHT: single Sign In / Dashboard text link */}
        <div>
          {!loading && (
            isAuthenticated ? (
              <button
                onClick={handleDashboard}
                className="text-white/50 hover:text-white text-sm font-medium tracking-wide transition-colors duration-200"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                className="text-white/50 hover:text-white text-sm font-medium tracking-wide transition-colors duration-200"
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
