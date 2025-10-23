/**
 * Phase 6: Performance Testing
 *
 * Tests audit logging latency and concurrent request handling
 */

import { auditService } from '../src/audit/AuditService';
import { db } from '../src/db';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

// Test 21: Audit Latency Measurement
async function test21_AuditLatency() {
  console.log('\nTest 21: Audit Latency Measurement...');

  try {
    const iterations = 100;
    const latencies: number[] = [];

    console.log(`  Running ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      await auditService.logEvent({
        userId: `test-user-${i}`,
        username: `testuser${i}`,
        actionType: 'login_success',
        entityType: 'user',
        entityId: `test-user-${i}`,
        deviceId: `device-${i}`,
        platform: 'web',
        success: true,
      });

      const end = performance.now();
      latencies.push(end - start);

      // Show progress every 20 iterations
      if ((i + 1) % 20 === 0) {
        process.stdout.write(`  Progress: ${i + 1}/${iterations}\r`);
      }
    }

    console.log(''); // New line after progress

    const avg = latencies.reduce((a, b) => a + b) / latencies.length;
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    // Wait a bit for async processing
    console.log('  Waiting for async processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check how many actually made it to the database
    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM secure_audit_logs
       WHERE created_at > NOW() - INTERVAL '10 seconds'`
    );
    const dbCount = parseInt(result.rows[0].count, 10);

    const passed = avg < 10; // Should be under 10ms average

    results.push({
      name: 'Test 21: Audit Latency',
      passed,
      details: `Avg: ${avg.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms, Max: ${max.toFixed(2)}ms, DB: ${dbCount}/${iterations}`,
    });

    if (passed) {
      console.log('✅ PASS: Audit latency is acceptable');
    } else {
      console.log('⚠️  WARNING: Audit latency is high (> 10ms average)');
    }

    console.log(`  - Average: ${avg.toFixed(2)}ms`);
    console.log(`  - Min: ${min.toFixed(2)}ms`);
    console.log(`  - Max: ${max.toFixed(2)}ms`);
    console.log(`  - P95: ${p95.toFixed(2)}ms`);
    console.log(`  - Total: ${(avg * iterations).toFixed(2)}ms`);
    console.log(`  - Logs in DB: ${dbCount}/${iterations}`);
  } catch (error: any) {
    results.push({
      name: 'Test 21: Audit Latency',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Test 22: Concurrent Requests
async function test22_ConcurrentRequests() {
  console.log('\nTest 22: Concurrent Request Handling...');

  try {
    const concurrency = 50;
    const totalRequests = 200;

    console.log(`  Testing ${totalRequests} requests with ${concurrency} concurrent...`);

    const startTime = Date.now();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < totalRequests; i++) {
      const promise = auditService.logEvent({
        userId: `concurrent-user-${i}`,
        username: `concuser${i}`,
        actionType: 'login_success',
        entityType: 'user',
        entityId: `concurrent-user-${i}`,
        deviceId: `concurrent-device-${i}`,
        platform: 'web',
        success: true,
        metadata: {
          testType: 'concurrent',
          requestId: i,
        },
      });

      promises.push(promise);

      // Limit concurrency
      if (promises.length >= concurrency) {
        await Promise.race(promises);
      }
    }

    // Wait for all remaining
    await Promise.all(promises);

    const duration = Date.now() - startTime;
    const throughput = (totalRequests / duration) * 1000;

    // Wait for async processing
    console.log('  Waiting for async processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check database
    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM secure_audit_logs
       WHERE created_at > NOW() - INTERVAL '30 seconds'
         AND entity_id LIKE 'concurrent-user-%'`
    );
    const dbCount = parseInt(result.rows[0].count, 10);

    const passed = duration < 10000 && dbCount >= totalRequests * 0.95; // Should complete in <10s with 95%+ success

    results.push({
      name: 'Test 22: Concurrent Requests',
      passed,
      details: `${totalRequests} requests in ${duration}ms (${throughput.toFixed(0)} req/s), ${dbCount} in DB`,
    });

    if (passed) {
      console.log('✅ PASS: Concurrent request handling is good');
    } else {
      console.log('⚠️  WARNING: Performance or reliability issue detected');
    }

    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Throughput: ${throughput.toFixed(0)} requests/sec`);
    console.log(`  - Logs in DB: ${dbCount}/${totalRequests} (${((dbCount / totalRequests) * 100).toFixed(1)}%)`);
  } catch (error: any) {
    results.push({
      name: 'Test 22: Concurrent Requests',
      passed: false,
      error: error.message,
    });
    console.log(`❌ FAIL: ${error.message}`);
  }
}

// Print summary
function printSummary() {
  console.log('\n==========================================');
  console.log('Phase 6: Performance Testing Summary');
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
  console.log('Phase 6: Performance Testing');
  console.log('==========================================');
  console.log('');

  try {
    await test21_AuditLatency();
    await test22_ConcurrentRequests();

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
