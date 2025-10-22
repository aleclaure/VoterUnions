/**
 * Quick verification script for shared crypto utilities
 */

import {
  bytesToHex,
  hexToBytes,
  hashChallenge,
  hashChallengeHex,
  prepareMessageForSigning,
  verifyHash,
} from './src/services/sharedCryptoUtils.js';

console.log('🧪 Testing Shared Crypto Utilities\n');

let passed = 0;
let failed = 0;

// Test 1: bytesToHex and hexToBytes
try {
  const testBytes = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
  const hex = bytesToHex(testBytes);
  const bytesBack = hexToBytes(hex);

  if (hex === '0123456789abcdef' && bytesBack.every((b, i) => b === testBytes[i])) {
    console.log('✅ Test 1: bytesToHex and hexToBytes inverse operations');
    passed++;
  } else {
    throw new Error('Mismatch');
  }
} catch (e) {
  console.log('❌ Test 1 FAILED:', e.message);
  failed++;
}

// Test 2: hashChallenge consistency
try {
  const testChallenge = 'test-challenge-12345';
  const hash1 = hashChallenge(testChallenge);
  const hash2 = hashChallenge(testChallenge);

  if (bytesToHex(hash1) === bytesToHex(hash2) && hash1.length === 32) {
    console.log('✅ Test 2: hashChallenge produces consistent 32-byte results');
    passed++;
  } else {
    throw new Error('Inconsistent hashes');
  }
} catch (e) {
  console.log('❌ Test 2 FAILED:', e.message);
  failed++;
}

// Test 3: hashChallengeHex format
try {
  const testChallenge = 'test-challenge-12345';
  const hash = hashChallengeHex(testChallenge);

  if (typeof hash === 'string' && hash.length === 64 && /^[0-9a-f]+$/.test(hash)) {
    console.log('✅ Test 3: hashChallengeHex returns valid 64-char hex string');
    passed++;
  } else {
    throw new Error('Invalid format');
  }
} catch (e) {
  console.log('❌ Test 3 FAILED:', e.message);
  failed++;
}

// Test 4: prepareMessageForSigning equals hashChallenge
try {
  const testChallenge = 'test-challenge-12345';
  const prepared = prepareMessageForSigning(testChallenge);
  const hash = hashChallenge(testChallenge);

  if (bytesToHex(prepared) === bytesToHex(hash)) {
    console.log('✅ Test 4: prepareMessageForSigning returns same as hashChallenge');
    passed++;
  } else {
    throw new Error('Mismatch');
  }
} catch (e) {
  console.log('❌ Test 4 FAILED:', e.message);
  failed++;
}

// Test 5: verifyHash validation
try {
  const testChallenge = 'test-challenge-12345';
  const hash = hashChallengeHex(testChallenge);

  if (verifyHash(testChallenge, hash) && !verifyHash('wrong-challenge', hash)) {
    console.log('✅ Test 5: verifyHash correctly validates hashes');
    passed++;
  } else {
    throw new Error('Verification logic error');
  }
} catch (e) {
  console.log('❌ Test 5 FAILED:', e.message);
  failed++;
}

// Test 6: hex string must have even length
try {
  let errorThrown = false;
  try {
    hexToBytes('abc');
  } catch (e) {
    if (e.message.includes('even length')) {
      errorThrown = true;
    }
  }

  if (errorThrown) {
    console.log('✅ Test 6: hexToBytes throws error for odd-length hex');
    passed++;
  } else {
    throw new Error('Error not thrown');
  }
} catch (e) {
  console.log('❌ Test 6 FAILED:', e.message);
  failed++;
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  console.log('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  console.log('\n🎉 Shared crypto utilities are working correctly!\n');
  process.exit(0);
}
