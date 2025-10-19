/**
 * Health Check Tests
 */

import { describe, it, expect } from 'vitest';

describe('Auth Service Health', () => {
  it('should have basic test infrastructure', () => {
    expect(true).toBe(true);
  });
  
  it('should export types correctly', async () => {
    const types = await import('../src/types/index.js');
    expect(types).toBeDefined();
  });
  
  it('should export jwt utils correctly', async () => {
    const jwt = await import('../src/utils/jwt.js');
    expect(jwt.generateAccessToken).toBeDefined();
    expect(jwt.generateRefreshToken).toBeDefined();
    expect(jwt.verifyToken).toBeDefined();
  });
  
  it('should export validation schemas correctly', async () => {
    const validation = await import('../src/utils/validation.js');
    expect(validation.RegisterInitSchema).toBeDefined();
    expect(validation.RegisterVerifySchema).toBeDefined();
    expect(validation.AuthInitSchema).toBeDefined();
    expect(validation.AuthVerifySchema).toBeDefined();
  });
});
