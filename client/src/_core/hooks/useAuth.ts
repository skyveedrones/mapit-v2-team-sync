/**
 * useAuth — Clerk-backed auth hook.
 *
 * Preserves the same return shape as the old Manus-based hook so all existing
 * consumers (40+ files) continue to work without modification:
 *   { user, loading, error, isAuthenticated, logout, refresh }
 *
 * `user` is the tRPC `auth.me` record (DB row), not the Clerk user object.
 * Clerk manages the session; tRPC `auth.me` syncs the DB row.
 *
 * Timeout fallback: if Clerk hasn't loaded within 3 seconds (e.g. production
 * keys on a non-allowed domain in dev/preview), treat the user as
 * unauthenticated so the Sign In button always renders instead of staying
 * hidden forever.
 */
import { useClerk, useUser } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};

  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const utils = trpc.useUtils();

  // Fallback: treat Clerk as "loaded but not signed in" after 3 s if it never
  // initialises (production keys on a non-allowed domain in dev/preview).
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (clerkLoaded) return;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [clerkLoaded]);

  const effectivelyLoaded = clerkLoaded || timedOut;

  // Only fetch the DB user row when Clerk says the user is signed in.
  // retry: 2 + retryDelay handles the brief window after an SSO callback where
  // Clerk reports isSignedIn=true but getToken() hasn't hydrated yet, causing
  // the first auth.me request to arrive with no Bearer token (ctx.user = null).
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: clerkLoaded && Boolean(isSignedIn),
    retry: 5,
    retryDelay: 1500,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    await signOut();
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [signOut, utils]);

  const state = useMemo(() => {
    const loading = !effectivelyLoaded || (Boolean(isSignedIn) && meQuery.isLoading);
    const user = meQuery.data ?? null;
    localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));
    return {
      user,
      loading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(isSignedIn) && Boolean(user),
    };
  }, [effectivelyLoaded, isSignedIn, meQuery.data, meQuery.error, meQuery.isLoading]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
