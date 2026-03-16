/**
 * Application version information
 * 
 * AUTOMATICALLY UPDATED - Do not edit manually
 * Updated by: scripts/update-version.mjs
 * Last updated: 2026-03-16T20:08:00.085Z
 * 
 * This file is automatically updated during build with:
 * - Latest version number from package.json
 * - Current git commit hash
 * - Build timestamp
 * - Git branch information
 */

export const APP_VERSION = {
  version: '1.1.0',
  commit: '986bc0f94ae746972d9adca16620d69449c91f84',
  branch: 'main',
  buildDate: new Date().toISOString(),
  buildTimestamp: 1773691680085,
};

/**
 * Get human-readable version string
 * Format: v1.0.8 (b781421) - Feb 10, 2026
 */
export function getVersionString(): string {
  const date = new Date(APP_VERSION.buildDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  
  return `v${APP_VERSION.version} (${APP_VERSION.commit.substring(0, 7)}) - ${formattedDate}`;
}

/**
 * Get version for API/backend communication
 */
export function getVersionInfo() {
  return {
    version: APP_VERSION.version,
    commit: APP_VERSION.commit,
    branch: APP_VERSION.branch,
    buildDate: APP_VERSION.buildDate,
    displayVersion: getVersionString(),
  };
}
