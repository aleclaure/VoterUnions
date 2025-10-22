/**
 * Crypto Compatibility Test
 *
 * Tests whether elliptic and @noble/curves produce compatible signatures
 * Run this to diagnose the hashing issue
 */

import { ec as EC } from 'elliptic';
import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';

const ec = new EC('p256');

/**
 * Test if elliptic hashes internally or expects pre-hashed input
 */
export function testEllipticHashingBehavior() {
  console.log('=== ELLIPTIC HASHING BEHAVIOR TEST ===\n');

  // Generate a test keypair
  const keyPair = ec.genKeyPair();
  const privateKeyHex = keyPair.getPrivate('hex');
  const publicKeyHex = keyPair.getPublic('hex');

  const testChallenge = 'test-challenge-12345';

  console.log('Test Challenge:', testChallenge);
  console.log('Private Key:', privateKeyHex.substring(0, 16) + '...');
  console.log('Public Key:', publicKeyHex.substring(0, 32) + '...\n');

  // Test 1: Sign the raw string
  console.log('TEST 1: Sign raw challenge string');
  const sig1 = keyPair.sign(testChallenge);
  const sig1Hex = sig1.toDER('hex');
  console.log('Signature (DER):', sig1Hex);
  console.log('Verify with raw string:', keyPair.verify(testChallenge, sig1));

  // Test 2: Manually hash then sign
  console.log('\nTEST 2: Manually hash, then sign');
  const messageHash = sha256(new TextEncoder().encode(testChallenge));
  const sig2 = keyPair.sign(messageHash);
  const sig2Hex = sig2.toDER('hex');
  console.log('Message Hash:', Buffer.from(messageHash).toString('hex'));
  console.log('Signature (DER):', sig2Hex);
  console.log('Verify with hash:', keyPair.verify(messageHash, sig2));

  // Test 3: Compare signatures
  console.log('\nTEST 3: Signature comparison');
  console.log('sig1 === sig2?', sig1Hex === sig2Hex);
  console.log('Interpretation:', sig1Hex === sig2Hex
    ? '✅ Elliptic DOES hash internally (compatible!)'
    : '❌ Elliptic DOES NOT hash internally (incompatible!)');

  // Test 4: Cross-verify
  console.log('\nTEST 4: Cross-verification');
  console.log('Verify sig1 (raw) with hash:', keyPair.verify(messageHash, sig1));
  console.log('Verify sig2 (hash) with raw:', keyPair.verify(testChallenge, sig2));

  return {
    signaturesMatch: sig1Hex === sig2Hex,
    sig1: sig1Hex,
    sig2: sig2Hex,
    messageHash: Buffer.from(messageHash).toString('hex'),
  };
}

/**
 * Test @noble/curves signing behavior
 */
export function testNobleHashingBehavior() {
  console.log('\n=== @NOBLE/CURVES HASHING BEHAVIOR TEST ===\n');

  // Generate keypair
  const privateKeyBytes = p256.utils.randomPrivateKey();
  const publicKeyBytes = p256.getPublicKey(privateKeyBytes);
  const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');

  const testChallenge = 'test-challenge-12345';

  console.log('Test Challenge:', testChallenge);
  console.log('Private Key:', privateKeyHex.substring(0, 16) + '...\n');

  // Test 1: Sign with pre-hash (recommended way)
  console.log('TEST 1: Sign with manual SHA-256 hash');
  const messageHash = sha256(new TextEncoder().encode(testChallenge));
  const sig1 = p256.sign(messageHash, privateKeyBytes);
  console.log('Message Hash:', Buffer.from(messageHash).toString('hex'));
  console.log('Signature (compact):', Buffer.from(sig1.toCompactRawBytes()).toString('hex'));
  console.log('Verify:', p256.verify(sig1, messageHash, publicKeyBytes));

  // Test 2: Try signing raw string (will this work?)
  console.log('\nTEST 2: Sign raw string bytes');
  try {
    const rawBytes = new TextEncoder().encode(testChallenge);
    const sig2 = p256.sign(rawBytes, privateKeyBytes);
    console.log('Signature (compact):', Buffer.from(sig2.toCompactRawBytes()).toString('hex'));
    console.log('Verify:', p256.verify(sig2, rawBytes, publicKeyBytes));
  } catch (err) {
    console.log('Error:', (err as Error).message);
  }

  return {
    messageHash: Buffer.from(messageHash).toString('hex'),
    signature: Buffer.from(sig1.toCompactRawBytes()).toString('hex'),
  };
}

