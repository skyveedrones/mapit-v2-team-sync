#!/usr/bin/env node

/**
 * Generate version.json with current git commit hash
 * This script runs during the build process to create a version file
 * that the frontend uses to detect new deployments
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  // Get current git commit hash (short form)
  const commitHash = execSync('git rev-parse --short HEAD', {
    encoding: 'utf-8',
    cwd: process.cwd()
  }).trim();

  // Get full commit hash for reference
  const fullCommitHash = execSync('git rev-parse HEAD', {
    encoding: 'utf-8',
    cwd: process.cwd()
  }).trim();

  // Get current timestamp
  const timestamp = new Date().toISOString();

  // Create version object
  const versionData = {
    hash: commitHash,
    fullHash: fullCommitHash,
    timestamp: timestamp,
    buildTime: new Date().toLocaleString()
  };

  // Ensure public directory exists
  const publicDir = path.join(process.cwd(), 'client', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write version.json to public directory
  const versionFilePath = path.join(publicDir, 'version.json');
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));

  console.log(`✓ Generated version.json with commit hash: ${commitHash}`);
  console.log(`  Full hash: ${fullCommitHash}`);
  console.log(`  Timestamp: ${timestamp}`);
  console.log(`  Location: ${versionFilePath}`);

  // Also set environment variable for Vite
  process.env.VITE_BUILD_HASH = commitHash;
  console.log(`✓ Set VITE_BUILD_HASH=${commitHash}`);

} catch (error) {
  console.warn('⚠ Git not available in build environment, using fallback hash');
  
  // Fallback: generate a hash from timestamp and environment
  const timestamp = new Date().toISOString();
  const fallbackHash = 'build-' + Date.now().toString(36).slice(-8);
  
  const versionData = {
    hash: fallbackHash,
    fullHash: fallbackHash,
    timestamp: timestamp,
    buildTime: new Date().toLocaleString(),
    isGitless: true
  };
  
  const publicDir = path.join(process.cwd(), 'client', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const versionFilePath = path.join(publicDir, 'version.json');
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
  
  console.log(`✓ Generated version.json with fallback hash: ${fallbackHash}`);
  console.log(`  Timestamp: ${timestamp}`);
  console.log(`  Location: ${versionFilePath}`);
  
  process.env.VITE_BUILD_HASH = fallbackHash;
  console.log(`✓ Set VITE_BUILD_HASH=${fallbackHash}`);
}
