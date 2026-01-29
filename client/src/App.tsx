import { useAuth } from "@/_core/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLoginUrl } from "@/const";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectMap from "./pages/ProjectMap";
import FlightDetail from "./pages/FlightDetail";
import InviteAccept from "./pages/InviteAccept";
import Clients from "./pages/Clients";
import ClientProjects from "./pages/ClientProjects";
import ClientPortal from "./pages/ClientPortal";

// Feature pages
import EasyUpload from "./pages/features/EasyUpload";
import InteractiveMaps from "./pages/features/InteractiveMaps";
import FlightPathTracking from "./pages/features/FlightPathTracking";
import GpsDataExport from "./pages/features/GpsDataExport";
import PdfMapOverlay from "./pages/features/PdfMapOverlay";
import InstallAsApp from "./pages/features/InstallAsApp";

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/project/:id">
        {() => <ProtectedRoute component={ProjectDetail} />}
      </Route>
      <Route path="/project/:id/map">
        {() => <ProtectedRoute component={ProjectMap} />}
      </Route>
      <Route path="/project/:id/flight/:flightId">
        {() => <ProtectedRoute component={FlightDetail} />}
      </Route>
      <Route path="/project/:id/flight/:flightId/map">
        {() => <ProtectedRoute component={ProjectMap} />}
      </Route>
      
      {/* Feature pages */}
      <Route path="/features/easy-upload" component={EasyUpload} />
      <Route path="/features/interactive-maps" component={InteractiveMaps} />
      <Route path="/features/flight-path-tracking" component={FlightPathTracking} />
      <Route path="/features/gps-data-export" component={GpsDataExport} />
      <Route path="/features/pdf-map-overlay" component={PdfMapOverlay} />
      <Route path="/features/install-as-app" component={InstallAsApp} />
      
      {/* Client management */}
      <Route path="/clients">
        {() => <ProtectedRoute component={Clients} />}
      </Route>
      <Route path="/clients/:clientId/projects">
        {() => <ProtectedRoute component={ClientProjects} />}
      </Route>
      
      {/* Client Portal (for client users to view their projects) */}
      <Route path="/portal">
        {() => <ProtectedRoute component={ClientPortal} />}
      </Route>
      <Route path="/portal/project/:id">
        {() => <ProtectedRoute component={ProjectDetail} />}
      </Route>
      
      {/* Invitation acceptance page */}
      <Route path="/invite/:token" component={InviteAccept} />
      
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - Using dark theme for Aerospace Command Center design
// - Colors managed with CSS variables in index.css

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
