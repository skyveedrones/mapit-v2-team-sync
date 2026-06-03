# Deployment Structure & SPA Routing Fix

## What Happened

The site was experiencing two critical issues after deployment:

1. **404 errors on page refresh** (e.g., `/project/30001`)
2. **Black map** (Mapbox token issue - separate from routing)

### Root Cause: Incorrect Deployment Path

**The Problem:**
- Vite builds to `dist/public/` (where `index.html` and all assets live)
- The deployment script was deploying `dist/` instead of `dist/public/`
- Cloudflare Pages couldn't find `index.html` at the root, causing 404s
- The `_redirects` file was also in the wrong location

**Why This Happened:**
- The `DEPLOY.md` instructions said to run `npx wrangler pages deploy dist`
- But the build output structure is: `dist/public/` (client files) + `dist/index.js` (server)
- When deploying only the client to Cloudflare Pages, we need to deploy `dist/public/`, not `dist/`

## The Fix

### 1. Correct Deployment Command
```bash
# ❌ WRONG - deploys dist/index.js and dist/public/ separately
npx wrangler pages deploy dist

# ✅ CORRECT - deploys only the web files
npx wrangler pages deploy dist/public
```

### 2. Correct _redirects Location
- File must be at: `client/public/_redirects` (source)
- Gets copied to: `dist/public/_redirects` (during build)
- Cloudflare Pages reads it automatically when deploying `dist/public/`

**Current _redirects content:**
```
/* /index.html 200
```

This tells Cloudflare Pages: "For any route that doesn't match a real file, serve `index.html` and let React Router handle it."

## How to Prevent This in the Future

### 1. Update DEPLOY.md
Change the deployment command from:
```bash
npx wrangler pages deploy dist
```
To:
```bash
npx wrangler pages deploy dist/public
```

### 2. Create a Deployment Script
Create `deploy.sh` to automate and prevent manual errors:
```bash
#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist/public --project-name mapit-skyveedrones

echo "✅ Deployment complete!"
```

Run with: `bash deploy.sh`

### 3. Document the Build Structure
Add this to your project README:

```
## Build & Deployment Structure

- **Source:** `client/src/` (React app)
- **Build Output:** 
  - `dist/public/` ← Frontend files (deploy to Cloudflare Pages)
  - `dist/index.js` ← Backend server (if using full-stack)
- **SPA Routing:** `client/public/_redirects` (auto-copied to `dist/public/`)
- **Deployment:** Always deploy `dist/public/` to Cloudflare Pages
```

### 4. Add Pre-deployment Checks
Before deploying, verify:
- `dist/public/index.html` exists
- `dist/public/_redirects` exists with correct content
- `dist/public/assets/` has the compiled JavaScript

Quick check command:
```bash
ls -la dist/public/_redirects dist/public/index.html dist/public/assets/ | head -5
```

## Key Takeaways

| Item | Correct Path | Wrong Path |
|------|--------------|-----------|
| Build output | `dist/public/` | `dist/` |
| Deploy command | `npx wrangler pages deploy dist/public` | `npx wrangler pages deploy dist` |
| _redirects source | `client/public/_redirects` | `dist/_redirects` |
| _redirects in build | `dist/public/_redirects` | `dist/public/_redirects` ✓ (this was correct) |

## Testing SPA Routing

After deployment, test with:
```bash
# Should NOT return 404
curl -I https://mapit.skyveedrones.com/project/30001

# Should return 200 (HTML page)
curl -s https://mapit.skyveedrones.com/project/30001 | grep -o "<title>.*</title>"
```
