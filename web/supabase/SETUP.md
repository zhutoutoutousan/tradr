# Supabase Setup for Challenge Mode v3.0

## 📋 Overview

This guide explains how to set up the Supabase database for the Challenge Mode & User Authentication system.

---

## 🗄️ Database Schema

### Required Table: `player_progress`

Stores all player progress including:
- Challenge level completion & stars
- XP & player leveling
- Unlocked powerups, achievements, titles
- Classic game stats (ELO, rounds played, etc.)

---

## 🚀 Setup Instructions

### Step 1: Access Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project (or create a new one)
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run Migration Script

1. Copy the contents of `supabase/migrations/001_create_player_progress.sql`
2. Paste into the SQL Editor
3. Click **Run** (▶️)
4. Wait for success message

**Expected output:**
```
player_progress table created successfully!
RLS policies enabled and configured.
Indexes created for optimal performance.
Ready for Challenge Mode v3.0!
```

### Step 3: Verify Table Creation

Run this query to verify:

```sql
SELECT * FROM player_progress LIMIT 1;
```

Should return empty result (no rows) with these columns:
- `user_id`
- `completed_levels`
- `xp`
- `level`
- `unlocked_powerups`
- `unlocked_achievements`
- `unlocked_titles`
- `elo_rating`
- `best_elo`
- `rounds_played`
- `first_places`
- `best_return_pct`
- `best_round_profit`
- `created_at`
- `updated_at`

### Step 4: Check RLS Policies

Navigate to **Authentication > Policies** and verify these policies exist:

- ✅ `Users can view own progress` (SELECT)
- ✅ `Users can insert own progress` (INSERT)
- ✅ `Users can update own progress` (UPDATE)
- ✅ `Users can delete own progress` (DELETE)

### Step 5: Test with Sample Data (Optional)

Create a test user and insert sample progress:

```sql
-- Insert sample progress (replace USER_ID with actual auth.users id)
INSERT INTO player_progress (
  user_id,
  completed_levels,
  xp,
  level,
  unlocked_powerups,
  elo_rating
) VALUES (
  'YOUR_USER_ID_HERE', -- Replace with actual user ID
  '{"story-1-basics": 3, "story-2-timing": 2}'::jsonb,
  250,
  2,
  ARRAY['freeze', 'slowmo'],
  1250
);

-- Query to verify
SELECT * FROM player_progress WHERE user_id = 'YOUR_USER_ID_HERE';
```

---

## 🔒 Security

### Row Level Security (RLS)

RLS is **ENABLED** and enforced. Users can only:
- ✅ View their own progress
- ✅ Insert their own progress (first time)
- ✅ Update their own progress
- ✅ Delete their own progress

**No user can access another user's data!**

### Authentication Required

All operations require authenticated user via Supabase Auth:
- Users must be signed in
- `auth.uid()` must match `user_id` in the table

---

## 📊 Indexes

The following indexes are created for performance:

```sql
idx_player_progress_xp              -- Fast XP leaderboards
idx_player_progress_level           -- Fast level queries
idx_player_progress_elo             -- Fast ELO rankings
idx_player_progress_updated_at      -- Recent activity
idx_player_progress_completed_levels -- JSONB queries on levels
```

---

## 🔄 Data Migration

### How It Works

When a user logs in for the first time:

1. **Local Progress Loaded**: Read from `localStorage`
2. **Cloud Progress Fetched**: Query `player_progress` table
3. **Merge Strategy**: Take the maximum/best value for each field:
   - `elo_rating` → `Math.max(local, cloud)`
   - `xp` → `Math.max(local, cloud)`
   - `completed_levels` → Merge stars (keep highest)
   - `unlocked_*` → Union of arrays (combine both)
4. **Save Merged**: Update both local and cloud
5. **No Data Loss**: Always preserve better progress

### Example Migration

**Local Progress (Guest):**
```json
{
  "elo": 1250,
  "xp": 300,
  "challenges": {
    "completedLevels": {
      "story-1-basics": 3,
      "story-2-timing": 2
    },
    "unlockedPowerups": ["freeze"]
  }
}
```

