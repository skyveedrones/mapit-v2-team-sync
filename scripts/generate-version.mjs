#!/usr/bin/env node

/**
 * generate-version.mjs
 *
 * Atomic versioning script — runs automatically before every build (prebuild)
 * and can be triggered manually via `pnpm version:update`.
 *
 * What it does:
 *   1. Reads current git HEAD hash (falls back to timestamp-based ID if git unavailable)
 *   2. Bumps the patch version in package.json (unless --no-bump is passed)
 *   3. Writes client/public/version.json  → served at /version.json for update checks
 *   4. Writes shared/version.ts           → compiled into client + server bundles
 *   5. Writes VITE_BUILD_HASH to .env.local so Vite embeds it at build time
 *
 * Usage:
 *   node scripts/generate-version.mjs            # bump patch + full sync
 *   node scripts/generate-version.mjs --no-bump  # hash sync only, keep version
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const noBump = process.argv.includes('--no-bump');
const root = process.cwd();

// ── 1. Resolve git info (with timestamp fallback) ─────────────────────────────
let shortHash, fullHash, branch;
try {
  shortHash  = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: root }).trim();
  fullHash   = execSync('git rev-parse HEAD',          { encoding: 'utf-8', cwd: root }).trim();
  branch     = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', cwd: root }).trim();
  console.log(`✓ Git hash: ${shortHash} (${branch})`);
} catch {
  // Safety fallback — never show 'unknown'
  shortHash = 'ts-' + Date.now().toString(36).slice(-8);
  fullHash  = shortHash;
  branch    = 'main';
  console.warn(`⚠ Git unavailable — using timestamp fallback: ${shortHash}`);
}

// ── 2. Bump patch version in package.json ────────────────────────────────────
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
if (!noBump) {
  const [maj, min, pat] = (pkg.version || '1.0.0').split('.').map(Number);
  pkg.version = `${maj}.${min}.${pat + 1}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Bumped package.json → v${pkg.version}`);
}
const version = pkg.version;
const now     = new Date();
const buildDate      = now.toISOString();
const buildTimestamp = now.getTime();

// ── 3. Write client/public/version.json ──────────────────────────────────────
const publicDir = path.join(root, 'client', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const versionJson = {
  version,
  commit:     shortHash,
  fullCommit: fullHash,
  hash:       shortHash,   // legacy field — kept for backwards compat
  fullHash:   fullHash,    // legacy field
  branch,
  buildDate,
  timestamp:  buildTimestamp,
  buildTime:  now.toLocaleString(),
};
fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(versionJson, null, 2) + '\n');
console.log(`✓ Wrote client/public/version.json → v${version} (${shortHash})`);

// ── 4. Write shared/version.ts ───────────────────────────────────────────────
const versionTs = `/**
 * Application version information
 *
 * AUTOMATICALLY UPDATED — do not edit manually.
 * Updated by: scripts/generate-version.mjs
 * Last updated: ${buildDate}
 */

export const APP_VERSION = {
  version: '${version}',
  commit: '${shortHash}',
  branch: '${branch}',
  buildDate: new Date().toISOString(),
  buildTimestamp: ${buildTimestamp},
};

/** Format: v2.4.3 (edc19a79) - Apr 12, 2026 */
export function getVersionString(): string {
  const date = new Date(APP_VERSION.buildDate);
  const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return \`v\${APP_VERSION.version} (\${APP_VERSION.commit}) - \${formatted}\`;
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
`;
const sharedDir = path.join(root, 'shared');
if (!fs.existsSync(sharedDir)) fs.mkdirSync(sharedDir, { recursive: true });
fs.writeFileSync(path.join(sharedDir, 'version.ts'), versionTs);
console.log(`✓ Wrote shared/version.ts → v${version} (${shortHash})`);

// ── 5. Write VITE_BUILD_HASH to .env.local ───────────────────────────────────
const envContent = `VITE_BUILD_HASH=${shortHash}\n`;
fs.writeFileSync(path.join(root, '.env.local'), envContent);
console.log(`✓ Wrote VITE_BUILD_HASH=${shortHash} to .env.local`);

console.log(`\n✓ Atomic versioning complete → v${version} | ${shortHash} | ${branch}`);

