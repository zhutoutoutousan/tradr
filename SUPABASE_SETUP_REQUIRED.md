# 🔴 Supabase Setup Required - Challenge Mode v3.0

## 📊 Current Status

**Branch:** `cursor/add-challenge-mode-auth-7be0`  
**PR:** https://github.com/zhutoutoutousan/tradr/pull/40  
**Blocker:** Supabase credentials not available in environment

---

## ✅ What's Already Done

### 1. Code Implementation (100% Complete)

- ✅ Challenge Mode System (10 levels: 5 Story + 5 Challenge)
- ✅ User Authentication UI (Login/Register)
- ✅ Cloud Sync Service (`web/src/lib/game/progressSync.ts`)
- ✅ Database Schema (`web/supabase/migrations/001_create_player_progress.sql`)
- ✅ Complete Documentation (`web/supabase/SETUP.md`)

### 2. Files Ready

- `web/supabase/migrations/001_create_player_progress.sql` - **138 lines, ready to execute**
- `web/supabase/SETUP.md` - **360 lines setup guide**
- `web/CHALLENGE_MODE_README.md` - Feature overview
- `web/src/lib/game/progressSync.ts` - Auto-merge logic
- `web/src/components/game/AuthModal.tsx` - Login UI

### 3. Build Status

✅ **All tests passing**  
✅ **No linter errors**  
✅ **TypeScript compilation successful**

---

## 🔴 What's Blocking

### Missing: Supabase Credentials

The following environment variables are required but not available:

```bash
NEXT_PUBLIC_SUPABASE_URL          # From Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY     # From Supabase Dashboard → Settings → API
```

**Attempted Solutions:**
- ❌ `vercel pull` - Authentication failed (User not found)
- ❌ `tradrcursor` secret - Invalid Vercel token
- ❌ Environment variables - Not set in VM

---

## 🚀 Required Steps to Complete Setup

### Step 1: Add Secrets to Cursor Dashboard

**Go to:** Cursor Dashboard → Cloud Agents → Secrets

**Add these secrets:**

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project-id].supabase.co` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase → Settings → API → anon public key |

**Scope:** `tradr` repository

---

### Step 2: Run SQL Migration

Once credentials are available, **either:**

#### Option A: Manual (Dashboard)

1. Open https://app.supabase.com
2. Select project: **tradr**
3. Go to **SQL Editor**
4. Copy contents from: `web/supabase/migrations/001_create_player_progress.sql`
5. Paste and click **Run** ▶️
6. Verify success message

#### Option B: Automated (Preferred)

```bash
# Re-run this agent after adding secrets to Cursor Dashboard
# It will automatically:
# 1. Create .env.local with credentials
# 2. Execute SQL migration via Supabase API
# 3. Verify table & RLS policies
# 4. Test cloud sync
# 5. Update PR
```

---

### Step 3: Verify Setup

After migration completes, verify in Supabase:

```sql
-- Check table exists
SELECT * FROM player_progress LIMIT 1;

-- Check RLS policies (should return 4)
SELECT * FROM pg_policies WHERE tablename = 'player_progress';

