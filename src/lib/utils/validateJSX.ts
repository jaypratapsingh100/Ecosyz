// JSX Validation Utility
// Helps catch common syntax errors before preview generation

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'syntax' | 'structure' | 'export' | 'import';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'style' | 'best-practice' | 'compatibility';
  message: string;
  line?: number;
}

export function validateJSXCode(code: string, filename: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check 1: Malformed imports (missing spaces)
  const malformedImports = code.match(/import\*as\w+from|import\*\{[^}]+\}from/g);
  if (malformedImports) {
    errors.push({
      type: 'syntax',
      message: `Malformed import statement found: "${malformedImports[0]}"`,
      suggestion: 'Add spaces: "import * as React from" or "import { Component } from"'
    });
  }

  // Check 2: Orphaned export statements
  const orphanedExports = code.match(/^\s*export\s+default\s+(\w+)\s*;?\s*$/gm);
  if (orphanedExports) {
    orphanedExports.forEach(exp => {
      const componentName = exp.match(/export\s+default\s+(\w+)/)?.[1];
      if (componentName) {
        // Check if component is defined
        const componentDefined = code.match(new RegExp(`(?:function|const|class)\\s+${componentName}\\s*[=(]`));
        if (!componentDefined) {
          errors.push({
            type: 'export',
            message: `Orphaned export: "${exp.trim()}" - component ${componentName} not defined`,
            suggestion: `Define the component before exporting: "function ${componentName}() { ... }"`
          });
        }
      }
    });
  }

  // Check 3: Return statements outside functions
  const lines = code.split('\n');
  let insideFunction = false;
  let braceCount = 0;

  lines.forEach((line, index) => {
    // Track function boundaries
    if (line.match(/(?:function|const|var|let)\s+\w+\s*[=(]/)) {
      insideFunction = true;
    }
    
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    
    if (braceCount === 0 && insideFunction) {
      insideFunction = false;
    }

    // Check for return outside function
    if (line.match(/^\s*return\s*\(/) && !insideFunction) {
      errors.push({
        type: 'structure',
        message: 'Return statement found outside of function',
        line: index + 1,
        suggestion: 'Wrap your JSX in a function component'
      });
    }
  });

  // Check 4: Missing component definition
  const hasComponentDefinition = code.match(/(?:function|const|class)\s+[A-Z][a-zA-Z0-9]*\s*[=(]/);
  if (!hasComponentDefinition && code.includes('return')) {
    warnings.push({
      type: 'best-practice',
      message: 'No component definition found, but code contains return statement',
    });
  }

  // Check 5: Malformed JSX (common patterns)
  if (code.includes('className=') && !code.includes('"') && !code.includes("'")) {
    warnings.push({
      type: 'style',
      message: 'className attribute may be missing quotes',
    });
  }

  // Check 6: Unclosed JSX tags (basic check)
  const openTags = (code.match(/<[A-Z][a-zA-Z0-9]*\s*>/g) || []).length;
  const closeTags = (code.match(/<\/[A-Z][a-zA-Z0-9]*>/g) || []).length;
  const selfClosingTags = (code.match(/<[A-Z][a-zA-Z0-9]*\s*\/>/g) || []).length;
  
  if (openTags !== closeTags + selfClosingTags) {
    warnings.push({
      type: 'style',
      message: `Possible unclosed JSX tags (${openTags} opening, ${closeTags} closing, ${selfClosingTags} self-closing)`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateProjectFiles(files: any[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  files.forEach(file => {
    if (file.path.endsWith('.jsx') || file.path.endsWith('.js') || 
        file.path.endsWith('.tsx') || file.path.endsWith('.ts')) {
      const result = validateJSXCode(file.content, file.path);
      
      // Add file context to errors/warnings
      result.errors.forEach(error => {
        allErrors.push({
          ...error,
          message: `${file.path}: ${error.message}`
        });
      });
      
      result.warnings.forEach(warning => {
        allWarnings.push({
          ...warning,
          message: `${file.path}: ${warning.message}`
        });
      });
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
