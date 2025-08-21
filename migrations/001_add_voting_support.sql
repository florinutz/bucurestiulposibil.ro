-- Add voting support to geopoints
ALTER TABLE geopoints ADD COLUMN is_votable BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_geopoints_votable ON geopoints(is_votable);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  geopoint_id TEXT NOT NULL,
  voted_at TEXT NOT NULL,
  browser_fingerprint TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (geopoint_id) REFERENCES geopoints(id),
  UNIQUE(geopoint_id, browser_fingerprint)
);

-- Indexes for votes table
CREATE INDEX IF NOT EXISTS idx_votes_geopoint ON votes(geopoint_id);
CREATE INDEX IF NOT EXISTS idx_votes_fingerprint ON votes(browser_fingerprint);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);
