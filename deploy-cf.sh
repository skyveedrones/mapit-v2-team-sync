#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-cf.sh — Build and deploy MAPIT frontend to Cloudflare Pages
#
# Usage:
#   ./deploy-cf.sh                   # build + deploy
#   ./deploy-cf.sh --skip-build      # deploy existing dist/public without rebuilding
#
# Requirements:
#   - CLOUDFLARE_API_TOKEN env var (Pages:Edit permission)
#   - CLOUDFLARE_ACCOUNT_ID env var
#   - pnpm installed
#   - npx wrangler available (installed via devDependencies or globally)
#
# Cloudflare Pages project name: mapit  (update CF_PROJECT below if different)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── config ───────────────────────────────────────────────────────────────────
CF_PROJECT="${CF_PROJECT:-mapit}"
DIST_DIR="dist/public"
MAPBOX_TOKEN="pk.eyJ1Ijoic2t5dmVlZHJvbmVzIiwiYSI6ImNtbXF0bnIzdTEwcmEyc3IwMDU4dGZwMXkifQ.Kb7RTEJUConyNMsXj_bk1Q"

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()    { echo -e "${YELLOW}[deploy]${NC} $*"; }
error()   { echo -e "${RED}[deploy]${NC} $*" >&2; exit 1; }

# ── preflight checks ─────────────────────────────────────────────────────────
[[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]  && error "CLOUDFLARE_API_TOKEN is not set. Export it before running this script."
[[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]] && error "CLOUDFLARE_ACCOUNT_ID is not set. Export it before running this script."

# ── optional: skip build ─────────────────────────────────────────────────────
SKIP_BUILD=false
for arg in "$@"; do
  [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=true
done

# ── build ─────────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == "false" ]]; then
  info "Building frontend…"
  # CRITICAL: Do NOT pass VITE_API_URL here — the .env file has the correct Railway URL.
  # Only the Mapbox token is passed inline to ensure the correct value is used.
  VITE_MAPBOX_TOKEN="$MAPBOX_TOKEN" pnpm build

  # ── verify build ─────────────────────────────────────────────────────────
  info "Verifying build artefacts…"
  INDEX_JS=$(ls "$DIST_DIR"/assets/index-*.js 2>/dev/null | head -1)
  [[ -z "$INDEX_JS" ]] && error "Build failed — no index-*.js found in $DIST_DIR/assets/"

  FOUND_MAPBOX=$(grep -o '"pk\.[^"]*"' "$INDEX_JS" | head -1)
  FOUND_API=$(grep -o '"https://mapit-api-production[^"]*"' "$INDEX_JS" | head -1)

  if [[ -z "$FOUND_MAPBOX" ]]; then
    error "Mapbox token NOT found in build. Aborting deploy."
  fi
  if [[ -z "$FOUND_API" ]]; then
    error "Railway API URL NOT found in build. Aborting deploy."
  fi

  info "  Mapbox token : $FOUND_MAPBOX"
  info "  API URL      : $FOUND_API"
else
  warn "Skipping build (--skip-build flag set). Using existing $DIST_DIR."
  [[ ! -d "$DIST_DIR" ]] && error "$DIST_DIR does not exist. Run without --skip-build first."
fi

# ── deploy ────────────────────────────────────────────────────────────────────
info "Deploying to Cloudflare Pages project: $CF_PROJECT…"
npx wrangler pages deploy "$DIST_DIR" \
  --project-name "$CF_PROJECT" \
  --commit-dirty=true

info "Deploy complete."
