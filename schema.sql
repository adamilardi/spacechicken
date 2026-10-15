CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id TEXT PRIMARY KEY,
    level INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'normal',
    name TEXT NOT NULL,
    time_ms INTEGER NOT NULL,
    deaths INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS leaderboard_rank_idx
ON leaderboard_entries (level, time_ms ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS leaderboard_mode_rank_idx
ON leaderboard_entries (mode, level, time_ms ASC, created_at ASC);

-- Migration for databases created before the hard-mode split (GB-1).
-- Fresh databases get `mode` from the CREATE TABLE above; run this once
-- against an existing database before deploying the split code:
--   ALTER TABLE leaderboard_entries ADD COLUMN mode TEXT NOT NULL DEFAULT 'normal';
--
-- Migration for per-level death counts on online boards. Run once against an
-- existing database before deploying code that writes `deaths`:
--   ALTER TABLE leaderboard_entries ADD COLUMN deaths INTEGER NOT NULL DEFAULT 0;
