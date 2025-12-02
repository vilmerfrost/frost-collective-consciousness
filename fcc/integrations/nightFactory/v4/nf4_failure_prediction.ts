/**
 * Night Factory v4 Integration: Failure Prediction
 * 
 * Predictive failure analysis using Risk Forecaster Agent.
 */

import { runFCCQuery } from '../../../core/fccEngine';
import { FCCQuestionContext, FCCReport } from '../../../core/types';
import { ModelInvoker } from '../../../core/modelInvoker';

export interface NF4FailurePredictionContext {
  pipeline: string;
  timeHorizon?: string; // e.g., "3 months", "6 months"
  currentRisks?: string[];
}

/**
 * Predict future failures in the pipeline
 */
export async function predictFailures(
  context: NF4FailurePredictionContext,
  modelInvoker?: ModelInvoker,
  repoRoot?: string
): Promise<FCCReport> {
  const timeHorizon = context.timeHorizon || '6 months';
  
  const question = `
Predict potential failures in the ${context.pipeline} pipeline over the next ${timeHorizon}.

${context.currentRisks ? `Current known risks: ${context.currentRisks.join(', ')}` : ''}

Identify:
- What could fail?
- When is it likely to fail?
- What are the risk curves?
- What mitigations can prevent failures?
`;

  const fccContext: FCCQuestionContext = {
    mode: 'pipeline_diagnosis',
    question,
    relatedFiles: ['orchestrator.ts'],
    extra: {
      nf4Integration: true,
      failurePrediction: true,
      timeHorizon,
    },
  };

  return runFCCQuery(fccContext, modelInvoker, repoRoot);
}