**Cloud Progress (Existing):**
```json
{
  "elo_rating": 1200,
  "xp": 150,
  "completed_levels": {
    "story-1-basics": 2
  },
  "unlocked_powerups": ["slowmo"]
}
```

**Merged Result:**
```json
{
  "elo": 1250,           // ← Local is higher
  "xp": 300,             // ← Local is higher
  "challenges": {
    "completedLevels": {
      "story-1-basics": 3, // ← Local has more stars
      "story-2-timing": 2  // ← Only in local
    },
    "unlockedPowerups": ["freeze", "slowmo"] // ← Union
  }
}
```

---

## 🧪 Testing

### Test Scenarios

1. **New User Sign Up**
   - Create account
   - Play as guest first (local progress)
   - Sign up → Local data migrates to cloud
   - Verify: Cloud has all local data

2. **Existing User Sign In**
   - User with cloud progress
   - Sign in from new device
   - Verify: Cloud data loads to local

3. **Conflict Resolution**
   - Play offline (local progress)
   - Play online (cloud progress)
   - Different progress on each
   - Sign in → Merge takes best values

4. **Level Completion**
   - Complete a level (earn stars)
   - Check: `completed_levels` JSONB updated
   - Check: `xp` incremented
   - Check: `level` recalculated

---

## 🐛 Troubleshooting

### Issue: "permission denied for table player_progress"

**Solution:** RLS policies not set up correctly.

Run this query to check:
```sql
SELECT * FROM pg_policies WHERE tablename = 'player_progress';
```

Should return 4 policies. If not, re-run the migration script.

### Issue: "duplicate key value violates unique constraint"

**Solution:** User already has progress row.

This is normal on subsequent logins. The app should UPDATE, not INSERT.

Check `progressSync.ts` - it handles this automatically.

### Issue: "JSONB field not updating"

**Solution:** JSONB requires special syntax.

Use this to update completed_levels:
```sql
UPDATE player_progress
SET completed_levels = completed_levels || '{"story-3-volatility": 3}'::jsonb
WHERE user_id = 'YOUR_USER_ID';
```

### Issue: "Cloud sync not working"

**Checklist:**
1. ✅ Supabase env vars set? (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
2. ✅ User authenticated? (Check `auth.uid()`)
3. ✅ Table exists? (Run `SELECT * FROM player_progress LIMIT 1`)
4. ✅ RLS policies enabled? (Check `Authentication > Policies`)
5. ✅ Network connection? (Check browser console)

---

## 📈 Monitoring

### Check Progress Stats

```sql
-- Total users with progress
SELECT COUNT(*) FROM player_progress;

-- Average XP
SELECT AVG(xp) FROM player_progress;

-- Top 10 by XP
SELECT user_id, xp, level FROM player_progress ORDER BY xp DESC LIMIT 10;

-- Completed levels distribution
SELECT 
  jsonb_object_keys(completed_levels) AS level_id,
  COUNT(*) AS players_completed
FROM player_progress
GROUP BY level_id
ORDER BY players_completed DESC;

-- Powerup popularity
SELECT 
  unnest(unlocked_powerups) AS powerup,
  COUNT(*) AS unlock_count
FROM player_progress
GROUP BY powerup
ORDER BY unlock_count DESC;
```

---

## 🔐 Environment Variables

Add these to your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get them from: **Supabase Dashboard > Settings > API**

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] `player_progress` table created
- [ ] RLS policies enabled (4 policies)
- [ ] Indexes created (5 indexes)
- [ ] Trigger for `updated_at` working
- [ ] Test user can insert progress
- [ ] Test user can update progress
- [ ] Test user CANNOT access other user's data
- [ ] Environment variables set in production
- [ ] Cloud sync tested with real account
- [ ] Migration tested (guest → registered)
- [ ] Leaderboard view created (optional)

---

## 📝 Schema Version

**Version:** v3.0-challenge-mode  
**Migration File:** `001_create_player_progress.sql`  
**Created:** 2026-10-22

---

## 🚀 Next Steps

After setup:

1. Test auth flow in development
2. Test progress sync (local → cloud)
3. Test on multiple devices
4. Monitor Supabase logs
5. Deploy to production
6. Enable leaderboards (optional)

---

**All set! Your Supabase database is ready for Challenge Mode v3.0!** 🎉
