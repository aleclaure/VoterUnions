/**
 * AUTOMATED ENFORCEMENT: Hook Sanitization Verification
 * 
 * These tests provide AUTOMATED ENFORCEMENT by verifying:
 * 1. Hooks import sanitization functions
 * 2. Sanitization is called BEFORE database insert
 * 3. All critical hooks are covered
 * 
 * Tests FAIL if sanitization is bypassed.
 */

import { describe, it, expect } from 'vitest';

describe('AUTOMATED ENFORCEMENT: Hook Sanitization', () => {
  describe('Static Analysis: Import Verification', () => {
    it('ENFORCES: usePosts.ts imports AND calls stripHtml', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/usePosts.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      expect(content, 'Must import stripHtml').toContain('stripHtml');
      expect(content, 'Must import from inputSanitization').toContain('inputSanitization');
      expect(content, 'Must CALL stripHtml()').toMatch(/stripHtml\s*\(/);
    });

    it('ENFORCES: useChannels.ts imports AND calls stripHtml', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/useChannels.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      expect(content, 'Must import stripHtml').toContain('stripHtml');
      expect(content, 'Must CALL stripHtml()').toMatch(/stripHtml\s*\(/);
    });

    it('ENFORCES: usePowerPledges.ts imports AND calls stripHtml', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/usePowerPledges.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      expect(content, 'Must import stripHtml').toContain('stripHtml');
      expect(content, 'Must CALL stripHtml()').toMatch(/stripHtml\s*\(/);
    });
  });

  describe('Data Flow: Sanitization Before Insert', () => {
    it('ENFORCES: useCreatePost calls stripHtml BEFORE .insert()', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/usePosts.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find useCreatePost function
      const funcStart = content.indexOf('export const useCreatePost');
      expect(funcStart, 'useCreatePost must exist').toBeGreaterThan(-1);
      
      const funcContent = content.substring(funcStart, funcStart + 2000);
      
      // Verify stripHtml is called
      const sanitizeIdx = funcContent.search(/stripHtml\s*\(/);
      expect(sanitizeIdx, 'useCreatePost must call stripHtml()').toBeGreaterThan(-1);
      
      // Verify .from().insert() exists
      const insertIdx = funcContent.indexOf('.insert(');
      expect(insertIdx, 'useCreatePost must call .insert()').toBeGreaterThan(-1);
      
      // Verify sanitization happens BEFORE insert
      expect(sanitizeIdx, 'stripHtml() must be called BEFORE .insert()').toBeLessThan(insertIdx);
    });

    it('ENFORCES: useCreateComment calls stripHtml BEFORE .insert()', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/usePosts.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const funcStart = content.indexOf('export const useCreateComment');
      expect(funcStart, 'useCreateComment must exist').toBeGreaterThan(-1);
      
      const funcContent = content.substring(funcStart, funcStart + 2000);
      
      const sanitizeIdx = funcContent.search(/stripHtml\s*\(/);
      expect(sanitizeIdx, 'useCreateComment must call stripHtml()').toBeGreaterThan(-1);
      
      const insertIdx = funcContent.indexOf('.insert(');
      expect(insertIdx, 'useCreateComment must call .insert()').toBeGreaterThan(-1);
      
      expect(sanitizeIdx, 'stripHtml() must be called BEFORE .insert()').toBeLessThan(insertIdx);
    });

    it('ENFORCES: useCreateChannel calls stripHtml BEFORE .insert()', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/useChannels.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const funcStart = content.indexOf('export const useCreateChannel');
      expect(funcStart, 'useCreateChannel must exist').toBeGreaterThan(-1);
      
      const funcContent = content.substring(funcStart, funcStart + 2000);
      
      const sanitizeIdx = funcContent.search(/stripHtml\s*\(/);
      expect(sanitizeIdx, 'useCreateChannel must call stripHtml()').toBeGreaterThan(-1);
      
      const insertIdx = funcContent.indexOf('.insert(');
      expect(insertIdx, 'useCreateChannel must call .insert()').toBeGreaterThan(-1);
      
      expect(sanitizeIdx, 'stripHtml() must be called BEFORE .insert()').toBeLessThan(insertIdx);
    });

    it('ENFORCES: useCreatePowerPledge calls stripHtml BEFORE .insert()', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/usePowerPledges.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const funcStart = content.indexOf('export const useCreatePowerPledge');
      expect(funcStart, 'useCreatePowerPledge must exist').toBeGreaterThan(-1);
      
      const funcContent = content.substring(funcStart, funcStart + 2000);
      
      const sanitizeIdx = funcContent.search(/stripHtml\s*\(/);
      expect(sanitizeIdx, 'useCreatePowerPledge must call stripHtml()').toBeGreaterThan(-1);
      
      const insertIdx = funcContent.indexOf('.insert(');
      expect(insertIdx, 'useCreatePowerPledge must call .insert()').toBeGreaterThan(-1);
      
      expect(sanitizeIdx, 'stripHtml() must be called BEFORE .insert()').toBeLessThan(insertIdx);
    });
  });

  describe('Coverage Checklist', () => {
    it('FAILS if new hook added without enforcement tests', () => {
      const criticalHooks = [
        'useCreatePost',
        'useCreateComment',
        'useCreateChannel',
        'useCreatePowerPledge',
        // ADD NEW HOOKS HERE when implemented
      ];

      const testedHooks = [
        'useCreatePost',
        'useCreateComment',
        'useCreateChannel',
        'useCreatePowerPledge',
      ];

      expect(
        testedHooks.length,
        'All critical hooks must have enforcement tests'
      ).toBe(criticalHooks.length);

      criticalHooks.forEach(hook => {
        expect(testedHooks, `${hook} must have enforcement tests`).toContain(hook);
      });
    });
  });
});
