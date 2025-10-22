-- Auth Service Database Schema (VARCHAR ID version)
-- Compatible with existing Supabase auth schema
-- PostgreSQL 14+

-- Drop existing tables if you want to start fresh (CAREFUL: deletes all data!)
-- DROP TABLE IF EXISTS device_credentials CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS webauthn_credentials CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Users table (using VARCHAR ID to match existing schema)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- WebAuthn credentials table
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_credential_id ON webauthn_credentials(credential_id);

-- Sessions table (for refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_session FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Device Token Auth credentials table
CREATE TABLE IF NOT EXISTS device_credentials (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key VARCHAR(130) NOT NULL UNIQUE,
  device_id VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  os_name VARCHAR(100),
  os_version VARCHAR(100),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_device FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_credentials_user_id ON device_credentials(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_credentials_public_key ON device_credentials(public_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_credentials_device_id ON device_credentials(device_id);

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts (no PII - only VARCHAR ID for compatibility)';
COMMENT ON TABLE webauthn_credentials IS 'WebAuthn credentials (passkeys, security keys)';
COMMENT ON TABLE device_credentials IS 'Device Token Auth credentials (ECDSA P-256 public keys)';
COMMENT ON TABLE sessions IS 'Refresh token sessions';
