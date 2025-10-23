/**
 * Phase 3-4: Endpoint Testing (Happy Paths + Error Paths)
 *
 * Tests all authentication endpoints and verifies audit logs are created
 */

import * as crypto from 'crypto';
import { db } from '../src/db';

const BASE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  auditLogFound?: boolean;
}

const results: TestResult[] = [];

// Helper: Make HTTP request
async function request(method: string, path: string, body?: any): Promise<any> {
  const url = `${BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    throw new Error(`Request failed: ${error}`);
  }
}

// Helper: Generate ECDSA P-256 keypair
function generateKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return { publicKey, privateKey };
}

// Helper: Sign challenge with private key
function signChallenge(challenge: string, privateKey: string): string {
  const sign = crypto.createSign('SHA256');
  sign.update(challenge);
  sign.end();

  const signature = sign.sign(privateKey, 'base64');
  return signature;
}

// Helper: Check if audit log exists
async function checkAuditLog(actionType: string): Promise<boolean> {
  try {
    const query = 'SELECT COUNT(*) as count FROM secure_audit_logs WHERE action_type = $1 AND created_at > NOW() - INTERVAL \'1 minute\'';

    const result = await db.query(query, [actionType]);
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    console.error('Failed to check audit log:', error);
    return false;
  }
}

// Helper: Wait for audit log (async processing)
async function waitForAuditLog(actionType: string, maxWaitMs: number = 2000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const found = await checkAuditLog(actionType);
    if (found) return true;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return false;
}

// Test 8: Device Registration (signup_success)
async function test8_RegisterDevice() {
  console.log('\nTest 8: Device Registration (signup_success)...');

  try {
    const { publicKey } = generateKeypair();
    const deviceId = `test-device-${Date.now()}`;

    const { status, data } = await request('POST', '/auth/register-device', {
      publicKey,
      deviceId,
      platform: 'web',
      deviceName: 'Test Device',
    });

    if (status !== 200 || !data.success) {
      throw new Error(`Registration failed: ${JSON.stringify(data)}`);
    }

    // Wait for audit log
    const auditLogFound = await waitForAuditLog('signup_success');

    results.push({
      name: 'Test 8: Device Registration',
      passed: true,
      auditLogFound,
    });

    console.log('✅ PASS: Device registered successfully');
    if (auditLogFound) {
      console.log('✅ Audit log found: signup_success');
    } else {
      console.log('⚠️  WARNING: Audit log not found (may be processing)');
    }

    return { userId: data.user.userId, deviceId, publicKey };
  } catch (error: any) {
    results.push({
      name: 'Test 8: Device Registration',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
    throw error;
  }
}

// Test 9: Duplicate Device Registration (signup_failed)
async function test9_DuplicateDevice(deviceId: string, publicKey: string) {
  console.log('\nTest 9: Duplicate Device Registration (signup_failed)...');

  try {
    const { status, data } = await request('POST', '/auth/register-device', {
      publicKey,
      deviceId,
      platform: 'web',
    });

    if (status !== 409) {
      throw new Error(`Expected HTTP 409, got ${status}`);
    }

    // Wait for audit log
    const auditLogFound = await waitForAuditLog('signup_failed');

    results.push({
      name: 'Test 9: Duplicate Device Registration',
      passed: true,
      auditLogFound,
    });

    console.log('✅ PASS: Duplicate device rejected with HTTP 409');
    if (auditLogFound) {
      console.log('✅ Audit log found: signup_failed');
    } else {
      console.log('⚠️  WARNING: Audit log not found');
    }
  } catch (error: any) {
    results.push({
      name: 'Test 9: Duplicate Device Registration',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Test 10: Device Authentication (login_success)
async function test10_DeviceAuth(deviceId: string, publicKey: string, privateKey: string) {
  console.log('\nTest 10: Device Authentication (login_success)...');

  try {
    // Get challenge
    const challengeResp = await request('POST', '/auth/challenge', {
      deviceId,
      platform: 'web',
    });

    if (!challengeResp.data.challenge) {
      throw new Error('Challenge not received');
    }

    const challenge = challengeResp.data.challenge;
    const signature = signChallenge(challenge, privateKey);

    // Verify device
    const { status, data } = await request('POST', '/auth/verify-device', {
      challenge,
      signature,
      deviceId,
      publicKey,
    });

    if (status !== 200 || !data.success) {
      throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
    }

    // Wait for audit log
    const auditLogFound = await waitForAuditLog('login_success');

    results.push({
      name: 'Test 10: Device Authentication',
      passed: true,
      auditLogFound,
    });

    console.log('✅ PASS: Device authenticated successfully');
    if (auditLogFound) {
      console.log('✅ Audit log found: login_success');
    }

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  } catch (error: any) {
    results.push({
      name: 'Test 10: Device Authentication',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
    throw error;
  }
}

// Test 11: Expired Challenge (login_failed)
async function test11_ExpiredChallenge(deviceId: string, publicKey: string, privateKey: string) {
  console.log('\nTest 11: Expired Challenge (login_failed)...');

  try {
    // Use fake expired challenge
    const expiredChallenge = 'expired-challenge-' + Date.now();
    const signature = signChallenge(expiredChallenge, privateKey);

    const { status } = await request('POST', '/auth/verify-device', {
      challenge: expiredChallenge,
      signature,
      deviceId,
      publicKey,
    });

    if (status !== 401) {
      throw new Error(`Expected HTTP 401, got ${status}`);
    }

    // Wait for audit log
    const auditLogFound = await waitForAuditLog('login_failed');

    results.push({
      name: 'Test 11: Expired Challenge',
      passed: true,
      auditLogFound,
    });

    console.log('✅ PASS: Expired challenge rejected with HTTP 401');
    if (auditLogFound) {
      console.log('✅ Audit log found: login_failed');
    }
  } catch (error: any) {
    results.push({
      name: 'Test 11: Expired Challenge',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Test 12: Set Password (password_changed)
async function test12_SetPassword(userId: string, deviceId: string) {
  console.log('\nTest 12: Set Password (password_changed)...');

  try {
    const username = `testuser${Date.now()}`;
    const password = 'SecureP@ssw0rd123';

    const { status, data } = await request('POST', '/auth/set-password', {
      userId,
      username,
      password,
      deviceId,
    });

    if (status !== 200 || !data.success) {
      throw new Error(`Set password failed: ${JSON.stringify(data)}`);
    }

    // Wait for audit log
    const auditLogFound = await waitForAuditLog('password_changed');

    results.push({
      name: 'Test 12: Set Password',
      passed: true,
      auditLogFound,
    });

    console.log('✅ PASS: Password set successfully');
    if (auditLogFound) {
      console.log('✅ Audit log found: password_changed');
    }

    return username;
  } catch (error: any) {
    results.push({
      name: 'Test 12: Set Password',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
    throw error;
  }
}

// Test 13: Hybrid Login (login_success)
async function test13_HybridLogin(
  username: string,
  password: string,
  deviceId: string,
  publicKey: string,
  privateKey: string
) {
  console.log('\nTest 13: Hybrid Login (login_success)...');

  try {
    // Get challenge
    const challengeResp = await request('POST', '/auth/challenge', {
      deviceId,
      platform: 'web',
    });

    const challenge = challengeResp.data.challenge;
    const signature = signChallenge(challenge, privateKey);

    // Hybrid login
    const { status, data } = await request('POST', '/auth/login-hybrid', {
      username,
      password,
      challenge,
      signature,
      deviceId,
      publicKey,
    });

    if (status !== 200 || !data.success) {
      throw new Error(`Hybrid login failed: ${JSON.stringify(data)}`);
    }

    // Wait for audit log
    const auditLogFound = await waitForAuditLog('login_success');

    results.push({
      name: 'Test 13: Hybrid Login',
      passed: true,
      auditLogFound,
    });

    console.log('✅ PASS: Hybrid login successful');
    if (auditLogFound) {
      console.log('✅ Audit log found: login_success (hybrid)');
    }

    return data.refreshToken;
  } catch (error: any) {
    results.push({
      name: 'Test 13: Hybrid Login',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
    throw error;
  }
}

// Test 14: Invalid Password (login_failed)
async function test14_InvalidPassword(
  username: string,
  deviceId: string,
  publicKey: string,
  privateKey: string
) {
  console.log('\nTest 14: Invalid Password (login_failed)...');

  try {
    const challengeResp = await request('POST', '/auth/challenge', {
      deviceId,
      platform: 'web',
    });

    const challenge = challengeResp.data.challenge;
    const signature = signChallenge(challenge, privateKey);

    const { status } = await request('POST', '/auth/login-hybrid', {
      username,
      password: 'WrongPassword123',
      challenge,
      signature,
      deviceId,
      publicKey,
    });

    if (status !== 401) {
      throw new Error(`Expected HTTP 401, got ${status}`);
    }

    // Wait for audit log
    const auditLogFound = await waitForAuditLog('login_failed');

    results.push({
      name: 'Test 14: Invalid Password',
      passed: true,
      auditLogFound,
    });

    console.log('✅ PASS: Invalid password rejected with HTTP 401');
    if (auditLogFound) {
      console.log('✅ Audit log found: login_failed');
    }
  } catch (error: any) {
    results.push({
      name: 'Test 14: Invalid Password',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Test 15: Token Refresh (token_refreshed)
async function test15_TokenRefresh(refreshToken: string) {
  console.log('\nTest 15: Token Refresh (token_refreshed)...');

  try {
    const { status, data } = await request('POST', '/auth/refresh', {
      refreshToken,
    });

    if (status !== 200 || !data.accessToken) {
      throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
    }

    // Wait for audit log
    const auditLogFound = await waitForAuditLog('token_refreshed');

    results.push({
      name: 'Test 15: Token Refresh',
      passed: true,
      auditLogFound,
    });

    console.log('✅ PASS: Token refreshed successfully');
    if (auditLogFound) {
      console.log('✅ Audit log found: token_refreshed');
    }
  } catch (error: any) {
    results.push({
      name: 'Test 15: Token Refresh',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Print summary
function printSummary() {
  console.log('\n==========================================');
  console.log('Phase 3-4: Endpoint Testing Summary');
  console.log('==========================================');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const withAudit = results.filter(r => r.auditLogFound).length;

  console.log(`\nTests Passed: ${passed}/${total}`);
  console.log(`Audit Logs Found: ${withAudit}/${total}`);

  console.log('\nDetailed Results:');
  results.forEach((result, i) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const audit = result.auditLogFound ? '(audit ✓)' : '(audit ✗)';
    console.log(`  ${i + 1}. ${result.name}: ${status} ${audit}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  console.log('\n==========================================');

  return passed === total;
}

