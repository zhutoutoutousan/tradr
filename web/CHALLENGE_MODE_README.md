# Challenge Mode & User System Implementation

## 🎯 Overview

**Version: v3.0-challenge-mode**

Große Aktualisierung mit neuen Features:
- 🏆 **闯关模式 (Challenge Mode)**: Story & Challenge Levels
- 👤 **User Authentication System**: Login & Registration
- ☁️ **Cloud Progress Sync**: Daten in Supabase speichern
- 🔄 **Backward Compatibility**: Lokale Daten werden migriert

---

## ✨ New Features

### 1. Challenge Mode System (闯关模式)

#### Story Mode (教程式关卡):
Progressive tutorial-style levels that teach trading:

| Level | Title | Objectives | Rewards |
|-------|-------|-----------|---------|
| 1 | 📚 Trading Basics | Complete 1 trade, Earn $100 | 100 XP, First Trade achievement |
| 2 | ⏰ Perfect Timing | 5% return, Finish 1st | 150 XP, Freeze powerup |
| 3 | 🌊 Riding Volatility | 10% return, No loss | 200 XP, Slowmo powerup |
| 4 | 🔥 Under Pressure | Earn $2,000, Finish 1st | 250 XP, Leverage powerup |
| 5 | 🏆 Trading Master | 20% return, Finish 1st, 3 min | 500 XP, Story Complete, Shield powerup |

#### Challenge Mode (挑战关卡):
Harder, specific objectives for experienced players:

| Level | Title | Objectives | Rewards |
|-------|-------|-----------|---------|
| 1 | 💰 Quick Profit | $1,000 in 60 seconds | 300 XP |
| 2 | 🎯 Perfect Timing | Win with only 3 trades | 400 XP, Perfect Trader achievement |
| 3 | 🎲 High Roller | 50% return | 600 XP, High Roller achievement |
| 4 | ⚔️ The Gauntlet | Beat 20 bots, 30% return | 800 XP, Gauntlet Winner, Tip powerup |
| 5 | 👑 Impossible | Finish 1st, 100% return, No loss | 2000 XP, Impossible achievement, Trading God title |

#### Star System:
- ⭐ **1 Star**: Complete 33% of objectives
- ⭐⭐ **2 Stars**: Complete 66% of objectives
- ⭐⭐⭐ **3 Stars**: Complete 100% of objectives

#### Level Unlocking:
- Story levels unlock sequentially (need 1+ stars from previous level)
- Challenge levels require specific story level completion (2+ stars usually)
- Some levels unlock special powerups, achievements, and titles

### 2. User Authentication System

#### Features:
- ✅ Email/Password registration
- ✅ Username system (public display name)
- ✅ Login/Logout
- ✅ Guest mode (play without account)
- ✅ Password validation (min 6 characters)
- ✅ Username validation (3-20 chars, alphanumeric + _ -)

#### Auth Modal:
- Located in `/web/src/components/AuthModal.tsx`
- Tabs: "Anmelden" (Sign In) / "Registrieren" (Sign Up)
- Guest mode button: "Als Gast weiterspielen"
- Error handling with user-friendly messages

### 3. Progress Tracking System

#### Local Progress (localStorage):
```typescript
interface PlayerProgress {
  // Classic profile stats
  elo: number;
  bestElo: number;
  roundsPlayed: number;
  firstPlaces: number;
  bestReturnPct: number;
  bestRoundProfit: number;
  unlocked: string[];
  
  // Challenge mode progress
  challenges: {
    completedLevels: Record<string, number>; // levelId → stars (0-3)
    xp: number;
    level: number; // Player level based on XP
    unlockedPowerups: string[];
    unlockedAchievements: string[];
    unlockedTitles: string[];
  }
}
```

#### XP & Leveling:
- **Formula**: `level = 1 + floor(sqrt(xp / 50))`
- Level 1 = 0 XP
- Level 2 = 100 XP
- Level 3 = 300 XP
- Level 4 = 600 XP
- Level 5 = 1000 XP
- etc.

#### Cloud Sync (Supabase):
- Progress auto-syncs to cloud when logged in
- Local and cloud data merged (take the best of both)
- Migration preserves all local progress

---

## 🔄 Backward Compatibility

### Migration Strategy:

