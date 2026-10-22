-- Player Progress Table for Challenge Mode & User Progress Tracking
-- Version: v3.0-challenge-mode
-- 
-- This table stores all player progress including:
-- - Challenge level completion & stars
-- - XP & player level
-- - Unlocked powerups, achievements, and titles
-- - Classic game stats (ELO, rounds played, etc.)
--
-- Backward compatible with existing profile system

-- Drop existing table if recreating (CAREFUL: This deletes all data!)
-- DROP TABLE IF EXISTS player_progress;

-- Create player_progress table
CREATE TABLE IF NOT EXISTS player_progress (
  -- Primary key: user ID from auth.users
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Challenge Mode Progress
  completed_levels JSONB DEFAULT '{}'::jsonb NOT NULL,
  -- Format: { "story-1-basics": 3, "story-2-timing": 2, "challenge-quick-profit": 1, ... }
  -- Key: level ID, Value: stars earned (0-3)
  
  xp INTEGER DEFAULT 0 NOT NULL CHECK (xp >= 0),
  level INTEGER DEFAULT 1 NOT NULL CHECK (level >= 1),
  
  unlocked_powerups TEXT[] DEFAULT '{}',
  -- Array of powerup IDs: ["freeze", "slowmo", "leverage", "shield", "tip"]
  
  unlocked_achievements TEXT[] DEFAULT '{}',
  -- Array of achievement IDs: ["achievement_first_trade", "achievement_story_complete", ...]
  
  unlocked_titles TEXT[] DEFAULT '{}',
  -- Array of title IDs: ["title_trading_god", ...]
  
  -- Classic Game Stats (for backward compatibility)
  elo_rating INTEGER DEFAULT 1200 NOT NULL CHECK (elo_rating >= 0),
  best_elo INTEGER DEFAULT 1200 NOT NULL CHECK (best_elo >= 0),
  rounds_played INTEGER DEFAULT 0 NOT NULL CHECK (rounds_played >= 0),
  first_places INTEGER DEFAULT 0 NOT NULL CHECK (first_places >= 0),
  best_return_pct NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  best_round_profit NUMERIC(15, 2) DEFAULT 0 NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_progress_xp ON player_progress(xp DESC);
CREATE INDEX IF NOT EXISTS idx_player_progress_level ON player_progress(level DESC);
CREATE INDEX IF NOT EXISTS idx_player_progress_elo ON player_progress(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_player_progress_updated_at ON player_progress(updated_at DESC);

-- GIN index for JSONB queries on completed_levels
CREATE INDEX IF NOT EXISTS idx_player_progress_completed_levels ON player_progress USING GIN (completed_levels);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_player_progress_updated_at
  BEFORE UPDATE ON player_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_player_progress_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own progress
DROP POLICY IF EXISTS "Users can view own progress" ON player_progress;
CREATE POLICY "Users can view own progress" ON player_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress (first time)
DROP POLICY IF EXISTS "Users can insert own progress" ON player_progress;
CREATE POLICY "Users can insert own progress" ON player_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own progress
DROP POLICY IF EXISTS "Users can update own progress" ON player_progress;
CREATE POLICY "Users can update own progress" ON player_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own progress (optional, for account deletion)
DROP POLICY IF EXISTS "Users can delete own progress" ON player_progress;
CREATE POLICY "Users can delete own progress" ON player_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Public leaderboard view (optional, for future feature)
-- Only show players who have opted in to leaderboards
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT 
  up.username,
  up.display_name,
  pp.xp,
  pp.level,
  pp.elo_rating,
  pp.rounds_played,
  pp.first_places,
  pp.best_return_pct,
  pp.best_round_profit
FROM player_progress pp
JOIN user_profiles up ON pp.user_id = up.id
WHERE up.show_in_leaderboard = true
ORDER BY pp.xp DESC
LIMIT 100;

-- Grant access to authenticated users
GRANT SELECT ON public_leaderboard TO authenticated;

-- Comments for documentation
COMMENT ON TABLE player_progress IS 'Stores player progress for Challenge Mode and classic game stats';
COMMENT ON COLUMN player_progress.completed_levels IS 'JSONB map of level_id to stars earned (0-3)';
COMMENT ON COLUMN player_progress.xp IS 'Total experience points earned';
COMMENT ON COLUMN player_progress.level IS 'Player level calculated from XP (level = 1 + floor(sqrt(xp/50)))';
COMMENT ON COLUMN player_progress.unlocked_powerups IS 'Array of unlocked powerup IDs';
COMMENT ON COLUMN player_progress.unlocked_achievements IS 'Array of unlocked achievement IDs';
COMMENT ON COLUMN player_progress.unlocked_titles IS 'Array of unlocked title IDs';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'player_progress table created successfully!';
  RAISE NOTICE 'RLS policies enabled and configured.';
  RAISE NOTICE 'Indexes created for optimal performance.';
  RAISE NOTICE 'Ready for Challenge Mode v3.0!';
END $$;
