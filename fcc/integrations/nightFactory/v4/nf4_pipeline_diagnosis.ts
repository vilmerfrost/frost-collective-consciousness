/**
 * Night Factory v4 Integration: Pipeline Diagnosis
 * 
 * Real-time diagnosis of Night Factory pipeline stages,
 * catching errors BEFORE they propagate.
 */

import { runFCCQuery } from '../../../core/fccEngine';
import { FCCQuestionContext, FCCReport } from '../../../core/types';
import { ModelInvoker } from '../../../core/modelInvoker';

export interface NF4PipelineContext {
  stage: string;
  query: string;
  agentId?: string;
  logs?: string;
  stackTrace?: string;
  relatedFiles?: string[];
}

/**
 * Diagnose a Night Factory pipeline stage
 */
export async function diagnosePipelineStage(
  context: NF4PipelineContext,
  modelInvoker?: ModelInvoker,
  repoRoot?: string
): Promise<FCCReport> {
  const fccContext: FCCQuestionContext = {
    mode: 'pipeline_diagnosis',
    question: context.query || `Analyze the ${context.stage} stage for potential failures and bottlenecks.`,
    relatedFiles: context.relatedFiles || [`orchestrator.ts`, `lib/fcc/clients/*`],
    logs: context.logs,
    stackTraces: context.stackTrace,
    failingStage: context.stage,
    agentName: context.agentId,
    extra: {
      nf4Integration: true,
      stage: context.stage,
    },
  };

  return runFCCQuery(fccContext, modelInvoker, repoRoot);
}

/**
 * Pre-flight diagnosis before running a stage
 */
export async function diagnoseBeforeStage(
  stage: string,
  query?: string,
  modelInvoker?: ModelInvoker,
  repoRoot?: string
): Promise<FCCReport> {
  return diagnosePipelineStage(
    {
      stage,
      query: query || `What could go wrong in the ${stage} stage? Identify risks BEFORE execution.`,
      relatedFiles: [`orchestrator.ts`, `lib/fcc/clients/*`],
    },
    modelInvoker,
    repoRoot
  );
}

/**
 * Post-flight diagnosis after a stage completes
 */
export async function diagnoseAfterStage(
  stage: string,
  logs?: string,
  query?: string,
  modelInvoker?: ModelInvoker,
  repoRoot?: string
): Promise<FCCReport> {
  return diagnosePipelineStage(
    {
      stage,
      query: query || `Analyze the ${stage} stage execution. Did it succeed? What risks remain?`,
      logs,
      relatedFiles: [`orchestrator.ts`, `lib/fcc/clients/*`],
    },
    modelInvoker,
    repoRoot
  );
}

