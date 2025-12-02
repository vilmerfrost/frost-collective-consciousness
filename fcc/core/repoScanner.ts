/**
 * FCC Repo Scanner
 * 
 * Scans the repository to build a snapshot of files for evidence-based analysis.
 * Excludes build artifacts, dependencies, and irrelevant files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { RepoSnapshot, RepoFileSummary } from './types';

const DEFAULT_EXCLUDED_DIRS = [
  'node_modules',
  '.next',
  '.turbo',
  '.git',
  'dist',
  'build',
  '.vercel',
  '.cache',
  'coverage',
  '.nyc_output',
  '.vscode',
  '.idea',
  '*.log',
  '.DS_Store',
];

const DEFAULT_EXCLUDED_PATTERNS = [
  /\.(log|tmp|cache)$/i,
  /^\./,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB default limit
const MAX_PREVIEW_BYTES = 10 * 1024; // 10KB preview for large files

/**
 * Check if a path matches any exclusion pattern
 */
function isExcluded(filePath: string, excludedDirs: string[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Check directory exclusions
  for (const excluded of excludedDirs) {
    if (normalizedPath.includes(`/${excluded}/`) || normalizedPath.startsWith(`${excluded}/`)) {
      return true;
    }
  }
  
  // Check pattern exclusions
  for (const pattern of DEFAULT_EXCLUDED_PATTERNS) {
    if (pattern.test(path.basename(filePath))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Recursively scan directory and build file list
 */
function scanDirectory(
  dirPath: string,
  repoRoot: string,
  excludedDirs: string[],
  maxDepth: number = 10,
  currentDepth: number = 0
): RepoFileSummary[] {
  if (currentDepth > maxDepth) {
    return [];
  }

  const files: RepoFileSummary[] = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(repoRoot, fullPath).replace(/\\/g, '/');
      
      if (isExcluded(relativePath, excludedDirs)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push({
          path: relativePath,
          size: 0,
          isDirectory: true,
        });
        
        // Recursively scan subdirectory
        const subFiles = scanDirectory(fullPath, repoRoot, excludedDirs, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          files.push({
            path: relativePath,
            size: stats.size,
            isDirectory: false,
            lastModified: stats.mtime.toISOString(),
          });
        } catch (err) {
          // Skip files we can't stat
          continue;
        }
      }
    }
  } catch (err) {
    // Skip directories we can't read
    console.warn(`[FCC RepoScanner] Cannot read directory: ${dirPath}`, err);
  }
  
  return files;
}

/**
 * Load file content, respecting size limits
 */
function loadFileContent(filePath: string, repoRoot: string, maxSize: number = MAX_FILE_SIZE_BYTES): string | undefined {
  const fullPath = path.join(repoRoot, filePath);
  
  try {
    const stats = fs.statSync(fullPath);
    
    if (stats.size > maxSize) {
      // Load only preview for large files
      const buffer = fs.readFileSync(fullPath, { encoding: 'utf8', flag: 'r' });
      return buffer.substring(0, MAX_PREVIEW_BYTES) + '\n\n[... FILE TRUNCATED - TOO LARGE ...]';
    }
    
    return fs.readFileSync(fullPath, 'utf8');
  } catch (err) {
    console.warn(`[FCC RepoScanner] Cannot read file: ${filePath}`, err);
    return undefined;
  }
}

/**
 * Build a repository snapshot
 */
export function buildRepoSnapshot(
  repoRoot: string = process.cwd(),
  excludedDirs: string[] = DEFAULT_EXCLUDED_DIRS,
  maxDepth: number = 10
): RepoSnapshot {
  const normalizedRoot = path.resolve(repoRoot);
  
  if (!fs.existsSync(normalizedRoot)) {
    throw new Error(`Repository root does not exist: ${normalizedRoot}`);
  }
  
  const files = scanDirectory(normalizedRoot, normalizedRoot, excludedDirs, maxDepth);
  
  return {
    root: normalizedRoot,
    files,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Merge multiple repository snapshots into one
 * Useful for combining main repo with external cloned repos
 */
export function mergeRepoSnapshots(snapshots: RepoSnapshot[]): RepoSnapshot {
  if (snapshots.length === 0) {
    throw new Error('Cannot merge empty snapshots array');
  }
  
  if (snapshots.length === 1) {
    return snapshots[0];
  }
  
  const primarySnapshot = snapshots[0];
  const allFiles: RepoFileSummary[] = [...primarySnapshot.files];
  
  // Merge files from other snapshots, prefixing paths with their repo root
  for (let i = 1; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    const repoName = path.basename(snapshot.root);
    
    for (const file of snapshot.files) {
      // Prefix external repo files with repo name to avoid conflicts
      allFiles.push({
        ...file,
        path: `[EXTERNAL:${repoName}]/${file.path}`,
      });
    }
  }
  
  return {
    root: primarySnapshot.root,
    files: allFiles,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Verify that a file path exists in the repository
 * @param filePath - Path to verify (can include line numbers like "file.ts:20-50")
 * @returns true if path exists, false otherwise
 */
export async function verifyPathExists(filePath: string): Promise<boolean> {
  const fs = require('fs');
  // Extract just the file path (remove line numbers like "file.ts:20-50")
  const cleanPath = filePath.split(':')[0];
  
  try {
    return fs.existsSync(cleanPath);
  } catch (error) {
    return false;
  }
}

/**
 * Get files matching a glob pattern or exact path
 */
export function getFilesByPattern(
  snapshot: RepoSnapshot,
  pattern: string
): RepoFileSummary[] {
  // Simple glob matching (supports * wildcard)
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  const regex = new RegExp(`^${regexPattern}$`);
  
  return snapshot.files.filter(file => regex.test(file.path));
}

/**
 * Get file content by path
 */
export function getFileContent(
  snapshot: RepoSnapshot,
  filePath: string,
  loadContent: boolean = true
): RepoFileSummary | undefined {
  const file = snapshot.files.find(f => f.path === filePath || f.path.endsWith(`/${filePath}`));
  
  if (!file) {
    return undefined;
  }
  
  // Load content if requested and not already loaded
  if (loadContent && !file.isDirectory && file.content === undefined) {
    file.content = loadFileContent(file.path, snapshot.root);
  }
  
  return file;
}

/**
 * Load content for related files (prioritized)
 */
export function loadRelatedFiles(
  snapshot: RepoSnapshot,
  relatedFiles: string[]
): RepoFileSummary[] {
  const loaded: RepoFileSummary[] = [];
  const MAX_FILES_TO_LOAD = 50; // Limit to prevent slow operations
  
  for (const pattern of relatedFiles) {
    // Special handling for '*' pattern - limit to top N relevant files
    if (pattern === '*') {
      // Load top files by relevance (prioritize source files, exclude large/binary)
      const relevantFiles = snapshot.files
        .filter(f => !f.isDirectory && f.size < MAX_FILE_SIZE_BYTES)
        .filter(f => {
          const ext = path.extname(f.path).toLowerCase();
          const relevantExts = ['.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.yaml', '.yml'];
          return relevantExts.includes(ext) || !ext;
        })
        .slice(0, MAX_FILES_TO_LOAD);
      
      for (const file of relevantFiles) {
        if (file.content === undefined) {
          file.content = loadFileContent(file.path, snapshot.root);
          loaded.push(file);
        }
      }
      console.log(`[FCC RepoScanner] Loaded ${loaded.length} files from '*' pattern (limited to ${MAX_FILES_TO_LOAD})`);
      break; // Only process '*' pattern once
    }
    
    const matches = getFilesByPattern(snapshot, pattern);
    for (const file of matches.slice(0, MAX_FILES_TO_LOAD)) {
      if (!file.isDirectory && file.content === undefined) {
        file.content = loadFileContent(file.path, snapshot.root);
        loaded.push(file);
      }
    }
  }
  
  return loaded;
}

/**
 * Get summary statistics about the repo snapshot
 */
export function getRepoSummary(snapshot: RepoSnapshot): {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  fileTypes: Record<string, number>;
} {
  const files = snapshot.files.filter(f => !f.isDirectory);
  const dirs = snapshot.files.filter(f => f.isDirectory);
  
  const fileTypes: Record<string, number> = {};
  let totalSize = 0;
  
  for (const file of files) {
    const ext = path.extname(file.path) || '(no extension)';
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    totalSize += file.size;
  }
  
  return {
    totalFiles: files.length,
    totalDirectories: dirs.length,
    totalSize,
    fileTypes,
  };
}

