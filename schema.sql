-- Geopoints table for storing approved locations
CREATE TABLE IF NOT EXISTS geopoints (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  approved_by TEXT
);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_geopoints_location ON geopoints(lat, lng);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_geopoints_slug ON geopoints(slug); 