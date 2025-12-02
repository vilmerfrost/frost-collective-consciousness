/**
 * FCC v4.4 - Repo Intelligence Module
 */

export * from './staticAnalyzer';
export * from './llmPatternDetector';

import { analyzeRepositoryStatic } from './staticAnalyzer';
import { detectRepoPatterns } from './llmPatternDetector';
import type { ModelInvoker } from '../../core/modelInvoker';
import type { RepoSnapshot } from '../../core/types';

export interface RepoIntelligenceOutput {
  static: Awaited<ReturnType<typeof analyzeRepositoryStatic>>;
  patterns: Awaited<ReturnType<typeof detectRepoPatterns>>;
}

/**
 * Generate complete repo intelligence report
 */
export async function generateRepoIntelligence(
  repoSnapshot: RepoSnapshot,
  invoker: ModelInvoker,
  systemPrompt: string
): Promise<RepoIntelligenceOutput> {
  const [staticAnalysis, patterns] = await Promise.all([
    analyzeRepositoryStatic(repoSnapshot.root),
    detectRepoPatterns(repoSnapshot, invoker, systemPrompt),
  ]);

  return {
    static: staticAnalysis,
    patterns,
  };
}

