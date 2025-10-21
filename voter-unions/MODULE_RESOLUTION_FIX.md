# Module Resolution Fix - @noble/curves & @noble/hashes

**Date:** October 21, 2025  
**Status:** ✅ RESOLVED  
**Blocker Level:** CRITICAL

---

## Problem

The app failed to load in Expo Go with the following error:

```
Unable to resolve module '@noble/curves/p256.js'
```

This was a **critical blocker** preventing any testing of the Device Token Authentication system.

---

## Root Causes

### 1. Missing Package Installation
- `@noble/curves` and `@noble/hashes` were **not installed** in `node_modules/`
- `package.json` did not include these dependencies
- Had to install with `--legacy-peer-deps` due to React Native peer dependency conflicts

### 2. Metro Bundler Configuration
- Metro bundler didn't know how to resolve package.json "exports" fields
- @noble/curves uses modern ES Module exports that Metro needs special configuration to handle
- Fixed by adding `unstable_conditionNames` configuration to prefer `browser` builds

### 3. Incorrect Import Paths
- Original code: `import { p256 } from '@noble/curves/p256'`
- Correct code: `import { p256 } from '@noble/curves/nist.js'`
- Original code: `import { sha256 } from '@noble/hashes/sha256.js'`
- Correct code: `import { sha256 } from '@noble/hashes/sha2.js'`

### 4. Incorrect API Method
- Original: `p256.utils.randomPrivateKey()`
- Correct: `p256.utils.randomSecretKey()`

---

## Fixes Applied

### ✅ Fix #1: Install Missing Packages

```bash
npm install @noble/curves @noble/hashes --legacy-peer-deps
```

**Result:** Installed @noble/curves@2.0.1 and @noble/hashes@2.0.1

---

### ✅ Fix #2: Configure Metro Bundler

Created `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for @noble/curves package.json "exports" field compatibility
// Metro needs to prefer 'browser' builds which are React Native compatible
config.resolver.unstable_conditionNames = ['require', 'browser', 'react-native'];

module.exports = config;
```

**Why this works:**
- Metro's default condition names are `['require', 'react-native']`
- @noble/curves provides `browser` builds that work with React Native
- By adding `browser` to the condition names, Metro can resolve the correct files

---

### ✅ Fix #3: Correct Import Paths

**Before:**
```typescript
import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256.js';
```

**After:**
```typescript
import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';
```

**Why:**
- `p256` is exported from `nist.js`, not a separate `p256.js` file
- `sha256` is exported from `sha2.js` (along with sha384, sha512, etc.)

---

### ✅ Fix #4: Correct API Method Name

**Before:**
```typescript
const privateKey = p256.utils.randomPrivateKey();
```

**After:**
```typescript
const privateKey = p256.utils.randomSecretKey();
```

**Why:**
- @noble/curves v2.x renamed this method for consistency with ECDSA terminology

---

## Verification

### ✅ LSP Diagnostics: Clear
- No TypeScript errors
- All modules resolve correctly

### ✅ Metro Bundler: Running
- Server starts without errors
- Ready to accept connections from Expo Go

### ✅ Package Structure: Verified
```bash
node_modules/@noble/curves/
  ├── nist.js         # Contains p256
  ├── nist.d.ts       # TypeScript definitions
  └── package.json    # Exports configuration

node_modules/@noble/hashes/
  ├── sha2.js         # Contains sha256
  ├── sha2.d.ts       # TypeScript definitions
  └── utils.js        # Contains hexToBytes, bytesToHex
```

---

## Files Modified

1. ✅ `voter-unions/metro.config.js` - Created (Metro configuration)
2. ✅ `voter-unions/package.json` - Updated (added @noble dependencies)
3. ✅ `voter-unions/src/services/deviceAuth.ts` - Fixed (import paths + API method)

---

## Testing Status

### Ready for Testing:
- ✅ Metro bundler configured correctly
- ✅ Packages installed
- ✅ Import paths corrected
- ✅ LSP errors resolved

### Next Steps:
- [ ] Test in Expo Go on physical device (iOS)
- [ ] Test in Expo Go on physical device (Android)
- [ ] Verify Device Token Auth registration flow works
- [ ] Verify Device Token Auth login flow works

---

## Key Learnings

1. **Always verify package installation** before troubleshooting bundler issues
2. **Metro requires configuration** for modern package.json "exports" fields
3. **Check package structure** to find correct import paths (use `ls node_modules/package/`)
4. **@noble libraries use browser builds** for React Native compatibility
5. **Use --legacy-peer-deps** when peer dependency conflicts occur in Expo

---

## References

- Metro Package Exports: https://metrobundler.dev/docs/package-exports/
- @noble/curves Documentation: https://github.com/paulmillr/noble-curves
- @noble/hashes Documentation: https://github.com/paulmillr/noble-hashes
- Expo Metro Customization: https://docs.expo.dev/guides/customizing-metro/
