/**
 * Application version information
 * This file is automatically updated during build with the latest commit hash
 * When a new checkpoint is created, update the commit hash and version number
 */

export const APP_VERSION = {
  version: '1.0.8',
  buildDate: new Date().toISOString(),
  commit: import.meta.env?.VITE_GIT_COMMIT || 'b7814213',
};

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
