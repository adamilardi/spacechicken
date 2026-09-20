CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id TEXT PRIMARY KEY,
    level INTEGER NOT NULL,
    name TEXT NOT NULL,
    time_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS leaderboard_rank_idx
ON leaderboard_entries (level, time_ms ASC, created_at ASC);
