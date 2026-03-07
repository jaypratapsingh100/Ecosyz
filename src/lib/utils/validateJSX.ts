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
  type: 'style' | 'best-practice' | 'compatibility' | 'structure';
  message: string;
  line?: number;
  suggestion?: string;
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
        // Check if component is defined (function, const/let/var, class, or inline export default function)
        const componentDefined =
          code.match(new RegExp(`(?:function|const|let|var|class)\\s+${componentName}\\b`)) ||
          code.match(new RegExp(`export\\s+default\\s+function\\s+${componentName}\\b`));
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
  // Track brace depth — any return at depth > 0 is inside a function/arrow/class
  const lines = code.split('\n');
  let braceDepth = 0;
  // Pre-check: does the file have ANY function/arrow/class definition?
  const hasAnyFunctionLike = /(?:function\s|=>\s*\{|=>\s*\(|class\s)/.test(code);

  lines.forEach((line, index) => {
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    // Only flag return at brace depth 0 (truly top-level) AND file has functions
    if (line.match(/^\s*return\s*[\(;]/) && braceDepth <= 0 && hasAnyFunctionLike) {
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

  // Check 6: Removed — regex-based detection of "JSX inside strings" produced too many
  // false positives on valid JSX code (e.g. className='text-lg' near <Header />).
  // Babel/esbuild handles real syntax errors at compile time.

  // Check 7: Unclosed JSX tags (basic check)
  const openTags = (code.match(/<[A-Z][a-zA-Z0-9]*\s*>/g) || []).length;
  const closeTags = (code.match(/<\/[A-Z][a-zA-Z0-9]*>/g) || []).length;
  const selfClosingTags = (code.match(/<[A-Z][a-zA-Z0-9]*\s*\/>/g) || []).length;
  
  if (openTags !== closeTags + selfClosingTags) {
    warnings.push({
      type: 'style',
      message: `Possible unclosed JSX tags (${openTags} opening, ${closeTags} closing, ${selfClosingTags} self-closing)`,
    });
  }

  // Check 8: Component returns renderable content (JSX)
  const hasReturnWithJSX =
    /return\s*\(\s*</.test(code) ||
    /return\s+</.test(code) ||
    /return\s+React\.createElement\s*\(/.test(code) ||
    /return\s+[\w.]+\s*;?\s*\/\*.*\*\/\s*$/.test(code);
  const hasComponent = /(?:function|const|class)\s+[A-Z][a-zA-Z0-9]*\s*[=(]/.test(code);
  if (hasComponent && code.includes('return') && !hasReturnWithJSX && (code.includes('<') || code.includes('createElement'))) {
    warnings.push({
      type: 'structure',
      message: 'Component may not return JSX (expected return (<...>) or return React.createElement(...))',
      suggestion: 'Ensure your component returns a single JSX element or fragment: return (<div>...</div>);',
    });
  }
  if (hasComponent && !code.includes('return') && (code.includes('<') || code.includes('createElement'))) {
    warnings.push({
      type: 'structure',
      message: 'Component has no return statement; nothing will render',
      suggestion: 'Add return (<div>...</div>) or return null;',
    });
  }

  // Check 9: Styling present (so preview renders something visible)
  const hasClassName = /\bclassName\s*=\s*[\{'"`]/.test(code) || /\.css['"]\s*\)?\s*;?\s*$/.test(code);
  const hasStyleAttr = /\bstyle\s*=\s*\{\s*\{/.test(code) || /\bstyle\s*=\s*\{[^}]*\}/.test(code);
  const hasCssImport = /import\s+['"].*\.css['"]/.test(code);
  const hasStyling = hasClassName || hasStyleAttr || hasCssImport;
  if (hasComponent && (filename.includes('App.') || filename.includes('app.')) && !hasStyling) {
    warnings.push({
      type: 'style',
      message: 'App component has no styling (no className, style, or CSS import); preview may look plain',
      suggestion: 'Add className="..." or style={{ }} or import "./index.css" so the app renders with visible styling.',
    });
  }
  if (hasComponent && !filename.includes('App.') && !hasStyling && (code.includes('<div') || code.includes('<section'))) {
    warnings.push({
      type: 'style',
      message: 'Component has no className or style; consider adding classes or inline styles for visible rendering',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Check if file content looks like a valid React component that would render with styling (for agent feedback) */
export function checkComponentStructureAndStyling(
  files: Array<{ path: string; content: string }>
): { componentsValid: boolean; hasStyling: boolean; issues: string[] } {
  const issues: string[] = [];
  let hasAppWithJSX = false;
  let hasAppWithStyling = false;
  let hasAnyStyling = false;

  for (const file of files) {
    if (!file.path.endsWith('.jsx') && !file.path.endsWith('.tsx') && !file.path.endsWith('.js')) continue;
    const code = file.content || '';
    const isApp = file.path.includes('App.');
    const hasComponent = /(?:function|const|class)\s+[A-Z][a-zA-Z0-9]*\s*[=(]/.test(code);
    const hasReturnJSX = /return\s*\(\s*</.test(code) || /return\s+</.test(code) || /return\s+React\.createElement\s*\(/.test(code);
    const hasStyling = /\bclassName\s*=/.test(code) || /\bstyle\s*=\s*\{/.test(code) || /import\s+['"].*\.css['"]/.test(code);

    if (isApp && hasComponent) {
      hasAppWithJSX = hasReturnJSX;
      if (hasStyling) hasAppWithStyling = true;
    }
    if (hasStyling) hasAnyStyling = true;

    if (hasComponent && !hasReturnJSX && code.includes('return')) {
      issues.push(`${file.path}: component may not return JSX`);
    }
    if (isApp && hasComponent && !hasStyling) {
      issues.push(`${file.path}: App has no className/style/CSS import`);
    }
  }

  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  if (cssFiles.length > 0) {
    const nonEmpty = cssFiles.some(f => (f.content || '').trim().length > 0);
    if (nonEmpty) hasAnyStyling = true;
  }

  return {
    componentsValid: hasAppWithJSX,
    hasStyling: hasAppWithStyling || hasAnyStyling,
    issues,
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
