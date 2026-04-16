export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the Clerk-hosted sign-in page URL.
 * All legacy Manus OAuth redirects now point here.
 */
export const getLoginUrl = (_options?: { dest?: string }) => "/login";

/**
 * Login URL for client portal users.
 */
export const getPortalLoginUrl = () => "/login";

/**
 * Branded login URL (email hint is not supported with Clerk's hosted UI via URL param,
 * but the route is preserved for backward compatibility).
 */
export const getBrandedLoginUrl = (_email?: string) => "/login";
