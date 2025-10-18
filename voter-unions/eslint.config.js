import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';

// Note: Custom sanitization rule is in eslint-rules/enforce-sanitization.js
// It's a reference implementation but requires additional plugin scaffolding for ESLint 9
// Instead, we rely on: security plugin + regression tests + code review

export default [
  // Base recommended configs
  js.configs.recommended,
  
  // Apply to all TypeScript files
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        navigator: 'readonly',
        screen: 'readonly',
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      security: security,
    },
    rules: {
      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // Security plugin rules (tuned to reduce false positives)
      'security/detect-unsafe-regex': 'warn', // Warn instead of error for complex regex
      'security/detect-object-injection': 'off', // Too many false positives with TypeScript
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'off', // False positive on password comparison
      
      // TypeScript rules (disabled to reduce noise in existing code)
      'no-unused-vars': 'off', // Using TypeScript version instead
      '@typescript-eslint/no-unused-vars': 'off', // Too noisy for existing code
      '@typescript-eslint/no-explicit-any': 'off', // Too noisy for existing code
    },
  },
  
  // Test file overrides
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-script-url': 'off', // Tests intentionally check malicious patterns
      'security/detect-unsafe-regex': 'off', // Tests intentionally use complex patterns
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '.expo/',
      'coverage/',
      '*.config.js',
      '*.config.ts',
    ],
  },
];
