import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { apiUrl } from "@/lib/apiBase";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { initializeVersionCheck, startPeriodicVersionCheck } from "@/lib/versionCheck";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { useMemo, useEffect } from "react";
import superjson from "superjson";
import { initializePostHog } from "@/lib/posthog";
import App from "./App";
import { registerClerkTokenGetter } from "@/lib/authFetch";
import { getLoginUrl } from "./const";
import "./index.css";

// Initialize PostHog analytics
initializePostHog();

// Suppress ResizeObserver errors from VList virtualization library
// These are harmless notifications that occur after component unmount
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    args[0] instanceof Error &&
    args[0].message === "ResizeObserver loop completed with undelivered notifications."
  ) {
    return;
  }
  originalError.call(console, ...args);
};

const queryClient = new QueryClient();

// Check if current path is a demo route that doesn't require authentication
const isDemoRoute = () => {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  // Onboarding funnel pages — all unauthenticated, never redirect to OAuth
  const onboardingFunnelPaths = ['/welcome', '/name', '/create', '/map', '/signup', '/login', '/pricing', '/municipal', '/referral'];
  if (onboardingFunnelPaths.includes(path)) return true;
  // Check for demo routes: /demo, /demo/*, /project/1, /project/1/*
  // Also bypass all /project/* routes — the page handles its own auth/error state
  // and retries after Clerk loads. We must not redirect before the retry fires.
  const isDemoPath = path === '/demo' || 
                     path.startsWith('/demo/') || 
                     path.startsWith('/project/');
  if (isDemoPath) return true;
  // Also bypass redirect for onboarding trial projects (unauthenticated users)
  // The project ID is stored in sessionStorage during the Create flow
  try {
    const onboardingId = sessionStorage.getItem('mapit_project_id');
    if (onboardingId) {
      const onboardingPath = `/project/${onboardingId}`;
      if (path === onboardingPath || path.startsWith(`${onboardingPath}/`)) return true;
    }
  } catch {
    // sessionStorage not available (e.g. private mode)
  }
  return false;
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Don't redirect if accessing demo routes - they allow unauthenticated access
  if (isDemoRoute()) {
    return;
  }

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = "/login";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    // Skip redirect logic entirely for demo routes
    if (isDemoRoute()) return;
    
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    // Skip redirect logic entirely for demo routes
    if (isDemoRoute()) return;
    
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// tRPC client factory — called inside ClerkProvider so getToken() is available
function buildTrpcClient(getToken: () => Promise<string | null>) {
  return trpc.createClient({
    links: [
      httpLink({
        url: apiUrl("/api/trpc"),
        transformer: superjson,
        async headers() {
          const token = await getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    ],
  });
}

function AppWithClerkToken() {
  const { getToken } = useClerkAuth();
  const trpcClient = useMemo(() => buildTrpcClient(getToken), [getToken]);
  // Register token getter for REST fetch calls (overlay upload, document upload, etc.)
  useEffect(() => { registerClerkTokenGetter(getToken); }, [getToken]);
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// DISABLED: Initialize version checking on app load
// This was causing cycling popups every 5 seconds
// Version checking is now only available in Settings page
// initializeVersionCheck();
// startPeriodicVersionCheck();

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function FatalStartupScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-6">
      <div className="max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400 mb-3">Startup error</p>
        <h1 className="text-2xl font-semibold mb-3">{title}</h1>
        <p className="text-slate-300 leading-7">{message}</p>
      </div>
    </div>
  );
}

function MissingClerkKeyScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-6">
      <div className="max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400 mb-3">Configuration error</p>
        <h1 className="text-2xl font-semibold mb-3">Authentication is not configured</h1>
        <p className="text-slate-300 leading-7">
          The site is missing the Clerk publishable key required to start the app.
          Set <span className="font-mono text-slate-100">VITE_CLERK_PUBLISHABLE_KEY</span> in the
          Cloudflare Pages environment variables, then redeploy.
        </p>
      </div>
    </div>
  );
}

const root = document.getElementById("root");
const appRoot = root ? createRoot(root) : null;

const renderFatalStartupScreen = (title: string, message: string) => {
  if (!appRoot) {
    console.error(title, message);
    return;
  }
  appRoot.render(<FatalStartupScreen title={title} message={message} />);
};

window.addEventListener("error", (event) => {
  if ((event as ErrorEvent).error instanceof Error) {
    renderFatalStartupScreen(
      "The app hit a startup error",
      (event as ErrorEvent).error.message || "An unexpected error prevented the site from loading."
    );
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "An unexpected promise rejection occurred.");
  renderFatalStartupScreen(
    "The app hit a startup error",
    message
  );
});

try {
  if (!appRoot) {
    console.error("Root element #root was not found");
  } else if (!CLERK_PUBLISHABLE_KEY) {
    console.error("Missing VITE_CLERK_PUBLISHABLE_KEY. The app cannot initialize Clerk.");
    appRoot.render(<MissingClerkKeyScreen />);
  } else {
    appRoot.render(
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        signInUrl="/login"
        signUpUrl="/login"
      >
        <AppWithClerkToken />
      </ClerkProvider>
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown startup error");
  renderFatalStartupScreen("The app failed to start", message);
}
