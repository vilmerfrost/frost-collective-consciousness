/**
 * FCC v4.4 - Benchmark Runner
 */

import type { FCCQuestionContext, FCCReport } from '../core/types';

interface BenchmarkResult {
  query: FCCQuestionContext;
  report: FCCReport;
  latencyMs: number;
  costEstimate: number;
  timestamp: string;
}

interface PerformanceMetrics {
  avgLatencyMs: number;
  avgCostEstimate: number;
  successRate: number;
  totalQueries: number;
}

/**
 * Run benchmark queries and collect metrics
 */
export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  async runBenchmark(
    query: FCCQuestionContext,
    runFCCFn: (ctx: FCCQuestionContext) => Promise<FCCReport>
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    
    try {
      const report = await runFCCFn(query);
      const latencyMs = Date.now() - startTime;
      const costEstimate = estimateCost(report);
      
      const result: BenchmarkResult = {
        query,
        report,
        latencyMs,
        costEstimate,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  getMetrics(): PerformanceMetrics {
    if (this.results.length === 0) {
      return {
        avgLatencyMs: 0,
        avgCostEstimate: 0,
        successRate: 0,
        totalQueries: 0,
      };
    }

    const latencies = this.results.map(r => r.latencyMs);
    const costs = this.results.map(r => r.costEstimate);
    
    return {
      avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      avgCostEstimate: costs.reduce((a, b) => a + b, 0) / costs.length,
      successRate: 1.0, // Assuming all results are successful
      totalQueries: this.results.length,
    };
  }

  clearResults(): void {
    this.results = [];
  }
}

/**
 * Estimate cost based on report metadata
 */
function estimateCost(report: FCCReport): number {
  // Simple cost estimation based on models used
  const modelsUsed = report.metadata?.modelsUsed || [];
  let cost = 0;

  for (const modelId of modelsUsed) {
    if (modelId.includes('deepseek-r1')) cost += 0.05;
    else if (modelId.includes('deepseek')) cost += 0.002;
    else if (modelId.includes('gemini')) cost += 0.001;
    else if (modelId.includes('kimi')) cost += 0.01;
  }

  return cost;
}

