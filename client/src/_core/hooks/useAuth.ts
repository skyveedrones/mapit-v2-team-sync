/**
 * useAuth — Clerk-backed auth hook.
 *
 * Preserves the same return shape as the old Manus-based hook so all existing
 * consumers (40+ files) continue to work without modification:
 *   { user, loading, error, isAuthenticated, logout, refresh }
 *
 * `user` is the tRPC `auth.me` record (DB row), not the Clerk user object.
 * Clerk manages the session; tRPC `auth.me` syncs the DB row.
 */
import { useClerk, useUser } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";

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

  // Only fetch the DB user row when Clerk says the user is signed in
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: clerkLoaded && Boolean(isSignedIn),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    await signOut();
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [signOut, utils]);

  const state = useMemo(() => {
    const loading = !clerkLoaded || (Boolean(isSignedIn) && meQuery.isLoading);
    const user = meQuery.data ?? null;
    localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));
    return {
      user,
      loading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(isSignedIn) && Boolean(user),
    };
  }, [clerkLoaded, isSignedIn, meQuery.data, meQuery.error, meQuery.isLoading]);

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