/**
 * Test cross-library compatibility
 */
export function testCrossLibraryCompatibility() {
  console.log('\n=== CROSS-LIBRARY COMPATIBILITY TEST ===\n');

  // Use same private key for both libraries
  const privateKeyHex = 'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3';
  const testChallenge = 'test-challenge-12345';

  console.log('Using shared private key:', privateKeyHex.substring(0, 16) + '...');
  console.log('Challenge:', testChallenge);

  // Sign with elliptic
  console.log('\nSIGN WITH ELLIPTIC:');
  const ecKeyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
  const ecPublicKeyHex = ecKeyPair.getPublic('hex');

  const ecSig1 = ecKeyPair.sign(testChallenge);
  const ecSig1Hex = ecSig1.toDER('hex');
  console.log('Signature (DER, raw string):', ecSig1Hex);

  const messageHash = sha256(new TextEncoder().encode(testChallenge));
  const ecSig2 = ecKeyPair.sign(messageHash);
  const ecSig2Hex = ecSig2.toDER('hex');
  console.log('Signature (DER, hashed):', ecSig2Hex);

  // Sign with @noble/curves
  console.log('\nSIGN WITH @NOBLE/CURVES:');
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  const publicKeyBytes = p256.getPublicKey(privateKeyBytes);
  const noblePublicKeyHex = Buffer.from(publicKeyBytes).toString('hex');

  const nobleSig = p256.sign(messageHash, privateKeyBytes);
  const nobleSigHex = Buffer.from(nobleSig.toCompactRawBytes()).toString('hex');
  console.log('Signature (compact, hashed):', nobleSigHex);

  // Compare public keys
  console.log('\nPUBLIC KEY COMPARISON:');
  console.log('Elliptic public key:', ecPublicKeyHex);
  console.log('Noble public key:   ', noblePublicKeyHex);
  console.log('Public keys match:', ecPublicKeyHex === noblePublicKeyHex);

  // Try to verify noble signature with elliptic
  console.log('\nCROSS-VERIFICATION:');
  console.log('(Note: This requires DER conversion, testing concept only)');

  return {
    ellipticSignatureRaw: ecSig1Hex,
    ellipticSignatureHashed: ecSig2Hex,
    nobleSignature: nobleSigHex,
    publicKeysMatch: ecPublicKeyHex === noblePublicKeyHex,
    signaturesMatch: ecSig1Hex === ecSig2Hex,
  };
}

/**
 * Run all tests
 */
export function runAllCompatibilityTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   CRYPTO COMPATIBILITY DIAGNOSTIC TESTS               ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const test1Results = testEllipticHashingBehavior();
  const test2Results = testNobleHashingBehavior();
  const test3Results = testCrossLibraryCompatibility();

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   TEST RESULTS SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  console.log('1. Elliptic hashing behavior:');
  console.log('   Signatures match:', test1Results.signaturesMatch ? '✅ YES' : '❌ NO');
  console.log('   Conclusion:', test1Results.signaturesMatch
    ? '   Elliptic hashes internally - compatible with backend'
    : '   Elliptic does NOT hash - INCOMPATIBLE with backend');

  console.log('\n2. Cross-library compatibility:');
  console.log('   Public keys match:', test3Results.publicKeysMatch ? '✅ YES' : '❌ NO');
  console.log('   Elliptic behavior:', test3Results.signaturesMatch
    ? '   Hashes internally'
    : '   Does NOT hash internally');

  console.log('\n3. Action required:');
  if (!test1Results.signaturesMatch) {
    console.log('   ⚠️  MANUAL HASHING REQUIRED in deviceAuth.ts');
    console.log('   Need to hash challenge before signing');
  } else {
    console.log('   ✅ No changes needed - libraries are compatible');
  }

  return {
    elliptic: test1Results,
    noble: test2Results,
    crossLibrary: test3Results,
    compatible: test1Results.signaturesMatch,
  };
}

// Export for use in tests
export default {
  testEllipticHashingBehavior,
  testNobleHashingBehavior,
  testCrossLibraryCompatibility,
  runAllCompatibilityTests,
};
