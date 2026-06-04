/**
 * authFetch — drop-in replacement for fetch() that automatically injects
 * the Clerk session token as an Authorization: Bearer header.
 *
 * Usage:
 *   import { authFetch } from "@/lib/authFetch";
 *   const res = await authFetch(apiUrl("/api/overlay/upload"), { method: "POST", body: formData });
 *
 * The token getter is registered once by AppWithClerkToken in main.tsx via
 * registerClerkTokenGetter(getToken). Falls back to cookie-only if not registered.
 */

type TokenGetter = () => Promise<string | null>;

let _getToken: TokenGetter | null = null;

/** Called once from AppWithClerkToken in main.tsx to wire up the Clerk token getter. */
export function registerClerkTokenGetter(fn: TokenGetter) {
  _getToken = fn;
}

/**
 * Resolve a Clerk session token from the registered getter first, then fall back
 * to the global Clerk object if available.
 */
export async function getClerkSessionToken(): Promise<string | null> {
  if (_getToken) {
    try {
      const token = await _getToken();
      if (token) return token;
    } catch {
      // Continue to global Clerk fallback
    }
  }

  try {
    const maybeWindow = globalThis as typeof globalThis & {
      Clerk?: {
        session?: { getToken?: () => Promise<string | null> };
      };
    };

    if (maybeWindow.Clerk?.session?.getToken) {
      return await maybeWindow.Clerk.session.getToken();
    }
  } catch {
    // Non-fatal: final return null fallback
  }

  return null;
}

/**
 * Fetch wrapper that adds Authorization: Bearer <clerk_token> to every request.
 * Preserves all other init options including credentials, body, method, headers.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getClerkSessionToken();

  const existingHeaders = new Headers(init.headers ?? {});
  if (token) {
    existingHeaders.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    credentials: "include",
    ...init,
    headers: existingHeaders,
  });
}
