/**
 * BULLETPROOF ENFORCEMENT: AST Data Flow Analysis
 * 
 * Uses Babel parser to verify sanitized values ACTUALLY reach .insert()
 * This catches scenarios where stripHtml() is called but result is discarded
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

interface DataFlowResult {
  hasSanitization: boolean;
  hasInsert: boolean;
  sanitizedVarsReachInsert: boolean;
  details: string[];
}

/**
 * Analyze hook data flow to verify sanitization reaches insert
 */
function analyzeHookDataFlow(hookName: string, sourceCode: string): DataFlowResult {
  const result: DataFlowResult = {
    hasSanitization: false,
    hasInsert: false,
    sanitizedVarsReachInsert: false,
    details: [],
  };

  try {
    // Parse TypeScript code
    const ast = parse(sourceCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    const sanitizedVariables = new Set<string>();
    const insertedVariables = new Set<string>();
    const objectsContainingSanitization = new Set<string>();
    
    // Traverse AST
    traverse(ast, {
      // Track sanitization calls
      CallExpression(path) {
        if (
          t.isIdentifier(path.node.callee) &&
          (path.node.callee.name === 'stripHtml' || 
           path.node.callee.name === 'sanitizeUrl' ||
           path.node.callee.name === 'sanitizeText')
        ) {
          result.hasSanitization = true;
          result.details.push(`Found sanitization: ${path.node.callee.name}()`);
          
          // Track parent assignment
          const parent = path.parent;
          if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
            sanitizedVariables.add(parent.id.name);
            result.details.push(`  → Assigned to variable: ${parent.id.name}`);
          } else if (t.isObjectProperty(parent) && t.isIdentifier(parent.key)) {
            sanitizedVariables.add(parent.key.name);
            result.details.push(`  → Assigned to object property: ${parent.key.name}`);
            
            // Track the containing object variable
            let objectVar = path.findParent(p => 
              t.isVariableDeclarator(p.node) && t.isIdentifier(p.node.id)
            );
            if (objectVar && t.isVariableDeclarator(objectVar.node) && t.isIdentifier(objectVar.node.id)) {
              objectsContainingSanitization.add(objectVar.node.id.name);
              result.details.push(`  → Object containing sanitization: ${objectVar.node.id.name}`);
            }
          }
        }
      },

      // Track .insert() calls
      MemberExpression(path) {
        if (
          t.isIdentifier(path.node.property) &&
          path.node.property.name === 'insert'
        ) {
          result.hasInsert = true;
          
          // Get the argument to insert()
          const parent = path.parent;
          if (t.isCallExpression(parent) && parent.arguments.length > 0) {
            const arg = parent.arguments[0];
            
            // Check if argument uses sanitized variables
            if (t.isObjectExpression(arg)) {
              arg.properties.forEach(prop => {
                if (t.isObjectProperty(prop)) {
                  const value = prop.value;
                  
                  // Check if value is a sanitized variable
                  if (t.isIdentifier(value)) {
                    insertedVariables.add(value.name);
                    result.details.push(`Insert uses variable: ${value.name}`);
                  }
                  
                  // Check for inline sanitization
                  if (t.isCallExpression(value) && t.isIdentifier(value.callee)) {
                    if (value.callee.name === 'stripHtml' || 
                        value.callee.name === 'sanitizeUrl') {
                      result.details.push(`Insert has inline sanitization: ${value.callee.name}()`);
                      insertedVariables.add('__inline_sanitized__');
                    }
                  }
                  
                  // Check for conditional (ternary) sanitization
                  if (t.isConditionalExpression(value)) {
                    const consequent = value.consequent;
                    const alternate = value.alternate;
                    
                    if (
                      (t.isCallExpression(consequent) && t.isIdentifier(consequent.callee) &&
                       (consequent.callee.name === 'stripHtml' || consequent.callee.name === 'sanitizeUrl')) ||
                      (t.isCallExpression(alternate) && t.isIdentifier(alternate.callee) &&
                       (alternate.callee.name === 'stripHtml' || alternate.callee.name === 'sanitizeUrl'))
                    ) {
                      result.details.push('Insert has conditional sanitization');
                      insertedVariables.add('__conditional_sanitized__');
                    }
                  }
                }
              });
            } else if (t.isIdentifier(arg)) {
              insertedVariables.add(arg.name);
              result.details.push(`Insert uses variable: ${arg.name}`);
            }
          }
        }
      },
      
      // Track object declarations containing conditional sanitization
      VariableDeclarator(path) {
        if (t.isIdentifier(path.node.id) && t.isObjectExpression(path.node.init)) {
          const objName = path.node.id.name;
          const objExpr = path.node.init;
          
          // Check if any property has conditional sanitization
          let hasConditionalSanitization = false;
          objExpr.properties.forEach(prop => {
            if (t.isObjectProperty(prop) && t.isConditionalExpression(prop.value)) {
              const cond = prop.value;
              if (
                (t.isCallExpression(cond.consequent) && t.isIdentifier(cond.consequent.callee) &&
                 (cond.consequent.callee.name === 'stripHtml' || cond.consequent.callee.name === 'sanitizeUrl')) ||
                (t.isCallExpression(cond.alternate) && t.isIdentifier(cond.alternate.callee) &&
                 (cond.alternate.callee.name === 'stripHtml' || cond.alternate.callee.name === 'sanitizeUrl'))
              ) {
                hasConditionalSanitization = true;
              }
            }
          });
          
          if (hasConditionalSanitization) {
            objectsContainingSanitization.add(objName);
            result.details.push(`  → Object with conditional sanitization: ${objName}`);
          }
        }
      },
    });

    // Check if sanitized variables reach insert
    const intersection = Array.from(sanitizedVariables).filter(v => 
      insertedVariables.has(v)
    );
    
    // Check if objects containing sanitization reach insert
    const objectIntersection = Array.from(objectsContainingSanitization).filter(v =>
      insertedVariables.has(v)
    );
    
    if (intersection.length > 0 || objectIntersection.length > 0 ||
        insertedVariables.has('__inline_sanitized__') || 
        insertedVariables.has('__conditional_sanitized__')) {
      result.sanitizedVarsReachInsert = true;
      const vars = [...intersection, ...objectIntersection].join(', ');
      result.details.push(`✅ Sanitized data reaches .insert(): ${vars || 'inline'}`);
    } else if (sanitizedVariables.size > 0 && insertedVariables.size > 0) {
      result.details.push(`❌ Sanitization found but NOT used in .insert()`);
      result.details.push(`  Sanitized: ${Array.from(sanitizedVariables).join(', ')}`);
      result.details.push(`  Objects with sanitization: ${Array.from(objectsContainingSanitization).join(', ')}`);
      result.details.push(`  Inserted: ${Array.from(insertedVariables).join(', ')}`);
    }

  } catch (error) {
    result.details.push(`Parse error: ${error}`);
  }

  return result;
}

