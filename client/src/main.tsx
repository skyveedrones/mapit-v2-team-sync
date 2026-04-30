import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { initializeVersionCheck, startPeriodicVersionCheck } from "@/lib/versionCheck";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { useMemo } from "react";
import superjson from "superjson";
import { initializePostHog } from "@/lib/posthog";
import App from "./App";
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
  const isDemoPath = path === '/demo' || 
                     path.startsWith('/demo/') || 
                     path === '/project/1' || 
                     path.startsWith('/project/1/');
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
      httpBatchLink({
        url: "/api/trpc",
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

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={CLERK_PUBLISHABLE_KEY}
    afterSignOutUrl="/"
    signInUrl="/login"
    signUpUrl="/login"
  >
    <AppWithClerkToken />
  </ClerkProvider>
);
