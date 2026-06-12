CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL,
  extracted_data TEXT,
  status TEXT DEFAULT 'pending'
);
