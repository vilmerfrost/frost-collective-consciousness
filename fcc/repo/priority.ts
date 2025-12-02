/**
 * FCC v4.4 - File Priority Mapping
 */

export const FILE_PRIORITY_WEIGHTS: Record<string, number> = {
  'orchestrator': 10,
  'agents/': 9,
  'state': 8,
  'config': 6,
  'lib': 5,
  'tests': 2,
  'docs': 1,
};

/**
 * Calculate file priority based on path patterns
 */
export function calculateFilePriority(filePath: string): number {
  const lowerPath = filePath.toLowerCase();
  
  for (const [pattern, weight] of Object.entries(FILE_PRIORITY_WEIGHTS)) {
    if (lowerPath.includes(pattern)) {
      return weight;
    }
  }
  
  // Default priority for unlisted files
  return 3;
}

/**
 * Check if file is critical (priority >= 8)
 */
export function isCriticalFile(filePath: string): boolean {
  return calculateFilePriority(filePath) >= 8;
}

