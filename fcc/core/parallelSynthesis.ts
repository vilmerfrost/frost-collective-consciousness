/**
 * FCC v4.4 - Parallel Synthesis for Large Repositories
 */

import type { FCCReport, RepoSnapshot } from './types';
import type { ModelInvoker } from './modelInvoker';
import { parseFCCReport } from './schemas/FCCReportSchema';

interface ChunkResult {
  chunkIndex: number;
  report: FCCReport | null;
  error?: string;
}

/**
 * Split large repo analysis into chunks and synthesize in parallel
 */
export async function parallelSynthesizeLargeRepo(
  chunks: Array<{ question: string; repoSnapshot: RepoSnapshot; context: any }>,
  synthesizerFn: (chunk: any) => Promise<string>,
  maxConcurrency: number = 3
): Promise<FCCReport> {
  if (chunks.length === 0) {
    throw new Error('No chunks provided for parallel synthesis');
  }

  // Process chunks with concurrency limit
  const results: ChunkResult[] = [];
  
  for (let i = 0; i < chunks.length; i += maxConcurrency) {
    const batch = chunks.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async (chunk, batchIndex) => {
      try {
        const rawOutput = await synthesizerFn(chunk);
        const parsed = parseFCCReport(rawOutput);
        
        if (parsed.success) {
          return {
            chunkIndex: i + batchIndex,
            report: parsed.data,
          };
        } else {
          return {
            chunkIndex: i + batchIndex,
            report: null,
            error: parsed.error.message,
          };
        }
      } catch (error) {
        return {
          chunkIndex: i + batchIndex,
          report: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  // Merge all chunk results
  return mergeSynthesisResults(results);
}

/**
 * Merge multiple synthesis results into one report
 */
function mergeSynthesisResults(results: ChunkResult[]): FCCReport {
  const successfulResults = results.filter(r => r.report !== null) as Array<ChunkResult & { report: FCCReport }>;
  
  if (successfulResults.length === 0) {
    throw new Error('All synthesis chunks failed');
  }

  // Merge summaries
  const mergedSummary = successfulResults
    .map(r => r.report.summary)
    .join('\n\n');

  // Merge findings (deduplicate by ID)
  const findingsMap = new Map<string, FCCReport['findings'][0]>();
  for (const result of successfulResults) {
    for (const finding of result.report.findings) {
      if (!findingsMap.has(finding.id)) {
        findingsMap.set(finding.id, finding);
      }
    }
  }

  // Merge recommendations (deduplicate by ID)
  const recommendationsMap = new Map<string, FCCReport['recommendations'][0]>();
  for (const result of successfulResults) {
    for (const rec of result.report.recommendations) {
      if (!recommendationsMap.has(rec.id)) {
        recommendationsMap.set(rec.id, rec);
      }
    }
  }

  // Merge assumptions
  const assumptionsSet = new Set<string>();
  for (const result of successfulResults) {
    for (const assumption of result.report.assumptions) {
      assumptionsSet.add(assumption);
    }
  }

  // Recalculate metrics
  const allRiskScores = successfulResults.map(r => r.report.overallRiskScore);
  const avgRiskScore = allRiskScores.reduce((a, b) => a + b, 0) / allRiskScores.length;

  const allConfidences = successfulResults.map(r => r.report.confidence);
  const avgConfidence = allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;

  // Use first result as base template
  const baseReport = successfulResults[0].report;

  return {
    ...baseReport,
    summary: mergedSummary,
    assumptions: Array.from(assumptionsSet),
    findings: Array.from(findingsMap.values()),
    recommendations: Array.from(recommendationsMap.values()),
    overallRiskScore: Math.round(avgRiskScore),
    confidence: Math.round(avgConfidence),
    notes: `${baseReport.notes || ''} [Merged from ${successfulResults.length} parallel synthesis chunks]`,
  };
}

/**
 * Split repository into chunks for parallel analysis
 */
export function splitRepoIntoChunks(
  repoSnapshot: RepoSnapshot,
  maxFilesPerChunk: number = 100
): Array<RepoSnapshot> {
  const chunks: Array<RepoSnapshot> = [];
  
  for (let i = 0; i < repoSnapshot.files.length; i += maxFilesPerChunk) {
    chunks.push({
      root: repoSnapshot.root,
      files: repoSnapshot.files.slice(i, i + maxFilesPerChunk),
      scannedAt: repoSnapshot.scannedAt,
    });
  }

  return chunks;
}

