# ⚠️ Action Required: Supabase Setup

## 🎯 Quick Summary

Challenge Mode v3.0 is **code-complete** but needs **Supabase database setup** to function.

**What's Ready:**
- ✅ All code implemented (Challenge Mode, Auth, Cloud Sync)
- ✅ SQL migration prepared
- ✅ Documentation complete

**What's Needed:**
- 🔴 Supabase credentials (see below)
- 🔴 SQL migration execution

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Supabase Credentials

1. Go to https://app.supabase.com
2. Select project: **tradr**
3. Navigate to: **Settings → API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Add to Environment

**Option A: Cursor Secrets (for Cloud Agents)**
- Go to: Cursor Dashboard → Cloud Agents → Secrets
- Add both credentials
- Scope: `tradr` repository

**Option B: Local Development**

```bash
cd web
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF
```

### Step 3: Run SQL Migration

Go to **Supabase Dashboard → SQL Editor** and execute:

`web/supabase/migrations/001_create_player_progress.sql`

---

## 📋 Alternative: Automated Script

```bash
cd web
export NEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."

# Run setup script
./scripts/setup-supabase.sh
```

---

## ✅ Verify Setup

After migration:

```sql
-- Should return empty table with correct columns
SELECT * FROM player_progress LIMIT 1;

-- Should return 4 policies
SELECT * FROM pg_policies WHERE tablename = 'player_progress';
```

---

## 🧪 Test

```bash
cd web
npm run dev
# Open http://localhost:3000
# Sign up → Complete a challenge → Check Supabase Dashboard
```

---

## 📚 Full Documentation

- **Detailed Guide:** `web/supabase/SETUP.md` (360 lines)
- **Feature Overview:** `web/CHALLENGE_MODE_README.md`
- **Migration SQL:** `web/supabase/migrations/001_create_player_progress.sql`

---

**Status:** Paused - Awaiting Credentials  
**Branch:** `cursor/add-challenge-mode-auth-7be0`  
**PR:** #40
