# Day 1 Testing Guide

## Quick Start: Test in 2 Minutes

### What You'll Test
- ✅ Secure random number generation (hardware RNG)
- ✅ ECDSA P-256 keypair generation
- ✅ Digital signatures (RFC 6979)
- ✅ Signature verification
- ✅ Secure storage (iOS Keychain / Android Keystore)

---

## Option 1: Test on Physical Device (Recommended)

### iOS (iPhone/iPad)

1. **Open Camera app** on your iPhone
2. **Point at the QR code** in the Replit console
3. **Tap the notification** that appears
4. **Expo Go will open** (install if prompted)
5. **App loads** → DeviceAuthTest screen appears
6. **Tap "Run Crypto Tests"** button
7. **See results** in ~1 second

**Expected Output:**
```
✅ ALL TESTS PASSED

Details:
Platform: ios
✅ Platform supported
✅ RNG working (generated different keys)
  Key 1: a3f8c92e4b1d6f7a...
  Key 2: 7e2d9f4a8c3b5e1f...
✅ Sign/verify working
  Challenge: test-challenge-1729382400000
  Signature: 3045022100ab3f8c9...
✅ Signatures are deterministic (RFC 6979)
✅ Secure storage working
✅ All tests passed!
```

### Android

1. **Open Expo Go** app (install from Play Store if needed)
2. **Tap "Scan QR Code"**
3. **Scan the QR code** in the Replit console
4. **App loads** → DeviceAuthTest screen appears
5. **Tap "Run Crypto Tests"** button
6. **See results** in ~1 second

---

## Option 2: Test on Web (Shows Instructions Only)

1. **Open the webview** in Replit
2. **You'll see a warning**:
   ```
   ⚠️ Web Platform Detected
   
   Device Token Authentication is not supported on web for security reasons.
   
   To test this feature, please:
   1. Install Expo Go on your iOS/Android device
   2. Scan the QR code shown in the Replit console
   3. Run the crypto tests on your device
   ```

**Why web is disabled:**
- No hardware-backed secure storage
- Less reliable device identifiers
- Different security model

---

## What Each Test Verifies

### Test 1: Platform Support
**Checks:** Is this iOS/Android (not web)?  
**Why:** Device auth requires hardware security features

### Test 2: RNG (Random Number Generator)
**Checks:** Generates two different private keys  
**Why:** Verifies secure randomness is working
- iOS: Uses SecRandomCopyBytes (hardware RNG)
- Android: Uses SecureRandom (hardware RNG)

**If this fails:** Polyfill not loaded correctly

### Test 3: Sign/Verify
**Checks:** Can sign a challenge and verify the signature  
**Why:** Core cryptographic operation for authentication
- Signs: `test-challenge-<timestamp>`
- Verifies: Signature matches public key

**If this fails:** @noble/curves not working

### Test 4: Deterministic Signatures
**Checks:** Same input produces same output  
**Why:** RFC 6979 compliance (no random nonce)
- Safer (no bad RNG risk)
- Reproducible (debugging easier)

**If this fails:** Wrong signing algorithm

### Test 5: Secure Storage
**Checks:** Can store and retrieve keypair  
**Why:** Private keys must persist across app restarts
- iOS: Keychain (survives app reinstall)
- Android: Keystore (survives app reinstall)

**If this fails:** expo-secure-store not working

---

## Troubleshooting

### "Platform not supported" error
- **Cause:** Running on web
- **Fix:** Test on iOS/Android device with Expo Go

### "RNG appears broken" error
- **Cause:** Polyfill not imported first
- **Fix:** Check App.tsx has `import './src/setup/crypto-polyfill'` as FIRST line

### Blank screen on device
- **Cause:** JavaScript error
- **Fix:** Check Expo Metro Bundler logs for errors

### "Key storage/retrieval failed" error
- **Cause:** expo-secure-store not installed
- **Fix:** Run `npm install expo-secure-store`

---

## Success Criteria

✅ **Day 1 is complete when:**
1. Tests run without errors on a physical device
2. All 5 tests show green checkmarks
3. "✅ ALL TESTS PASSED" appears
4. Different keys generated each run (RNG working)

---

## Next: Day 2

Once Day 1 tests pass, we'll integrate this crypto into the authentication flow:
- Update `useAuth` hook
- Add `registerWithDevice()` method
- Add `loginWithDevice()` method
- Test full registration flow

---

## QR Code Location

Look for this in the Replit console (Expo Server workflow):

```
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▄▄▄ ▀▄▀█▄█ ▄▄▄▄▄ █
█ █   █ ██▄▀ █ ▀█▄█ █   █ █
█ █▄▄▄█ ██▀▄ ▄▀▀█▀█ █▄▄▄█ █
...

› Metro waiting on exp://172.31.78.226:5000
› Scan the QR code above with Expo Go
```
