#!/bin/bash
set -e

echo ""
echo "🚀 Trackr — Vercel Deploy Script"
echo "================================="
echo ""

# Check for .env
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from example..."
  cp .env.example .env
  echo ""
  echo "👉 Open .env and fill in your Supabase credentials, then re-run this script."
  echo "   VITE_SUPABASE_URL=https://your-project.supabase.co"
  echo "   VITE_SUPABASE_ANON_KEY=your-anon-key"
  exit 1
fi

# Source env vars
export $(grep -v '^#' .env | xargs) 2>/dev/null || true

if [ -z "$VITE_SUPABASE_URL" ] || [ "$VITE_SUPABASE_URL" = "https://your-project.supabase.co" ]; then
  echo "❌ VITE_SUPABASE_URL not set in .env"
  exit 1
fi

echo "✅ Supabase URL: $VITE_SUPABASE_URL"
echo ""

# Build
echo "📦 Building..."
npm run build

echo ""
echo "🔐 Logging in to Vercel..."
vercel login

echo ""
echo "🚀 Deploying..."
vercel deploy --prod \
  --env VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --env VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --yes

echo ""
echo "✅ Deploy complete!"
