/**
 * FCC v4.4 - Static Code Analyzer for Repo Intelligence
 */

import * as fs from 'fs';
import * as path from 'path';

interface StaticAnalysisResult {
  unusedFunctions: Array<{ file: string; function: string }>;
  complexityIssues: Array<{ file: string; complexity: number; line: number }>;
  missingErrorHandling: Array<{ file: string; line: number; pattern: string }>;
  missingAsyncSafety: Array<{ file: string; line: number }>;
  largeFiles: Array<{ file: string; lineCount: number; sizeKB: number }>;
}

/**
 * Analyze repository for static code issues
 */
export async function analyzeRepositoryStatic(repoRoot: string): Promise<StaticAnalysisResult> {
  const result: StaticAnalysisResult = {
    unusedFunctions: [],
    complexityIssues: [],
    missingErrorHandling: [],
    missingAsyncSafety: [],
    largeFiles: [],
  };

  const files = collectTypeScriptFiles(repoRoot);

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for large files
      if (lines.length > 1000) {
        const stats = fs.statSync(filePath);
        result.largeFiles.push({
          file: path.relative(repoRoot, filePath),
          lineCount: lines.length,
          sizeKB: stats.size / 1024,
        });
      }

      // Check for missing error handling (simple heuristics)
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check for missing try-catch around async operations
        if (line.includes('await ') || line.includes('Promise.') || line.includes('.then(')) {
          const hasTryCatch = checkHasTryCatch(lines, index);
          if (!hasTryCatch) {
            result.missingAsyncSafety.push({
              file: path.relative(repoRoot, filePath),
              line: lineNum,
            });
          }
        }

        // Check for missing error handling in critical operations
        if (line.includes('fs.') || line.includes('process.') || line.includes('JSON.parse')) {
          const hasErrorHandling = checkHasErrorHandling(lines, index);
          if (!hasErrorHandling) {
            result.missingErrorHandling.push({
              file: path.relative(repoRoot, filePath),
              line: lineNum,
              pattern: line.trim().substring(0, 50),
            });
          }
        }
      });

      // Calculate cyclomatic complexity (simplified)
      const complexity = calculateComplexity(content);
      if (complexity > 20) {
        result.complexityIssues.push({
          file: path.relative(repoRoot, filePath),
          complexity,
          line: 1,
        });
      }

    } catch (error) {
      // Skip files that can't be analyzed
    }
  }

  return result;
}

function collectTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') {
        continue;
      }
      
      if (entry.isDirectory()) {
        collectTypeScriptFiles(fullPath, fileList);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        fileList.push(fullPath);
      }
    }
  } catch (error) {
    // Skip unreadable directories
  }
  
  return fileList;
}

function checkHasTryCatch(lines: string[], index: number): boolean {
  let depth = 0;
  let foundTry = false;
  
  for (let i = Math.max(0, index - 20); i <= index; i++) {
    const line = lines[i];
    if (line.includes('try {')) {
      foundTry = true;
      depth = 1;
    }
    if (foundTry) {
      if (line.includes('{')) depth++;
      if (line.includes('}')) depth--;
      if (line.includes('catch') && depth <= 1) {
        return true;
      }
    }
  }
  
  return false;
}

function checkHasErrorHandling(lines: string[], index: number): boolean {
  // Simple check: look for try-catch or error handling in nearby lines
  for (let i = Math.max(0, index - 5); i <= Math.min(lines.length - 1, index + 5); i++) {
    if (lines[i].includes('try') || lines[i].includes('catch') || lines[i].includes('if (error')) {
      return true;
    }
  }
  return false;
}

function calculateComplexity(content: string): number {
  // Simplified cyclomatic complexity calculation
  let complexity = 1; // Base complexity
  
  const complexityKeywords = [
    'if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?'
  ];
  
  for (const keyword of complexityKeywords) {
    const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'g'));
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

