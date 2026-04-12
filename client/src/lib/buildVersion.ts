/**
 * Build version utilities
 * Provides access to the current build hash for update checking
 */

/**
 * Get the current build hash from environment variables
 * Falls back to 'dev' if not available (local development)
 */
export function getBuildHash(): string {
  return import.meta.env.VITE_BUILD_HASH || 'dev';
}

/**
 * Check if a remote hash is different from the current build hash
 * Returns true if an update is available
 */
export function isUpdateAvailable(remoteHash: string): boolean {
  const currentHash = getBuildHash();
  
  // In development, always consider update available if remote hash differs
  if (currentHash === 'dev') {
    return remoteHash !== 'dev';
  }
  
  // In production, compare hashes
  return remoteHash !== currentHash;
}

/**
 * Fetch the remote version.json file
 * Returns the version data or null if fetch fails
 */
export async function fetchRemoteVersion(): Promise<{
  hash: string;
  fullHash: string;
  timestamp: string;
  buildTime: string;
} | null> {
  try {
    const response = await fetch('/version.json', {
      cache: 'no-store', // Always fetch fresh version info
    });
    
    if (!response.ok) {
      console.warn('[UpdateChecker] Failed to fetch version.json:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('[UpdateChecker] Error fetching version.json:', error);
    return null;
  }
}

/**
 * Get current build hash for display
 */
export function getDisplayHash(): string {
  const hash = getBuildHash();
  return hash === 'dev' ? 'development' : hash;
}

/**
 * Get version string from version.json or env
 */
export async function getVersionInfo(): Promise<{
  version: string;
  commit: string;
} | null> {
  try {
    const response = await fetch('/version.json', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      // version.json may use 'commit' or 'fullCommit' or 'hash'
      const commit = data.commit || data.fullCommit || data.hash || 'unknown';
      return {
        version: data.version || 'unknown',
        commit: commit.substring(0, 8),
      };
    }
  } catch (error) {
    console.warn('[buildVersion] Error fetching version info:', error);
  }
  // Fallback to shared/version.ts constants
  try {
    const { APP_VERSION } = await import('@shared/version');
    return {
      version: APP_VERSION.version,
      commit: APP_VERSION.commit.substring(0, 8),
    };
  } catch {
    return null;
  }
}

/**
 * Validate client version with backend
 * Returns whether an update is needed
 */
export async function validateVersionWithBackend(trpc: any): Promise<{
  updateNeeded: boolean;
  currentCommit: string;
  message: string;
} | null> {
  try {
    const clientCommit = getBuildHash();
    const clientVersion = import.meta.env.VITE_APP_VERSION || 'unknown';
    
    const result = await trpc.version.validate.query({
      clientVersion,
      clientCommit,
    });
    
    return result;
  } catch (error) {
    console.error('[VersionCheck] Failed to validate version with backend:', error);
    return null;
  }
}
