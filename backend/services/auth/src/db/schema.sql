-- Auth Service Database Schema
-- PostgreSQL 14+

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create index on created_at for analytics
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- WebAuthn credentials table
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_credential_id ON webauthn_credentials(credential_id);

-- Sessions table (for refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_session FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Device Token Auth credentials table
CREATE TABLE IF NOT EXISTS device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key VARCHAR(130) NOT NULL UNIQUE,
  device_id VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  os_name VARCHAR(100),
  os_version VARCHAR(100),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_device FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for device credentials
CREATE INDEX IF NOT EXISTS idx_device_credentials_user_id ON device_credentials(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_credentials_public_key ON device_credentials(public_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_credentials_device_id ON device_credentials(device_id);

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts (no PII - only UUID)';
COMMENT ON TABLE webauthn_credentials IS 'WebAuthn credentials (passkeys, security keys)';
COMMENT ON TABLE device_credentials IS 'Device Token Auth credentials (ECDSA P-256 public keys)';
COMMENT ON TABLE sessions IS 'Refresh token sessions';

COMMENT ON COLUMN users.id IS 'User UUID (never changes)';
COMMENT ON COLUMN webauthn_credentials.credential_id IS 'Base64URL-encoded credential ID from WebAuthn';
COMMENT ON COLUMN webauthn_credentials.public_key IS 'Base64URL-encoded public key';
COMMENT ON COLUMN webauthn_credentials.counter IS 'Signature counter for replay protection';
COMMENT ON COLUMN device_credentials.public_key IS 'Hex-encoded P-256 public key (65 bytes = 130 hex chars)';
COMMENT ON COLUMN device_credentials.device_id IS 'Unique device identifier from expo-device';
COMMENT ON COLUMN sessions.refresh_token IS 'Hashed refresh token';
