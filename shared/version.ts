/**
 * Application version information
 *
 * AUTOMATICALLY UPDATED — do not edit manually.
 * Updated by: scripts/generate-version.mjs
 * Last updated: 2026-06-03T14:04:18.864Z
 */

export const APP_VERSION = {
  version: '2.4.228',
  commit: 'ab2d161',
  branch: 'main',
  buildDate: new Date().toISOString(),
  buildTimestamp: 1780495458864,
};

/** Format: v2.4.3 (edc19a79) - Apr 12, 2026 */
export function getVersionString(): string {
  const date = new Date(APP_VERSION.buildDate);
  const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return `v${APP_VERSION.version} (${APP_VERSION.commit}) - ${formatted}`;
}

export function getVersionInfo() {
  return {
    version: APP_VERSION.version,
    commit: APP_VERSION.commit,
    branch: APP_VERSION.branch,
    buildDate: APP_VERSION.buildDate,
    displayVersion: getVersionString(),
  };
}
