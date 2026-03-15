import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Menu, X, User, ChevronRight, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export const GlobalHamburgerHeader = () => {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Scroll detection for header background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Lock body scroll when nav is open
  useEffect(() => {
    document.body.style.overflow = isNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isNavOpen]);

  const navTo = (path: string) => {
    setLocation(path);
    setIsNavOpen(false);
    setUserMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    setUserMenuOpen(false);
    setIsNavOpen(false);
  };

  const handleLogin = () => {
    setLocation("/login");
    setIsNavOpen(false);
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      {/* ── FIXED HEADER BAR ── */}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20"
            : "bg-slate-950/60 backdrop-blur-xl border-b border-white/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* 1. LOGO */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navTo("/")}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src="/images/mapit-logo-new.png"
                alt="MAPIT"
                className="h-12 w-auto relative z-10 transition-transform group-hover:scale-105"
              />
            </div>
          </div>

          {/* 2. RIGHT: USER + HAMBURGER */}
          <div className="flex items-center gap-4">

            {/* USER AVATAR / SIGN IN */}
            <div ref={userMenuRef} className="relative">
              {isAuthenticated && user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center hover:border-emerald-500/60 transition-all overflow-hidden"
                    aria-label="User menu"
                  >
                    {user.logoUrl ? (
                      <img
                        src={user.logoUrl}
                        alt={user.name ?? "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-emerald-400">{userInitials}</span>
                    )}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute top-full right-0 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl py-3 mt-4 overflow-hidden animate-in fade-in zoom-in duration-200">
                      <div className="px-4 py-2 border-b border-white/5 mb-2">
                        <p className="text-sm font-semibold text-white truncate">{user.name ?? "User"}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email ?? ""}</p>
                      </div>
                      <button
                        onClick={() => navTo("/dashboard")}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => navTo("/dashboard/settings")}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <div className="border-t border-white/5 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center hover:border-emerald-500/60 transition-all"
                  aria-label="Sign in"
                >
                  <User className="w-5 h-5 text-slate-300" />
                </button>
              )}
            </div>

            {/* HAMBURGER TRIGGER */}
            <button
              onClick={() => setIsNavOpen(true)}
              className="p-2 text-white hover:text-emerald-400 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-8 h-8" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. SLIDE-OUT OVERLAY MENU */}
      {isNavOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsNavOpen(false)}
          />

          {/* Drawer */}
          <div className="relative w-full max-w-sm bg-slate-900 h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Close button */}
            <button
              onClick={() => setIsNavOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Nav content */}
            <div className="mt-12 space-y-8">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Navigation</div>

              <nav className="flex flex-col gap-6">
                {/* Municipal — top-level highlight */}
                <button
                  onClick={() => navTo("/municipal")}
                  className="text-3xl font-bold text-white hover:text-emerald-400 transition-colors text-left"
                >
                  Municipal
                </button>

                {/* Solutions section */}
                <div className="space-y-4">
                  <div className="text-xl font-bold text-slate-200">Solutions</div>
                  <div className="flex flex-col gap-4 pl-4 border-l border-white/10">
                    <button
                      onClick={() => {
                        setIsNavOpen(false);
                        setTimeout(() => {
                          document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                        }, 300);
                      }}
                      className="text-lg text-slate-400 hover:text-white flex items-center gap-2 transition-colors text-left"
                    >
                      Services <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navTo("/dashboard")}
                      className="text-lg text-slate-400 hover:text-white flex items-center gap-2 transition-colors text-left"
                    >
                      Projects <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navTo("/pricing")}
                      className="text-lg text-slate-400 hover:text-white flex items-center gap-2 transition-colors text-left"
                    >
                      Pricing <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Auth section */}
                <div className="space-y-4 pt-2 border-t border-white/10">
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center gap-3 py-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
                          {user.logoUrl ? (
                            <img src={user.logoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            userInitials
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{user.name ?? "User"}</p>
                          <p className="text-xs text-slate-400">{user.email ?? ""}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navTo("/dashboard")}
                        className="text-lg text-slate-400 hover:text-white flex items-center gap-2 transition-colors text-left w-full"
                      >
                        <LayoutDashboard className="w-5 h-5" /> Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="text-lg text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors text-left w-full"
                      >
                        <LogOut className="w-5 h-5" /> Sign Out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleLogin}
                      disabled={loading}
                      className="text-lg text-slate-400 hover:text-white flex items-center gap-2 transition-colors text-left"
                    >
                      <User className="w-5 h-5" />
                      {loading ? "Loading..." : "Sign In"}
                    </button>
                  )}
                </div>
              </nav>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-white/10 pt-8">
              <img
                src="/images/mapit-logo-new.png"
                alt="MAPIT"
                className="h-6 opacity-40 mb-4"
              />
              <p className="text-xs text-slate-600">
                © 2026 MAPIT Geospatial.
                <br />
                Precision Aerial Intelligence.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalHamburgerHeader;
