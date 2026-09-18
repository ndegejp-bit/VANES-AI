CREATE TABLE IF NOT EXISTS vanes_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 anonymous_id TEXT NOT NULL,
 event TEXT NOT NULL,
 payload TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vanes_events_anonymous_id ON vanes_events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_vanes_events_event ON vanes_events(event);
CREATE INDEX IF NOT EXISTS idx_vanes_events_created_at ON vanes_events(created_at);