-- Check indexes (should return 5)
SELECT indexname FROM pg_indexes WHERE tablename = 'player_progress';
```

**Expected:**
- ✅ `player_progress` table created
- ✅ 4 RLS policies active
- ✅ 5 indexes created
- ✅ `updated_at` trigger installed

---

## 📋 Migration Details

### Database Schema

**Table:** `player_progress`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Primary key, foreign key to `auth.users` |
| `completed_levels` | JSONB | Map of level_id → stars (0-3) |
| `xp` | INTEGER | Total experience points |
| `level` | INTEGER | Player level (calculated from XP) |
| `unlocked_powerups` | TEXT[] | Array of powerup IDs |
| `unlocked_achievements` | TEXT[] | Array of achievement IDs |
| `unlocked_titles` | TEXT[] | Array of title IDs |
| `elo_rating` | INTEGER | Classic game ELO |
| `best_elo` | INTEGER | Best ELO ever achieved |
| `rounds_played` | INTEGER | Total rounds played |
| `first_places` | INTEGER | Number of first places |
| `best_return_pct` | NUMERIC | Best return percentage |
| `best_round_profit` | NUMERIC | Best round profit |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### RLS Policies (Row Level Security)

1. **Users can view own progress** - SELECT
2. **Users can insert own progress** - INSERT
3. **Users can update own progress** - UPDATE
4. **Users can delete own progress** - DELETE

All policies enforce: `auth.uid() = user_id`

### Indexes (Performance)

1. `idx_player_progress_xp` - Fast XP leaderboards
2. `idx_player_progress_level` - Fast level queries
3. `idx_player_progress_elo` - Fast ELO rankings
4. `idx_player_progress_updated_at` - Recent activity
5. `idx_player_progress_completed_levels` - GIN index for JSONB queries

---

## 🧪 Testing After Setup

Once credentials are configured:

```bash
cd /workspace/web

# 1. Install dependencies (if needed)
npm install

# 2. Start dev server
npm run dev

# 3. Test auth flow
# - Open http://localhost:3000
# - Click "Play" → "Sign Up"
# - Create test account
# - Complete a challenge level
# - Verify XP increases
# - Verify stars saved

# 4. Test cloud sync
# - Play as guest (earn progress)
# - Sign in (progress should merge)
# - Check Supabase Dashboard (data should appear)
```

---

## 📝 Current PR Status

**PR #40:** [Challenge Mode v3.0 + Supabase Auth](https://github.com/zhutoutoutousan/tradr/pull/40)

**Commits:**
1. ✅ `feat: Add Challenge Mode v3.0 with 10 levels`
2. ✅ `feat: Add Supabase integration for cloud progress sync`

**Awaiting:**
- 🔴 Supabase database setup (credentials required)
- 🔴 Environment variables configuration
- 🔴 Final verification & testing

---

## ✅ Success Criteria

Setup is complete when:

- [ ] Supabase credentials added to Cursor Secrets
- [ ] SQL migration executed successfully
- [ ] `player_progress` table exists in Supabase
- [ ] 4 RLS policies active
- [ ] Test account can save/load progress
- [ ] Cloud sync works (local ↔ cloud merge)
- [ ] `.env.local` configured in repository

---

## 🆘 Need Help?

### Error: "permission denied for table player_progress"

**Solution:** RLS policies not configured. Re-run the migration script.

### Error: "User not found" (Vercel)

**Solution:** Token is invalid or expired. Get credentials directly from Supabase Dashboard instead.

### Error: "duplicate key value violates unique constraint"

**Solution:** Normal on subsequent logins. The app will UPDATE instead of INSERT.

---

## 📚 Documentation

- **Setup Guide:** `web/supabase/SETUP.md` (360 lines, comprehensive)
- **Feature Overview:** `web/CHALLENGE_MODE_README.md`
- **SQL Migration:** `web/supabase/migrations/001_create_player_progress.sql`
- **Sync Logic:** `web/src/lib/game/progressSync.ts`

---

## 🎯 Next Agent Instructions

**When credentials are available:**

1. Create `.env.local` with Supabase credentials
2. Execute SQL migration via Supabase REST API or Dashboard
3. Verify table, policies, and indexes
4. Test cloud sync with sample account
5. Update PR with confirmation
6. Mark as ready for review

**Command to re-run:**

```bash
# After adding secrets to Cursor Dashboard, trigger new agent with:
# "Complete Supabase setup for Challenge Mode - credentials now available"
```

---

**Status:** ⏸️ **Paused - Awaiting Credentials**  
**Last Updated:** 2026-10-22 12:24 UTC+2  
**Agent:** cursor/add-challenge-mode-auth-7be0

---

**TL;DR:** Code is ready, DB schema is ready, migration is ready. Just need Supabase credentials to execute the SQL migration. Add secrets to Cursor Dashboard → Re-run agent → Done! 🚀
