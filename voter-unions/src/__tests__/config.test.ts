/**
 * Configuration Tests
 * 
 * Tests for feature flag configuration system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('CONFIG', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  it('should parse boolean environment variables correctly', () => {
    // This test verifies the parseBoolean function works
    process.env.EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION = 'true';
    
    // Re-import config to get new values
    delete require.cache[require.resolve('../config')];
    const { CONFIG } = require('../config');
    
    expect(CONFIG.REQUIRE_EMAIL_VERIFICATION).toBe(true);
  });

  it('should parse number environment variables correctly', () => {
    process.env.EXPO_PUBLIC_WEBAUTHN_ROLLOUT_PERCENT = '50';
    
    delete require.cache[require.resolve('../config')];
    const { CONFIG } = require('../config');
    
    expect(CONFIG.WEBAUTHN_ROLLOUT_PERCENT).toBe(50);
  });

  it('should use default values when env vars not set', () => {
    delete process.env.EXPO_PUBLIC_REQUIRE_EMAIL_VERIFICATION;
    delete process.env.EXPO_PUBLIC_USE_WEBAUTHN;
    delete process.env.EXPO_PUBLIC_USE_NEW_BACKEND;
    
    delete require.cache[require.resolve('../config')];
    const { CONFIG } = require('../config');
    
    expect(CONFIG.REQUIRE_EMAIL_VERIFICATION).toBe(true); // Default: enabled
    expect(CONFIG.USE_WEBAUTHN).toBe(false); // Default: use Supabase
    expect(CONFIG.USE_NEW_BACKEND).toBe(false); // Default: use Supabase
  });

  it('should have correct API URL default', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    
    delete require.cache[require.resolve('../config')];
    const { CONFIG } = require('../config');
    
    expect(CONFIG.API_URL).toBe('http://localhost:3001');
  });
});
