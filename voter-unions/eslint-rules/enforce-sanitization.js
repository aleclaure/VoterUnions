/**
 * Custom ESLint Rule: Enforce Input Sanitization Before Database Inserts
 * 
 * This rule detects when user data is inserted into the database without
 * proper sanitization, helping prevent XSS and injection attacks.
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce input sanitization before database inserts',
      category: 'Security',
      recommended: true,
    },
    messages: {
      unsanitizedInsert: 'User input must be sanitized before database insert. Use stripHtml(), sanitizeUrl(), or sanitizeText() from inputSanitization.ts',
      missingSanitizationImport: 'Import sanitization functions from ../lib/inputSanitization before using .insert()',
    },
    schema: [], // no options
  },

  create(context) {
    let hasSanitizationImport = false;
    const sanitizationFunctions = new Set([
      'stripHtml',
      'sanitizeUrl',
      'sanitizeText',
      'sanitizeContent',
      'sanitizeProfile',
      'sanitizeUnion',
      'sanitizeProposal',
      'sanitizeObject',
    ]);
    
    // Helper function to check if a node uses sanitization
    const usesSanitization = (node) => {
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
        return sanitizationFunctions.has(node.callee.name);
      }
      
      // Check nested calls
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
        return usesSanitization(node.callee.object);
      }
      
      // Check object spread/destructuring
      if (node.type === 'ObjectExpression') {
        return node.properties.some(prop => 
          prop.value && usesSanitization(prop.value)
        );
      }
      
      return false;
    };
    
    // Helper function to check if object has string properties
    const hasStringProperties = (objectNode) => {
      return objectNode.properties.some(prop => 
        prop.value && prop.value.type === 'Literal' && typeof prop.value.value === 'string'
      );
    };

    return {
      // Track imports from inputSanitization.ts
      ImportDeclaration(node) {
        if (node.source.value.includes('inputSanitization')) {
          hasSanitizationImport = true;
        }
      },

      // Check .insert() method calls
      CallExpression(node) {
        // Check if this is a .insert() call
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'insert'
        ) {
          // Get the argument being inserted
          const insertArg = node.arguments[0];
          
          if (!insertArg) return; // No argument to insert
          
          // Check if the argument is a variable/identifier
          if (insertArg.type === 'Identifier') {
            // Look for sanitization in the variable's declaration
            const variable = context.getScope().set.get(insertArg.name);
            
            if (variable && variable.defs.length > 0) {
              const def = variable.defs[0];
              const init = def.node.init;
              
              // Check if the initialization uses a sanitization function
              if (init && !usesSanitization(init)) {
                context.report({
                  node,
                  messageId: 'unsanitizedInsert',
                });
              }
            }
          }
          // Check if the argument is an object literal
          else if (insertArg.type === 'ObjectExpression') {
            // Look for sanitization function calls within the object
            let hasSanitization = false;
            
            for (const prop of insertArg.properties) {
              if (prop.value && usesSanitization(prop.value)) {
                hasSanitization = true;
                break;
              }
            }
            
            // Only warn if no sanitization is found AND there are string literals
            if (!hasSanitization && hasStringProperties(insertArg)) {
              // Check if sanitization import exists
              if (!hasSanitizationImport) {
                context.report({
                  node,
                  messageId: 'missingSanitizationImport',
                });
              }
            }
          }
        }
      },
    };
  },
};