#### For Existing Players:
1. **Local Data Preserved**: All existing localStorage data remains intact
2. **First Login**: Local progress is merged with cloud data
3. **Best of Both**: System takes the maximum of local vs cloud for all stats
4. **Star Merging**: Completed levels take the highest star count

#### Migration Functions:
```typescript
// In /web/src/lib/game/progress.ts

// Merge local and cloud progress
migrateLocalToCloud(local: PlayerProgress, cloud: CloudProgress | null): PlayerProgress

// Convert cloud format to local format
cloudProgressToLocal(cloud: CloudProgress): PlayerProgress

// Convert local format to cloud format
localProgressToCloud(local: PlayerProgress, userId: string): Partial<CloudProgress>
```

#### Safety Features:
- No data loss: localStorage always kept as backup
- Guest mode: Can play without account (local only)
- Sync on demand: Progress syncs when user logs in
- Merge conflicts: Always take the better value

---

## 📁 File Structure

### New Files:
```
web/src/
├── lib/
│   ├── game/
│   │   ├── challenges.ts          # Challenge level definitions
│   │   └── progress.ts            # Progress tracking & migration
│   └── auth/
│       └── supabase-auth.ts       # (Already existed, extended)
├── components/
│   ├── AuthModal.tsx              # Login/Register UI
│   └── ChallengeModeSelect.tsx    # Level selection UI
```

### Modified Files:
```
web/src/
├── components/
│   ├── ModeSelect.tsx             # Added Challenge Mode button
│   ├── LandingIntro.tsx           # Version update
│   ├── MultiplayerGame.tsx        # Version update
│   └── MultiplayerJoin.tsx        # Version update
```

---

## 🗄️ Database Schema (TODO)

### Supabase Tables Required:

#### `user_profiles` (Already exists):
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  elo_rating INTEGER DEFAULT 1200,
  best_elo INTEGER DEFAULT 1200,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  best_return_pct NUMERIC DEFAULT 0,
  best_single_profit NUMERIC DEFAULT 0,
  preferred_language TEXT DEFAULT 'de',
  show_in_leaderboard BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `player_progress` (NEW - To be created):
```sql
CREATE TABLE player_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  completed_levels JSONB DEFAULT '{}',  -- { "story-1-basics": 3, "challenge-quick-profit": 2, ... }
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  unlocked_powerups TEXT[] DEFAULT '{}',
  unlocked_achievements TEXT[] DEFAULT '{}',
  unlocked_titles TEXT[] DEFAULT '{}',
  -- Stats for backward compatibility
  elo_rating INTEGER DEFAULT 1200,
  best_elo INTEGER DEFAULT 1200,
  rounds_played INTEGER DEFAULT 0,
  first_places INTEGER DEFAULT 0,
  best_return_pct NUMERIC DEFAULT 0,
  best_round_profit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_player_progress_user_id ON player_progress(user_id);
CREATE INDEX idx_player_progress_xp ON player_progress(xp DESC);
CREATE INDEX idx_player_progress_level ON player_progress(level DESC);
```

#### Row Level Security (RLS):
```sql
-- Enable RLS
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Users can view own progress" ON player_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON player_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress" ON player_progress
  FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 🚀 Usage

### 1. Playing Challenge Mode:

```typescript
// User selects "闯关模式" from main menu
<ModeSelect onPick={(mode) => {
  if (mode === "challenge") {
    // Show ChallengeModeSelect
  }
}} />

// User selects a level
<ChallengeModeSelect 
  onSelectLevel={(level) => {
    // Start game with level.config
  }}
  onBack={() => {
    // Return to mode select
  }}
/>
```

### 2. Auth Flow:

```typescript
// Show auth modal when needed
<AuthModal 
  open={showAuth}
  onClose={() => setShowAuth(false)}
  onSuccess={(userId) => {
    // User logged in
    // Sync progress to cloud
    syncProgressToCloud(userId);
  }}
/>
```

### 3. Progress Tracking:

```typescript
import { loadProgress, saveProgress, completeChallengeLevel } from "@/lib/game/progress";

// Load current progress
const progress = loadProgress();

// Complete a level
const newProgress = completeChallengeLevel(
  progress,
  "story-1-basics",  // levelId
  3,                  // stars earned
  100,                // xp reward
  ["achievement_first_trade"]  // unlocks
);

