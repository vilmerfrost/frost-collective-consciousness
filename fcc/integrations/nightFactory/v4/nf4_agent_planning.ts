/**
 * Night Factory v4 Integration: Multi-Agent Planning
 * 
 * Help plan multi-agent workflows and coordinate agent execution.
 */

import { runFCCQuery } from '../../../core/fccEngine';
import { FCCQuestionContext, FCCReport } from '../../../core/types';
import { ModelInvoker } from '../../../core/modelInvoker';

export interface NF4PlanningContext {
  agents: string[];
  goal: string;
  constraints?: string[];
  currentState?: string;
  previousPlans?: string;
}

/**
 * Plan a multi-agent workflow
 */
export async function planMultiAgentWorkflow(
  context: NF4PlanningContext,
  modelInvoker?: ModelInvoker,
  repoRoot?: string
): Promise<FCCReport> {
  const question = `
Plan a multi-agent workflow to achieve: ${context.goal}

Available agents: ${context.agents.join(', ')}
${context.constraints ? `Constraints: ${context.constraints.join(', ')}` : ''}
${context.currentState ? `Current state: ${context.currentState}` : ''}
${context.previousPlans ? `Previous plans: ${context.previousPlans}` : ''}

Design the optimal agent sequence, handoffs, and error handling.
`;

  const fccContext: FCCQuestionContext = {
    mode: 'pipeline_diagnosis',
    question,
    relatedFiles: ['orchestrator.ts', 'config.ts'],
    extra: {
      nf4Integration: true,
      planningMode: true,
      agents: context.agents,
    },
  };

  return runFCCQuery(fccContext, modelInvoker, repoRoot);
}

