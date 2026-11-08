CREATE TABLE IF NOT EXISTS organizers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  refresh_token TEXT,
  session_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  organizer_id TEXT REFERENCES organizers(id),
  drive_folder_id TEXT,
  photo_limit INTEGER NOT NULL DEFAULT 20,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id),
  nickname TEXT NOT NULL,
  filename TEXT NOT NULL,
  drive_file_id TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guest_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id),
  nickname TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions ON guest_sessions(event_id, ip_address);
