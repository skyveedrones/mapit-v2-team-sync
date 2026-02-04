/**
 * Application version information
 * This file is automatically updated during build
 */

export const APP_VERSION = {
  version: '1.0.5',
  buildDate: new Date().toISOString(),
  commit: import.meta.env?.VITE_GIT_COMMIT || '4e097bd0',
};

export function getVersionString(): string {
  const date = new Date(APP_VERSION.buildDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  return `v${APP_VERSION.version} (${APP_VERSION.commit.substring(0, 7)}) - ${formattedDate}`;
}
