# Security Linting Guide

## Overview
This project uses ESLint with security-focused plugins to automatically detect common security vulnerabilities and enforce best practices.

## Automated Security Checks

### 1. ESLint Security Plugin
We use `eslint-plugin-security` to detect common security anti-patterns:

- **Detect unsafe regex**: Prevents ReDoS (Regular Expression Denial of Service) attacks
- **Detect object injection**: Warns about potentially unsafe `obj[userInput]` patterns
- **Detect non-literal require**: Prevents dynamic require() calls that could load malicious code
- **Detect timing attacks**: Warns about string comparisons that could leak timing information
- **Detect eval usage**: Blocks dangerous `eval()` and `new Function()` patterns

### 2. Custom Sanitization Rules
We've implemented patterns to encourage input sanitization before database operations.

**Best Practice**: Always sanitize user input before `.insert()` or `.update()` calls:

```typescript
// ✅ GOOD - Sanitized before insert
const sanitizedPost = {
  content: stripHtml(userInput),
  title: stripHtml(title),
  source_link: sanitizeUrl(url),
};
await supabase.from('posts').insert(sanitizedPost);

// ❌ BAD - Raw user input inserted directly
await supabase.from('posts').insert({ content: userInput });
```

### 3. TypeScript Security Rules
- No explicit `any` types (warns to encourage type safety)
- Unused variables detection (prevents dead code accumulation)
- Strict null checks (via tsconfig.json)

## Running Security Lints

```bash
# Run all linters
npm run lint

# Auto-fix safe issues
npm run lint:fix

# Focus on security rules only
npm run lint:security
```

## Security Checklist for New Code

When adding user-generated content features:

1. ✅ Import sanitization functions from `src/lib/inputSanitization.ts`
2. ✅ Sanitize ALL text fields with `stripHtml()` or `sanitizeText()`
3. ✅ Sanitize ALL URLs with `sanitizeUrl()`
4. ✅ Apply sanitization at BOTH component and hook levels (defense in depth)
5. ✅ Run `npm run lint` to check for security warnings
6. ✅ Run `npm test` to verify sanitization with regression tests

## Available Sanitization Functions

### Text Sanitization
- `stripHtml(input)` - Removes ALL HTML tags (use for titles, names, usernames)
- `sanitizeText(input)` - Removes dangerous HTML/JS patterns but preserves some formatting
- `sanitizeContent(input)` - Alias for sanitizeText, use for post/comment content

### URL Sanitization
- `sanitizeUrl(url)` - Validates URL and blocks dangerous protocols (javascript:, data:, file:)
- Returns `null` if URL is invalid or dangerous

### Object Sanitization
- `sanitizeProfile(profile)` - Sanitizes username and bio for user profiles
- `sanitizeProposal(proposal)` - Sanitizes proposals, debates, demands
- `sanitizeObject(obj, options)` - Auto-detects and sanitizes all string fields

## Security Plugin Configuration

Located in `.eslintrc.js`:

```javascript
extends: [
  'plugin:security/recommended-legacy',
],
plugins: ['security'],
rules: {
  'security/detect-unsafe-regex': 'error',
  'security/detect-object-injection': 'warn',
  'no-eval': 'error',
  'no-script-url': 'error',
}
```

## Integration with CI/CD

To enforce security in your deployment pipeline, add to your CI config:

```yaml
# Example GitHub Actions / Replit Deployments
- name: Security Lint
  run: npm run lint:security
  
- name: Security Tests
  run: npm test
```

## Custom Rule: enforce-sanitization.js

We've created a custom ESLint rule (located in `eslint-rules/enforce-sanitization.js`) that can be integrated to detect unsanitized `.insert()` calls.

**Note**: This is a standalone rule file for future integration. To fully enable it, you would need to:
1. Create an ESLint plugin wrapper
2. Register the rule in ESLint config
3. Add to your extends/plugins array

For now, we rely on:
- Manual code review
- Regression tests (31 tests in `src/__tests__/inputSanitization.test.ts`)
- Security plugin warnings
- TODO comments in Labor Power placeholder screens

## References

- [ESLint Security Plugin](https://github.com/eslint-community/eslint-plugin-security)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- Input Sanitization Service: `src/lib/inputSanitization.ts`
- Regression Tests: `src/__tests__/inputSanitization.test.ts`
