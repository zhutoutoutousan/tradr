#!/bin/bash
set -e

echo "🔐 Setting up Tradr environment from Cursor Cloud Secrets..."
echo ""

# Check which secrets are available
AVAILABLE_SECRETS=$(printenv | grep -E '^(STRIPE|SUPABASE|NEXT_PUBLIC_|SITE)' | cut -d= -f1 || true)

if [ -z "$AVAILABLE_SECRETS" ]; then
    echo "⚠️  No Cursor Cloud Secrets found!"
    echo "   Please add secrets at: https://cursor.com/dashboard/cloud-agents/secrets"
    echo ""
    echo "   Required secrets:"
    echo "   - STRIPE_PRIVATEKEY (you already have this ✅)"
    echo "   - STRIPE_PUBLISHABLE_KEY"
    echo "   - STRIPE_PRICE_ID"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo ""
    exit 1
fi

echo "✅ Found these secrets:"
echo "$AVAILABLE_SECRETS" | sed 's/^/   - /'
echo ""

# Create .env.local from available secrets
cat > /workspace/web/.env.local << 'EOF'
# 🔐 Tradr Environment Variables
# Auto-generated from Cursor Cloud Secrets

# ========================================
# STRIPE (Payment Processing)
# ========================================
EOF

# Add Stripe secrets
if [ -n "${STRIPE_PRIVATEKEY}" ]; then
    echo "STRIPE_SECRET_KEY=${STRIPE_PRIVATEKEY}" >> /workspace/web/.env.local
    echo "✅ STRIPE_SECRET_KEY configured"
else
    echo "# STRIPE_SECRET_KEY=\${STRIPE_PRIVATEKEY}" >> /workspace/web/.env.local
    echo "⚠️  STRIPE_SECRET_KEY missing - add STRIPE_PRIVATEKEY to Cloud Secrets"
fi

if [ -n "${STRIPE_PUBLISHABLE_KEY}" ]; then
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}" >> /workspace/web/.env.local
    echo "✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY configured"
else
    # Use the one from REQUIREMENTS.md as fallback
    echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51N99JsEfawZzu7YhUbVYGDBYUk77WbVsVWvBEYU0DNP6uQcuNiwqGnlVT7YWJ69svRG8LqcWI01HnYLLVacfuYou00Toq24xNF" >> /workspace/web/.env.local
    echo "ℹ️  Using STRIPE_PUBLISHABLE_KEY from REQUIREMENTS.md"
fi

if [ -n "${STRIPE_PRICE_ID}" ]; then
    echo "STRIPE_PRICE_ID=${STRIPE_PRICE_ID}" >> /workspace/web/.env.local
    echo "✅ STRIPE_PRICE_ID configured"
else
    echo "# STRIPE_PRICE_ID=price_xxxxxxxxxxxxx" >> /workspace/web/.env.local
    echo "⚠️  STRIPE_PRICE_ID missing - add to Cloud Secrets"
fi

# Add Supabase section
cat >> /workspace/web/.env.local << 'EOF'

# ========================================
# SUPABASE (Database & Realtime)
# ========================================
EOF

if [ -n "${SUPABASE_URL}" ]; then
    echo "NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}" >> /workspace/web/.env.local
    echo "✅ NEXT_PUBLIC_SUPABASE_URL configured"
else
    echo "# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co" >> /workspace/web/.env.local
    echo "⚠️  SUPABASE_URL missing - add to Cloud Secrets"
fi

if [ -n "${SUPABASE_ANON_KEY}" ]; then
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" >> /workspace/web/.env.local
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY configured"
else
    echo "# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." >> /workspace/web/.env.local
    echo "⚠️  SUPABASE_ANON_KEY missing - add to Cloud Secrets"
fi

# Add Site URL
cat >> /workspace/web/.env.local << 'EOF'

# ========================================
# SITE CONFIG
# ========================================
EOF

if [ -n "${NEXT_PUBLIC_SITE_URL}" ]; then
    echo "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}" >> /workspace/web/.env.local
    echo "✅ NEXT_PUBLIC_SITE_URL configured"
else
    echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" >> /workspace/web/.env.local
    echo "ℹ️  Using default SITE_URL for local development"
fi

echo ""
echo "✅ .env.local created at: /workspace/web/.env.local"
echo ""

# Summary
MISSING_COUNT=$(grep -c "^#" /workspace/web/.env.local | tail -1 || echo "0")
CONFIGURED_COUNT=$(grep -c "^[A-Z]" /workspace/web/.env.local | tail -1 || echo "0")

echo "📊 Status:"
echo "   ✅ Configured: $CONFIGURED_COUNT variables"
echo "   ⚠️  Missing: $MISSING_COUNT variables"
echo ""

if [ "$MISSING_COUNT" -gt 0 ]; then
    echo "⚠️  Some secrets are missing. Add them to Cursor Cloud Secrets:"
    echo "   https://cursor.com/dashboard/cloud-agents/secrets"
    echo ""
    echo "   Missing secrets:"
    grep "^#" /workspace/web/.env.local | grep -E "(STRIPE|SUPABASE)" | sed 's/^# /   - /' || true
    echo ""
fi

echo "🚀 Next steps:"
echo "   1. Add missing secrets to Cursor Cloud Secrets (if any)"
echo "   2. Run this script again to regenerate .env.local"
echo "   3. Test with: cd web && npm run build && npm start"
echo ""
