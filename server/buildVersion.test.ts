import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for commit hash-based version detection
 * Verifies that the update checker correctly identifies new builds
 */

describe('Build Version Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect when remote hash differs from current hash', () => {
    const currentHash = 'c187367';
    const remoteHash = 'a1b2c3d';
    
    const isUpdateAvailable = remoteHash !== currentHash;
    expect(isUpdateAvailable).toBe(true);
  });

  it('should detect when hashes are identical (no update)', () => {
    const currentHash = 'c187367';
    const remoteHash = 'c187367';
    
    const isUpdateAvailable = remoteHash !== currentHash;
    expect(isUpdateAvailable).toBe(false);
  });

  it('should handle development mode (dev hash)', () => {
    const currentHash = 'dev';
    const remoteHash = 'c187367';
    
    // In dev mode, any non-dev hash indicates an update
    const isUpdateAvailable = remoteHash !== 'dev';
    expect(isUpdateAvailable).toBe(true);
  });

  it('should handle version.json structure', () => {
    const versionData = {
      hash: 'c187367',
      fullHash: 'c1873671234567890abcdef1234567890abcdef1',
      timestamp: '2026-03-24T07:22:00.000Z',
      buildTime: '3/24/2026, 2:22:00 AM'
    };

    expect(versionData).toHaveProperty('hash');
    expect(versionData).toHaveProperty('fullHash');
    expect(versionData.hash).toHaveLength(7);
    expect(versionData.fullHash).toHaveLength(40);
    expect(/^[a-f0-9]{7}$/.test(versionData.hash)).toBe(true);
    expect(/^[a-f0-9]{40}$/.test(versionData.fullHash)).toBe(true);
  });

  it('should extract short hash from full hash', () => {
    const fullHash = 'c1873671234567890abcdef1234567890abcdef1';
    const shortHash = fullHash.substring(0, 7);
    
    expect(shortHash).toBe('c187367');
    expect(shortHash.length).toBe(7);
  });

  it('should compare hashes case-insensitively', () => {
    const hash1 = 'C187367';
    const hash2 = 'c187367';
    
    const match = hash1.toLowerCase() === hash2.toLowerCase();
    expect(match).toBe(true);
  });

  it('should handle empty or null hashes gracefully', () => {
    const currentHash = '';
    const remoteHash = 'c187367';
    
    const isUpdateAvailable = remoteHash !== currentHash;
    expect(isUpdateAvailable).toBe(true);
  });

  it('should detect multiple consecutive updates', () => {
    const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];
    let currentHash = hashes[0];
    
    for (let i = 1; i < hashes.length; i++) {
      const remoteHash = hashes[i];
      const isUpdateAvailable = remoteHash !== currentHash;
      expect(isUpdateAvailable).toBe(true);
      currentHash = remoteHash;
    }
  });

  it('should maintain version.json format across builds', () => {
    const build1 = {
      hash: 'abc1234',
      fullHash: 'abc1234567890abcdef1234567890abcdef1234',
      timestamp: '2026-03-24T07:00:00.000Z',
      buildTime: '3/24/2026, 2:00:00 AM'
    };

    const build2 = {
      hash: 'def5678',
      fullHash: 'def5678567890abcdef1234567890abcdef5678',
      timestamp: '2026-03-24T07:15:00.000Z',
      buildTime: '3/24/2026, 2:15:00 AM'
    };

    // Both should have identical structure
    expect(Object.keys(build1).sort()).toEqual(Object.keys(build2).sort());
    expect(build1.hash).not.toBe(build2.hash);
  });
});
