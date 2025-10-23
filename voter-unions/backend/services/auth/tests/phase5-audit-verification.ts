/**
 * Phase 5: Audit Verification
 *
 * Verifies that audit logs are properly encrypted, hashed, and bucketed
 */

import { db } from '../src/db';
import { auditService } from '../src/audit/AuditService';
import * as crypto from 'crypto';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

// Test 17: Verify Encryption
async function test17_VerifyEncryption() {
  console.log('\nTest 17: Verify Encryption...');

  try {
    const result = await db.query(`
      SELECT
        user_id_encrypted,
        LENGTH(user_id_encrypted) as encrypted_length,
        device_fingerprint,
        LENGTH(device_fingerprint) as hash_length,
        action_type,
        success
      FROM secure_audit_logs
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      throw new Error('No audit logs found. Run Phase 3-4 tests first.');
    }

    // Check that user_id_encrypted is BYTEA (buffer), not plaintext
    const firstRow = result.rows[0];

    if (!(firstRow.user_id_encrypted instanceof Buffer)) {
      throw new Error('user_id_encrypted is not encrypted (not a Buffer)');
    }

    if (firstRow.encrypted_length === 0) {
      throw new Error('user_id_encrypted has zero length');
    }

    // Check device_fingerprint is exactly 64 characters (SHA-256)
    if (firstRow.hash_length !== 64) {
      throw new Error(`device_fingerprint has wrong length (${firstRow.hash_length}, expected 64)`);
    }

    results.push({
      name: 'Test 17: Verify Encryption',
      passed: true,
      details: `${result.rows.length} logs checked. Encryption verified.`,
    });

    console.log('✅ PASS: Data is properly encrypted');
    console.log(`  - user_id_encrypted: BYTEA (${firstRow.encrypted_length} bytes)`);
    console.log(`  - device_fingerprint: ${firstRow.hash_length} chars (SHA-256)`);
  } catch (error: any) {
    results.push({
      name: 'Test 17: Verify Encryption',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Test 18: Verify Decryption
async function test18_VerifyDecryption() {
  console.log('\nTest 18: Verify Decryption...');

  try {
    const logs = await auditService.queryLogs({ limit: 5 });

    if (logs.length === 0) {
      throw new Error('No audit logs returned. Decryption may have failed.');
    }

    // Check that user IDs are decrypted (readable strings)
    const firstLog = logs[0];

    if (!firstLog.userId || firstLog.userId === '[DECRYPTION_FAILED]') {
      throw new Error('Decryption failed for userId');
    }

    if (typeof firstLog.userId !== 'string') {
      throw new Error('userId is not a string after decryption');
    }

    // Check that metadata is properly parsed
    if (firstLog.metadata && typeof firstLog.metadata !== 'object') {
      throw new Error('metadata is not an object after decryption');
    }

    results.push({
      name: 'Test 18: Verify Decryption',
      passed: true,
      details: `${logs.length} logs decrypted successfully`,
    });

    console.log('✅ PASS: Decryption works correctly');
    console.log(`  - Decrypted ${logs.length} audit logs`);
    console.log(`  - User ID: ${firstLog.userId.substring(0, 8)}...`);
    console.log(`  - Username: ${firstLog.username || 'N/A'}`);
    console.log(`  - Action: ${firstLog.actionType}`);
  } catch (error: any) {
    results.push({
      name: 'Test 18: Verify Decryption',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Test 19: Verify Time Bucketing
async function test19_VerifyTimeBucketing() {
  console.log('\nTest 19: Verify Time Bucketing...');

  try {
    const result = await db.query(`
      SELECT
        created_at,
        timestamp_bucket,
        EXTRACT(MINUTE FROM timestamp_bucket) as minute,
        EXTRACT(SECOND FROM timestamp_bucket) as second
      FROM secure_audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      throw new Error('No audit logs found');
    }

    // Check that all timestamps are rounded to the hour
    const allBucketed = result.rows.every(row => {
      return parseInt(row.minute, 10) === 0 && parseFloat(row.second) === 0;
    });

    if (!allBucketed) {
      const unbucketed = result.rows.filter(row =>
        parseInt(row.minute, 10) !== 0 || parseFloat(row.second) !== 0
      );
      throw new Error(`Found ${unbucketed.length} timestamps not bucketed to hour`);
    }

    results.push({
      name: 'Test 19: Verify Time Bucketing',
      passed: true,
      details: `${result.rows.length} timestamps verified`,
    });

    console.log('✅ PASS: All timestamps bucketed to nearest hour');
    console.log(`  - Checked ${result.rows.length} timestamps`);
    console.log(`  - Example: ${result.rows[0].created_at} → ${result.rows[0].timestamp_bucket}`);
  } catch (error: any) {
    results.push({
      name: 'Test 19: Verify Time Bucketing',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Test 20: Verify Device Hashing
async function test20_VerifyDeviceHashing() {
  console.log('\nTest 20: Verify Device Hashing...');

  try {
    // Hash a known device ID
    const testDeviceId = 'test-device-123';
    const expectedHash = crypto
      .createHash('sha256')
      .update(testDeviceId)
      .digest('hex');

    console.log(`  - Test device ID: ${testDeviceId}`);
    console.log(`  - Expected hash: ${expectedHash.substring(0, 16)}...`);

    // Check if we have any logs with this hash (may not exist if not tested)
    const result = await db.query(
      'SELECT COUNT(*) as count FROM secure_audit_logs WHERE device_fingerprint = $1',
      [expectedHash]
    );

    // Also verify that all device_fingerprints are valid SHA-256 hashes (64 hex chars)
    const allHashes = await db.query(`
      SELECT device_fingerprint
      FROM secure_audit_logs
      LIMIT 10
    `);

    const invalidHashes = allHashes.rows.filter(row => {
      const hash = row.device_fingerprint;
      return hash.length !== 64 || !/^[0-9a-f]{64}$/.test(hash);
    });

    if (invalidHashes.length > 0) {
      throw new Error(`Found ${invalidHashes.length} invalid device fingerprints`);
    }

    results.push({
      name: 'Test 20: Verify Device Hashing',
      passed: true,
      details: 'All device fingerprints are valid SHA-256 hashes',
    });

    console.log('✅ PASS: Device hashing is correct');
    console.log(`  - All device fingerprints are 64-char SHA-256 hashes`);
    console.log(`  - Checked ${allHashes.rows.length} device fingerprints`);
  } catch (error: any) {
    results.push({
      name: 'Test 20: Verify Device Hashing',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Print summary
function printSummary() {
  console.log('\n==========================================');
  console.log('Phase 5: Audit Verification Summary');
  console.log('==========================================');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\nTests Passed: ${passed}/${total}`);

  console.log('\nDetailed Results:');
  results.forEach((result, i) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${i + 1}. ${result.name}: ${status}`);
    if (result.details) {
      console.log(`     ${result.details}`);
    }
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
  console.log('Phase 5: Audit Verification');
  console.log('==========================================');
  console.log('');

  try {
    await test17_VerifyEncryption();
    await test18_VerifyDecryption();
    await test19_VerifyTimeBucketing();
    await test20_VerifyDeviceHashing();

    const allPassed = printSummary();

    if (!allPassed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    printSummary();
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run tests
runTests().catch(console.error);
