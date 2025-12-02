/**
 * FCC v4.4 - Repo Loader v2 (High Stability Mode)
 */

import * as fs from 'fs';
import * as path from 'path';
import { calculateFilePriority, isCriticalFile } from './priority';

interface LoaderStats {
  totalFiles: number;
  criticalFiles: number;
  skippedNonCritical: number;
}

interface FileChunk {
  path: string;
  content: string;
  priority: number;
}

/**
 * Load repository files with exponential backoff, batch fetching, and priority weighting
 */
export async function loadRepoV2(
  repoRoot: string,
  filePatterns: string[] = ['**/*'],
  options: {
    maxConcurrency?: number;
    batchSize?: number;
    prioritizeCritical?: boolean;
    skipNonCritical?: boolean;
  } = {}
): Promise<{ files: FileChunk[]; stats: LoaderStats }> {
  const {
    maxConcurrency = 10,
    batchSize = 40,
    prioritizeCritical = true,
    skipNonCritical = false,
  } = options;

  const files: FileChunk[] = [];
  const stats: LoaderStats = {
    totalFiles: 0,
    criticalFiles: 0,
    skippedNonCritical: 0,
  };

  // Collect all file paths
  const allFilePaths: string[] = [];
  
  function collectFiles(dir: string, baseDir: string = repoRoot) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath);
        
        // Skip node_modules, .git, .next, etc.
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' ||
            entry.name === '.next' ||
            entry.name === 'dist' ||
            entry.name === 'build') {
          continue;
        }
        
        if (entry.isDirectory()) {
          collectFiles(fullPath, baseDir);
        } else if (entry.isFile()) {
          allFilePaths.push(fullPath);
          stats.totalFiles++;
        }
      }
    } catch (error) {
      // Skip unreadable directories
    }
  }

  collectFiles(repoRoot);

  // Filter and prioritize files
  const filePathsWithPriority = allFilePaths
    .map(filePath => ({
      path: filePath,
      priority: calculateFilePriority(filePath),
      isCritical: isCriticalFile(filePath),
    }))
    .filter(({ path: filePath, isCritical }) => {
      if (skipNonCritical && !isCritical) {
        stats.skippedNonCritical++;
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (prioritizeCritical) {
        return b.priority - a.priority;
      }
      return 0;
    });

  stats.criticalFiles = filePathsWithPriority.filter(f => f.isCritical).length;

  // Batch load files with concurrency limit
  const batches: Array<typeof filePathsWithPriority> = [];
  for (let i = 0; i < filePathsWithPriority.length; i += batchSize) {
    batches.push(filePathsWithPriority.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const batchPromises = batch.map(async (fileInfo) => {
      return loadFileWithBackoff(fileInfo.path, fileInfo.priority);
    });

    const batchResults = await Promise.allSettled(
      batchPromises.map(p => limitConcurrency(p, maxConcurrency))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        files.push(result.value);
      }
    }
  }

  return { files, stats };
}

/**
 * Load file with exponential backoff retry
 */
async function loadFileWithBackoff(
  filePath: string,
  priority: number,
  maxRetries: number = 3
): Promise<FileChunk | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const backoffMs = attempt === 0 ? 0 : Math.min(100 * Math.pow(2, attempt - 1) + Math.random() * 50, 800);
      if (backoffMs > 0) {
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return {
        path: filePath,
        content,
        priority,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (attempt === maxRetries) {
        break;
      }
    }
  }

  console.warn(`[Repo Loader v2] Failed to load file after ${maxRetries} retries: ${filePath}`);
  return null;
}


