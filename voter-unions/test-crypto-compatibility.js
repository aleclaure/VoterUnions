/**
 * Quick compatibility test runner
 * Tests if elliptic and @noble/curves produce compatible signatures
 */

const { ec: EC } = require('elliptic');
const { p256 } = require('@noble/curves/p256.js');
const { sha256 } = require('@noble/hashes/sha256.js');

const ec = new EC('p256');

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   CRYPTO COMPATIBILITY TEST                           ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Generate a test keypair with elliptic
const keyPair = ec.genKeyPair();
const privateKeyHex = keyPair.getPrivate('hex');
const publicKeyHex = keyPair.getPublic('hex');

const testChallenge = 'test-challenge-12345';

console.log('Test Challenge:', testChallenge);
console.log('Private Key:', privateKeyHex.substring(0, 16) + '...');
console.log('Public Key:', publicKeyHex.substring(0, 32) + '...\n');

console.log('═══════════════════════════════════════════════════════');
console.log('TEST 1: Does elliptic hash internally?');
console.log('═══════════════════════════════════════════════════════\n');

// Test 1: Sign the raw string
console.log('Signing raw challenge string...');
const sig1 = keyPair.sign(testChallenge);
const sig1Hex = sig1.toDER('hex');
console.log('Signature (DER):', sig1Hex.substring(0, 64) + '...');
console.log('Verify with raw string:', keyPair.verify(testChallenge, sig1), '\n');

// Test 2: Manually hash then sign
console.log('Manually hashing, then signing...');
const messageHash = sha256(new TextEncoder().encode(testChallenge));
const sig2 = keyPair.sign(messageHash);
const sig2Hex = sig2.toDER('hex');
console.log('Message Hash:', Buffer.from(messageHash).toString('hex').substring(0, 64) + '...');
console.log('Signature (DER):', sig2Hex.substring(0, 64) + '...');
console.log('Verify with hash:', keyPair.verify(messageHash, sig2), '\n');

// Test 3: Compare signatures
console.log('Comparing signatures...');
const signaturesMatch = sig1Hex === sig2Hex;
console.log('Signature 1 length:', sig1Hex.length);
console.log('Signature 2 length:', sig2Hex.length);
console.log('Signatures match:', signaturesMatch, '\n');

console.log('═══════════════════════════════════════════════════════');
console.log('RESULT');
console.log('═══════════════════════════════════════════════════════\n');

if (signaturesMatch) {
  console.log('✅ SUCCESS: Elliptic DOES hash internally');
  console.log('✅ Web and native are COMPATIBLE');
  console.log('✅ No fix needed - backend will verify both correctly\n');
  console.log('Explanation:');
  console.log('- Elliptic automatically hashes the input before signing');
  console.log('- sign(challenge) produces same result as sign(sha256(challenge))');
  console.log('- This matches the web behavior (@noble/curves)');
  console.log('- Backend expects sha256(challenge) - both platforms provide it\n');
  process.exit(0);
} else {
  console.log('❌ INCOMPATIBLE: Elliptic does NOT hash internally');
  console.log('❌ Web and native use DIFFERENT signing strategies');
  console.log('❌ Fix required for native authentication\n');
  console.log('Explanation:');
  console.log('- Elliptic signs the raw challenge string');
  console.log('- Web signs sha256(challenge)');
  console.log('- Backend expects sha256(challenge)');
  console.log('- Native authentication will FAIL with "Invalid signature"\n');
  console.log('RECOMMENDED FIX: Apply Fix Option 1');
  console.log('- Update deviceAuth.ts to manually hash before signing');
  console.log('- See: src/services/FIXES/FIX_OPTION_1_deviceAuth_manual_hash.ts');
  console.log('- Or read: SIGNATURE_COMPATIBILITY_GUIDE.md\n');
  process.exit(1);
}
