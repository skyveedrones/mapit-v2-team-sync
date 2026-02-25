/**
 * Version Management
 * Tracks and provides the current deployed version
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface VersionInfo {
  checkpointId: string;
  version: string;
  deployedAt: string;
}

// Store the current version in memory
let currentVersion: VersionInfo = {
  checkpointId: process.env.VITE_APP_VERSION || 'unknown',
  version: process.env.VITE_APP_SEMANTIC_VERSION || 'v1.0.0',
  deployedAt: new Date().toISOString(),
};

/**
 * Initialize version from environment or package.json
 */
export function initializeVersion(): void {
  try {
    // Try to read version from package.json
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    currentVersion = {
      checkpointId: process.env.VITE_APP_VERSION || 'unknown',
      version: `v${packageJson.version || '1.0.0'}`,
      deployedAt: new Date().toISOString(),
    };

    console.log('[Version] Initialized:', currentVersion.version, `(${currentVersion.checkpointId})`);
  } catch (error) {
    console.warn('[Version] Could not read package.json, using defaults');
  }
}

/**
 * Get the current deployed version
 */
export function getCurrentVersion(): VersionInfo {
  return currentVersion;
}

/**
 * Update the version (called when deploying new checkpoint)
 */
export function updateVersion(checkpointId: string, semanticVersion?: string): void {
  currentVersion = {
    checkpointId,
    version: semanticVersion || currentVersion.version,
    deployedAt: new Date().toISOString(),
  };

  console.log('[Version] Updated to:', currentVersion.version, `(${currentVersion.checkpointId})`);
}

/**
 * Get version info as JSON
 */
export function getVersionJson(): VersionInfo {
  return {
    ...currentVersion,
    deployedAt: new Date().toISOString(), // Always return current time
  };
}