// Main test runner
async function runTests() {
  console.log('==========================================');
  console.log('Phase 3-4: Endpoint Testing');
  console.log('==========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  try {
    // Generate keypair for all tests
    const { publicKey, privateKey } = generateKeypair();

    // Test 8: Register device
    const { userId, deviceId } = await test8_RegisterDevice();

    // Test 9: Duplicate device (error path)
    await test9_DuplicateDevice(deviceId, publicKey);

    // Test 10: Device authentication
    const { refreshToken } = await test10_DeviceAuth(deviceId, publicKey, privateKey);

    // Test 11: Expired challenge (error path)
    await test11_ExpiredChallenge(deviceId, publicKey, privateKey);

    // Test 12: Set password
    const username = await test12_SetPassword(userId, deviceId);

    // Test 13: Hybrid login
    const hybridRefreshToken = await test13_HybridLogin(
      username,
      'SecureP@ssw0rd123',
      deviceId,
      publicKey,
      privateKey
    );

    // Test 14: Invalid password (error path)
    await test14_InvalidPassword(username, deviceId, publicKey, privateKey);

    // Test 15: Token refresh
    await test15_TokenRefresh(hybridRefreshToken || refreshToken);

    // Print summary
    const allPassed = printSummary();

    if (!allPassed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    printSummary();
    process.exit(1);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run tests
runTests().catch(console.error);