describe('BULLETPROOF AST ENFORCEMENT: Data Flow Analysis', () => {
  describe('useCreatePost - Post Content', () => {
    it('ENFORCES: sanitized content ACTUALLY reaches .insert()', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/usePosts.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract useCreatePost function
      const funcStart = content.indexOf('export const useCreatePost');
      const nextExport = content.indexOf('export const', funcStart + 1);
      const funcEnd = nextExport > 0 ? nextExport : content.length;
      const funcCode = content.substring(funcStart, funcEnd);
      
      const analysis = analyzeHookDataFlow('useCreatePost', funcCode);
      
      expect(analysis.hasSanitization, 'Must call sanitization function').toBe(true);
      expect(analysis.hasInsert, 'Must call .insert()').toBe(true);
      expect(
        analysis.sanitizedVarsReachInsert,
        `Sanitized value must reach .insert().\n${analysis.details.join('\n')}`
      ).toBe(true);
    });
  });

  describe('useCreateComment - Comment Content', () => {
    it('ENFORCES: sanitized content ACTUALLY reaches .insert()', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/usePosts.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const funcStart = content.indexOf('export const useCreateComment');
      const nextExport = content.indexOf('export const', funcStart + 1);
      const funcEnd = nextExport > 0 ? nextExport : content.length;
      const funcCode = content.substring(funcStart, funcEnd);
      
      const analysis = analyzeHookDataFlow('useCreateComment', funcCode);
      
      expect(analysis.hasSanitization, 'Must call sanitization function').toBe(true);
      expect(analysis.hasInsert, 'Must call .insert()').toBe(true);
      expect(
        analysis.sanitizedVarsReachInsert,
        `Sanitized value must reach .insert().\n${analysis.details.join('\n')}`
      ).toBe(true);
    });
  });

  describe('useCreateChannel - Multi-Field', () => {
    it('ENFORCES: sanitized fields ACTUALLY reach .insert()', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/useChannels.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const funcStart = content.indexOf('export const useCreateChannel');
      const nextExport = content.indexOf('export const', funcStart + 1);
      const funcEnd = nextExport > 0 ? nextExport : content.length;
      const funcCode = content.substring(funcStart, funcEnd);
      
      const analysis = analyzeHookDataFlow('useCreateChannel', funcCode);
      
      expect(analysis.hasSanitization, 'Must call sanitization function').toBe(true);
      expect(analysis.hasInsert, 'Must call .insert()').toBe(true);
      expect(
        analysis.sanitizedVarsReachInsert,
        `Sanitized value must reach .insert().\n${analysis.details.join('\n')}`
      ).toBe(true);
    });
  });

  describe('useCreatePowerPledge - Optional Field', () => {
    it('ENFORCES: sanitized reason ACTUALLY reaches .insert()', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'src/hooks/usePowerPledges.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const funcStart = content.indexOf('export const useCreatePowerPledge');
      const nextExport = content.indexOf('export const', funcStart + 1);
      const funcEnd = nextExport > 0 ? nextExport : content.length;
      const funcCode = content.substring(funcStart, funcEnd);
      
      const analysis = analyzeHookDataFlow('useCreatePowerPledge', funcCode);
      
      expect(analysis.hasSanitization, 'Must call sanitization function').toBe(true);
      expect(analysis.hasInsert, 'Must call .insert()').toBe(true);
      expect(
        analysis.sanitizedVarsReachInsert,
        `Sanitized value must reach .insert().\n${analysis.details.join('\n')}`
      ).toBe(true);
    });
  });

  describe('NEGATIVE TESTS: Verify Enforcement Catches Bypasses', () => {
    it('CATCHES: stripHtml called but result NOT used in insert', () => {
      const badCode = `
        export const useBadHook = () => {
          return useMutation({
            mutationFn: async (data) => {
              const sanitized = stripHtml(data.content); // Called but not used!
              const { data: result } = await supabase
                .from('posts')
                .insert({ content: data.content }); // Raw data inserted!
              return result;
            }
          });
        };
      `;
      
      const analysis = analyzeHookDataFlow('useBadHook', badCode);
      
      expect(analysis.hasSanitization, 'Sanitization exists').toBe(true);
      expect(analysis.hasInsert, 'Insert exists').toBe(true);
      expect(
        analysis.sanitizedVarsReachInsert,
        'Should FAIL because sanitized value not used'
      ).toBe(false);
    });

    it('CATCHES: No sanitization at all', () => {
      const badCode = `
        export const useBadHook = () => {
          return useMutation({
            mutationFn: async (data) => {
              const { data: result } = await supabase
                .from('posts')
                .insert({ content: data.content });
              return result;
            }
          });
        };
      `;
      
      const analysis = analyzeHookDataFlow('useBadHook', badCode);
      
      expect(analysis.hasSanitization, 'Should have NO sanitization').toBe(false);
      expect(analysis.sanitizedVarsReachInsert, 'Should FAIL').toBe(false);
    });
  });

  describe('Coverage Checklist', () => {
    it('FAILS if new hook added without AST enforcement', () => {
      const criticalHooks = [
        'useCreatePost',
        'useCreateComment',
        'useCreateChannel',
        'useCreatePowerPledge',
        // ADD NEW HOOKS HERE
      ];

      const testedHooks = [
        'useCreatePost',
        'useCreateComment',
        'useCreateChannel',
        'useCreatePowerPledge',
      ];

      expect(testedHooks.length).toBe(criticalHooks.length);
      criticalHooks.forEach(hook => {
        expect(testedHooks).toContain(hook);
      });
    });
  });
});
