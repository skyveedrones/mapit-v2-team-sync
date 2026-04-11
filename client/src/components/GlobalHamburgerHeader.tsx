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
            src="/images/mapit-logo-branded.png"
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
                className="text-white/80 hover:text-white text-sm font-semibold tracking-wide transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                className="text-white/80 hover:text-white text-sm font-semibold tracking-wide transition-colors"
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
