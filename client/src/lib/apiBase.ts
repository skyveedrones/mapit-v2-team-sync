/**
 * API base URL for all backend requests.
 * When VITE_API_URL is set (e.g. Railway backend), all /api/* calls are prefixed with it.
 * Falls back to relative paths (same-origin) when not set.
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/**
 * Builds a full API URL by prepending API_BASE to the given path.
 * Usage: apiUrl("/api/trpc") → "https://mapit-v2-team-sync-production.up.railway.app/api/trpc"
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
