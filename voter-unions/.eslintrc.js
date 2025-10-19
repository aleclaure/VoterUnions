module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'security'],
  rules: {
    // Security: Ban direct Supabase imports outside adapter (Guardrail 5)
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['**/services/supabase', '../services/supabase', '../../services/supabase'],
        message: '🔒 SECURITY: Import from @/services/data/adapter instead. Direct Supabase calls are banned outside src/services/data/supabase-data.ts'
      }]
    }],
    
    // TypeScript strict rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
  },
  overrides: [
    {
      // Allow direct Supabase imports ONLY in these files
      files: ['src/services/supabase.ts', 'src/services/data/supabase-data.ts'],
      rules: {
        'no-restricted-imports': 'off'
      }
    }
  ]
};
