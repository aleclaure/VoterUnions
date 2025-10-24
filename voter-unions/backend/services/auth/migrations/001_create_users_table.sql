-- Users table for device token authentication with hybrid auth support
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  platform TEXT,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  username TEXT UNIQUE,
  password_hash TEXT
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
