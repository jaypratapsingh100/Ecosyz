/**
 * File parsing utilities for extracting files from AI responses
 */

export interface ParsedFile {
  path: string;
  content: string;
}

export interface FileCreationResult {
  path: string;
  success: boolean;
  error?: string;
  validated?: boolean;
  validationError?: string;
}

/**
 * Parse code blocks from AI response text
 * Handles various formats: ```file:path, ```path, ```language:path
 */
export function parseCodeBlocks(responseText: string): ParsedFile[] {
  const codeBlockRegex = /```(?:file:)?\s*([^\n`]+?)(?:\n|$)([\s\S]*?)```/g;
  const allMatches: ParsedFile[] = [];
  let match;

  while ((match = codeBlockRegex.exec(responseText)) !== null) {
    let filePath = match[1].trim();
    const fileContent = match[2].trim();
    
    // Remove "file:" prefix if present
    if (filePath.startsWith('file:')) {
      filePath = filePath.substring(5).trim();
    }
    
    // Skip if it's not a file path
    const hasExtension = filePath.includes('.');
    const hasPathSeparator = filePath.includes('/') || filePath.includes('\\');
    
    if (!hasExtension && !hasPathSeparator) {
      continue;
    }

    // Normalize path
    let normalizedPath = filePath
      .replace(/\s+/g, '') // Remove ALL spaces
      .replace(/\\/g, '/') // Normalize path separators
      .replace(/\/+/g, '/') // Remove double slashes
      .replace(/\.jxs$/i, '.jsx') // Fix .jxs → .jsx
      .replace(/\.tsxs$/i, '.tsx') // Fix .tsxs → .tsx
      .replace(/^\.\//, '') // Remove leading ./
      .trim();

    // Skip invalid paths
    const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md'];
    const hasValidExtension = validExtensions.some(ext => normalizedPath.toLowerCase().endsWith(ext));
    if (!hasValidExtension && !normalizedPath.includes('/')) {
      continue;
    }

    // Check for duplicates - keep the one with more content
    const existingIndex = allMatches.findIndex(m => m.path === normalizedPath);
    if (existingIndex >= 0) {
      if (fileContent.length > allMatches[existingIndex].content.length) {
        allMatches[existingIndex] = { path: normalizedPath, content: fileContent };
      }
    } else {
      allMatches.push({ path: normalizedPath, content: fileContent });
    }
  }

  return allMatches;
}

/**
 * Normalize file path - remove spaces, fix extensions, clean up
 */
export function normalizeFilePath(filePath: string): string {
  // Remove language prefixes
  filePath = filePath.replace(/^(jsx|javascript|typescript|tsx|js|ts|css|html|json|markdown|python|java|cpp|c):\s*/i, '');
  
  // Remove leading "./" or "../"
  filePath = filePath.replace(/^\.\//, '').replace(/^\.\.\//, '');
  
  // Remove quotes
  filePath = filePath.replace(/^["']|["']$/g, '').trim();
  
  // Remove ALL spaces
  filePath = filePath.replace(/\s+/g, '');
  
  // Normalize extensions
  filePath = filePath.replace(/\.jxs$/i, '.jsx');
  filePath = filePath.replace(/\.tsxs$/i, '.tsx');
  
  // Normalize path separators
  filePath = filePath.replace(/\\/g, '/');
  filePath = filePath.replace(/\/+/g, '/');
  
  return filePath;
}

/**
 * Auto-fix common syntax errors in code
 */
export function autoFixCode(content: string): { content: string; fixesApplied: string[] } {
  let processedContent = content;
  const fixesApplied: string[] = [];
  
  // Fix malformed imports
  const malformedImportPattern = /import\*as(\w+)from(['"])([^'"]+)\2/g;
  if (malformedImportPattern.test(processedContent)) {
    processedContent = processedContent.replace(malformedImportPattern, (match, p1, p2, p3) => {
      fixesApplied.push(`Fixed malformed import: ${match}`);
      return `import ${p1} from ${p2}${p3}${p2}`;
    });
  }
  
  // Fix export default
  if (processedContent.includes('export*default')) {
    processedContent = processedContent.replace(/export\*default/g, 'export default');
    fixesApplied.push('Fixed malformed export default');
  }
  
  // Fix common typos
  if (processedContent.includes('reutrn')) {
    processedContent = processedContent.replace(/reutrn/g, 'return');
    fixesApplied.push('Fixed typo: reutrn → return');
  }
  if (processedContent.includes('improt')) {
    processedContent = processedContent.replace(/improt/g, 'import');
    fixesApplied.push('Fixed typo: improt → import');
  }
  
  // Fix classname → className
  if (processedContent.includes('classname') && !processedContent.includes('className')) {
    processedContent = processedContent.replace(/classname\s*=/gi, 'className=');
    processedContent = processedContent.replace(/classname-/gi, 'className-');
    fixesApplied.push('Fixed: classname → className');
  }
  
  return { content: processedContent, fixesApplied };
}
