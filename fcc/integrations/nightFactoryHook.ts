/**
 * Night Factory Integration Hook
 * 
 * Provides a simple interface for Night Factory pipeline to call FCC.
 * Handles logging, error handling, and fallback responses.
 */

import { FCCQuestionContext, FCCReport } from '../core/types';
import { runFCCQuery } from '../core/fccEngine';
import { modelInvoker, type ModelInvoker } from '../core/modelInvoker';

/**
 * Request FCC consultation
 * 
 * Main entry point for Night Factory to call FCC.
 * 
 * @param ctx - FCC question context
 * @param modelInvoker - Optional model invoker (if not provided, returns placeholder)
 * @param repoRoot - Optional repo root path (defaults to process.cwd())
 * @returns FCCReport with analysis results
 */
export async function requestFCCConsult(
  ctx: FCCQuestionContext,
  customModelInvoker?: ModelInvoker,
  repoRoot?: string
): Promise<FCCReport> {
  console.log(`[FCC Hook] Request received - Mode: ${ctx.mode}, Question: ${ctx.question.substring(0, 100)}...`);

  try {
    const report = await runFCCQuery(ctx, customModelInvoker, repoRoot);
    
    // Log FCC run
    await logFCCRun(report, ctx);
    
    console.log(`[FCC Hook] Analysis complete - Findings: ${report.findings.length}, Recommendations: ${report.recommendations.length}, Risk: ${report.overallRiskScore}`);
    
    return report;
  } catch (error) {
    console.error('[FCC Hook] Error during FCC execution:', error);
    
    // Return fallback error report
    return {
      mode: ctx.mode,
      question: ctx.question,
      summary: `FCC integration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      assumptions: [],
      findings: [
        {
          id: 'integration-error',
          title: 'FCC Integration Failed',
          description: 'The FCC consultation request failed. This may indicate a configuration issue or model provider problem.',
          evidence: [],
          severity: 10,
          impactArea: 'unknown',
        },
      ],
      recommendations: [
        {
          id: 'check-integration',
          title: 'Check FCC Integration',
          description: 'Verify FCC is properly configured and model providers are accessible.',
          expectedImpact: 'Restore FCC functionality',
          difficulty: 'low',
        },
      ],
      overallRiskScore: 100,
      confidence: 0,
      notes: `Error: ${error instanceof Error ? error.stack : 'Unknown error'}`,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Trigger FCC on pipeline failure
 * 
 * Convenience function for Night Factory to call FCC when a pipeline stage fails.
 * 
 * @param failingStage - Name of the failing stage
 * @param logs - Pipeline logs
 * @param stackTraces - Stack traces if available
 * @param relatedFiles - Files related to the failure
 * @param modelInvoker - Optional model invoker
 * @returns FCCReport focused on pipeline diagnosis
 */
export async function triggerFCCOnFailure(
  failingStage: string,
  logs?: string,
  stackTraces?: string,
  relatedFiles?: string[],
  customModelInvoker?: ModelInvoker
): Promise<FCCReport> {
  const ctx: FCCQuestionContext = {
    mode: 'pipeline_diagnosis',
    question: `Why did the pipeline fail at stage "${failingStage}"? Analyze the failure and propose fixes.`,
    failingStage,
    logs,
    stackTraces,
    relatedFiles,
  };

  return requestFCCConsult(ctx, customModelInvoker);
}

/**
 * Request agent output critique
 * 
 * Convenience function for critiquing agent outputs.
 * 
 * @param agentName - Name of the agent
 * @param agentOutput - The agent's output to critique
 * @param currentPrompt - Current agent prompt/system instruction
 * @param relatedFiles - Files related to the agent
 * @param modelInvoker - Optional model invoker
 * @returns FCCReport focused on agent critique
 */
export async function critiqueAgentOutput(
  agentName: string,
  agentOutput: string,
  currentPrompt?: string,
  relatedFiles?: string[],
  customModelInvoker?: ModelInvoker
): Promise<FCCReport> {
  const ctx: FCCQuestionContext = {
    mode: 'agent_output_critique',
    question: `Critically analyze the output from agent "${agentName}". Find spec drift, hallucinations, missing elements, and propose improvements.`,
    agentName,
    agentOutput,
    currentPrompt,
    relatedFiles,
  };

  return requestFCCConsult(ctx, customModelInvoker);
}

/**
 * Request prompt architecture consultation
 * 
 * Convenience function for designing/improving agent prompts.
 * 
 * @param targetAgent - Name of the agent
 * @param currentPrompt - Current prompt to improve
 * @param desiredBehavior - Description of desired behavior
 * @param relatedFiles - Files related to the agent
 * @param modelInvoker - Optional model invoker
 * @returns FCCReport focused on prompt design
 */
export async function architectPrompt(
  targetAgent: string,
  currentPrompt?: string,
  desiredBehavior?: string,
  relatedFiles?: string[],
  customModelInvoker?: ModelInvoker
): Promise<FCCReport> {
  const ctx: FCCQuestionContext = {
    mode: 'meta_prompt_architect',
    question: `Design or improve the prompt for agent "${targetAgent}". Make it more deterministic, less lazy, and better aligned with Night Factory goals.`,
    agentName: targetAgent,
    currentPrompt,
    desiredBehavior,
    relatedFiles,
  };

  return requestFCCConsult(ctx, customModelInvoker);
}

/**
 * Log FCC run for metrics/debugging
 * 
 * TODO: Wire this into Supabase or your preferred logging system.
 * For now, just console.log a compact summary.
 */
async function logFCCRun(report: FCCReport, context: FCCQuestionContext): Promise<void> {
  console.log('[FCC RUN]', {
    mode: report.mode,
    risk: report.overallRiskScore,
    confidence: report.confidence,
    question: context.question.substring(0, 100),
    findingsCount: report.findings.length,
    recommendationsCount: report.recommendations.length,
    executionTimeMs: report.metadata?.executionTimeMs,
  });
}

/**
 * Example usage in Night Factory pipeline:
 * 
 * ```typescript
 * import { triggerFCCOnFailure } from './fcc/integrations/nightFactoryHook';
 * 
 * try {
 *   await runPipelineStage('planner');
 * } catch (error) {
 *   const fccReport = await triggerFCCOnFailure(
 *     'planner',
 *     getLogs(),
 *     error.stack,
 *     ['agent-runner/planner.ts', 'config.ts']
 *   );
 *   
 *   console.error('FCC Analysis:', fccReport.summary);
 *   console.error('Findings:', fccReport.findings);
 *   console.error('Recommendations:', fccReport.recommendations);
 * }
 * ```
 */

