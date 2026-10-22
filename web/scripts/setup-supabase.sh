#!/bin/bash
# Supabase Setup Script for Challenge Mode v3.0
# Run this after adding Supabase credentials to environment

set -e

echo "🚀 Starting Supabase Setup for Challenge Mode v3.0"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required environment variables
echo "📋 Step 1: Checking environment variables..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL not set${NC}"
  echo "   Get it from: Supabase Dashboard → Settings → API → Project URL"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
  echo "   Get it from: Supabase Dashboard → Settings → API → anon public key"
  exit 1
fi

echo -e "${GREEN}✅ Environment variables found${NC}"
echo "   SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}"
echo ""

# Create .env.local if it doesn't exist
echo "📋 Step 2: Creating .env.local..."

if [ -f .env.local ]; then
  echo -e "${YELLOW}⚠️  .env.local already exists, backing up...${NC}"
  cp .env.local .env.local.backup
fi

cat > .env.local << EOF
# Supabase Configuration
# Generated: $(date)
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
EOF

echo -e "${GREEN}✅ .env.local created${NC}"
echo ""

# Execute SQL migration
echo "📋 Step 3: Executing SQL migration..."
echo ""
echo -e "${YELLOW}⚠️  Please execute the SQL migration manually:${NC}"
echo ""
echo "   1. Go to: https://app.supabase.com"
echo "   2. Select your project"
echo "   3. Navigate to: SQL Editor"
echo "   4. Copy contents from: supabase/migrations/001_create_player_progress.sql"
echo "   5. Paste and click Run ▶️"
echo ""
echo "   OR use Supabase CLI:"
echo "   $ npx supabase db push"
echo ""

read -p "Press Enter after completing SQL migration..."

# Verify setup
echo ""
echo "📋 Step 4: Verifying setup..."

# Check if we can connect to Supabase
echo "Testing Supabase connection..."

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/")

if [ "$HEALTH_CHECK" = "200" ]; then
  echo -e "${GREEN}✅ Supabase connection successful${NC}"
else
  echo -e "${YELLOW}⚠️  Could not verify Supabase connection (HTTP $HEALTH_CHECK)${NC}"
fi

echo ""
echo "📋 Step 5: Next steps..."
echo ""
echo "   1. Start dev server: npm run dev"
echo "   2. Open: http://localhost:3000"
echo "   3. Test Challenge Mode:"
echo "      - Click 'Play' → 'Sign Up'"
echo "      - Create test account"
echo "      - Complete a challenge level"
echo "      - Verify progress saves to cloud"
echo ""
echo "   4. Verify in Supabase Dashboard:"
echo "      - Go to: Table Editor → player_progress"
echo "      - Should see your progress data"
echo ""

echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "For more details, see:"
echo "  - web/supabase/SETUP.md (full guide)"
echo "  - web/CHALLENGE_MODE_README.md (feature overview)"
echo ""