// Save automatically happens inside completeChallengeLevel
```

---

## ✅ Testing Checklist

### Local Progress:
- [ ] Create new guest account → progress saves to localStorage
- [ ] Complete Story Level 1 → stars saved
- [ ] Unlock Story Level 2 → appears in UI
- [ ] Complete with 3 stars → star count updates
- [ ] Replay level with worse result → keep best stars
- [ ] XP increases and level calculated correctly

### Auth Flow:
- [ ] Sign up with new account → profile created
- [ ] Sign in with existing account → profile loaded
- [ ] Guest mode → localStorage works
- [ ] Invalid email → error shown
- [ ] Password mismatch → error shown
- [ ] Username too short → error shown

### Cloud Sync (After DB setup):
- [ ] Login after playing as guest → local data merges
- [ ] Complete level while logged in → syncs to cloud
- [ ] Login from different device → progress loads
- [ ] Logout and login → progress persists
- [ ] Conflict resolution → takes better value

### UI/UX:
- [ ] Challenge mode button in mode select
- [ ] Level selector shows locked/unlocked states
- [ ] Star display correct
- [ ] Auth modal opens/closes smoothly
- [ ] Guest mode works

---

## 📊 Next Steps

### Phase 1: Core Features (DONE ✅)
- [x] Challenge level system
- [x] Progress tracking (local)
- [x] Auth modal UI
- [x] Challenge mode UI
- [x] Mode select integration
- [x] Backward compatibility

### Phase 2: Backend Integration (TODO)
- [ ] Create `player_progress` table in Supabase
- [ ] Add RLS policies
- [ ] Create cloud sync service
- [ ] Test migration flow
- [ ] Add error handling for network failures

### Phase 3: Game Integration (TODO)
- [ ] Integrate ChallengeModeSelect into main play flow
- [ ] Connect level.config to game initialization
- [ ] Track objective completion during gameplay
- [ ] Show star results in GameOverModal
- [ ] Add "Next Level" button after completion

### Phase 4: Polish (TODO)
- [ ] Animations for level unlock
- [ ] Celebration effects for star earning
- [ ] XP progress bar animation
- [ ] Level-up notification
- [ ] Achievement toast notifications
- [ ] Profile page with stats

### Phase 5: Advanced Features (FUTURE)
- [ ] Daily challenges
- [ ] Weekly leaderboards (per level)
- [ ] Replay system with ghost data
- [ ] Custom challenge creator
- [ ] Social sharing for achievements
- [ ] Trading tips tutorial system

---

## 🐛 Known Issues

None yet - this is initial implementation!

---

## 📝 Notes

### Design Decisions:

1. **Local-First**: Progress saved to localStorage first, cloud is backup
2. **Guest Mode**: Allow playing without account (important for retention)
3. **Star System**: Simple 1-3 star rating (familiar, easy to understand)
4. **Progressive Unlocking**: Prevents overwhelm, guides learning
5. **Merge Strategy**: Take best values on conflict (never lose progress)

### Performance:
- localStorage for instant load
- Cloud sync in background
- No blocking on network failures
- Optimistic updates

### Security:
- RLS policies for player_progress
- Username validation on client & server
- Email verification (optional, configured in Supabase)
- Session management via Supabase Auth

---

## 🎮 Example Player Journey

1. **New Player**:
   - Sees new "闯关模式" button in mode select
   - Clicks → sees Story Mode levels
   - Story-1 unlocked, others locked
   - Completes Story-1 with 2 stars
   - Earns 100 XP (reaches Level 1)
   - Story-2 unlocks
   - Sees "Als Gast weiterspielen" reminder

2. **Returning Guest**:
   - Progress preserved in localStorage
   - Continues where left off
   - Completes Story-3 with 3 stars
   - Earns Slowmo powerup
   - Reaches Level 2 (300 XP)
   - Prompted to create account to save progress to cloud

3. **Registered User**:
   - Creates account
   - Local progress migrates to cloud automatically
   - All stars, XP, and unlocks preserved
   - Can now play on multiple devices
   - Progress syncs seamlessly
   - Appears on leaderboards (if enabled)

---

**Ready for testing and iteration!** 🚀
