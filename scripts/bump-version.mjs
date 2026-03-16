#!/usr/bin/env node

/**
 * Automated Version Bump Script
 * 
 * Increments the patch version in:
 * - package.json
 * - shared/version.ts (via update-version.mjs)
 * 
 * Usage: npm run bump
 * 
 * This script is part of the Definition of Done for all code changes.
 * Run this before every checkpoint to ensure live deployments reflect the latest version.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  // 1. Update package.json version
  const packagePath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const oldVersion = pkg.version;
  
  const versionParts = oldVersion.split('.');
  versionParts[2] = parseInt(versionParts[2], 10) + 1;
  const newVersion = versionParts.join('.');
  
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  
  console.log(`📦 package.json: ${oldVersion} → ${newVersion}`);
  
  // 2. Run the existing update-version.mjs script to sync shared/version.ts
  try {
    execSync('node scripts/update-version.mjs', {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });
    console.log(`📝 shared/version.ts updated`);
  } catch (err) {
    console.warn(`⚠️  update-version.mjs encountered an issue (non-critical)`);
  }
  
  console.log(`\n✅ Version bumped to ${newVersion}`);
  console.log(`📌 Next steps:`);
  console.log(`   1. Make your code changes`);
  console.log(`   2. Test locally`);
  console.log(`   3. Run: webdev_save_checkpoint`);
  console.log(`   4. Publish via Management UI`);
  
} catch (error) {
  console.error(`❌ Version bump failed:`, error.message);
  process.exit(1);
}
