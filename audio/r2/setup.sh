#!/bin/zsh
# One-time, idempotent: the app's audio bucket and its public door. Free features only (R2 bucket,
# R2 custom domain, CORS). Never the r2.dev URL (it stays off) and never a listing: the custom domain
# serves one object per key and nothing else. Run from boss-os so the token comes from the vault:
#   cd ~/GitHub/boss-os && npm run -s vault:run -- zsh ~/GitHub/<checkout>/audio/r2/setup.sh
set -eu
cd "${0:A:h}"
BUCKET=peace-be-still-audio
DOMAIN=audio.peacebestillapp.com
ZONE=d632e3a26a591f29f28988f90d3728f5   # peacebestillapp.com
wrangler r2 bucket info "$BUCKET" >/dev/null 2>&1 || wrangler r2 bucket create "$BUCKET" --location enam
wrangler r2 bucket cors set "$BUCKET" --file cors.json --force
wrangler r2 bucket domain list "$BUCKET" 2>/dev/null | grep -q "$DOMAIN" \
  || wrangler r2 bucket domain add "$BUCKET" --domain "$DOMAIN" --zone-id "$ZONE" --min-tls 1.2 --force
wrangler r2 bucket dev-url disable "$BUCKET" --force >/dev/null 2>&1 || true
echo "OUTPUT bucket $BUCKET served at https://$DOMAIN/ (no listing, r2.dev off)"
