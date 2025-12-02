/**
 * Night Factory v4 Integration: Cross-Agent Audit
 * 
 * Audit agent outputs across the pipeline for consistency,
 * contradictions, and quality issues.
 */

import { runFCCQuery } from '../../../core/fccEngine';
import { FCCQuestionContext, FCCReport } from '../../../core/types';
import { ModelInvoker } from '../../../core/modelInvoker';

export interface NF4AgentOutput {
  agentId: string;
  agentName: string;
  output: string;
  stage: string;
}

export interface NF4AuditContext {
  agentOutputs: NF4AgentOutput[];
  query?: string;
}

/**
 * Audit agent outputs for consistency and quality
 */
export async function auditAgentOutputs(
  context: NF4AuditContext,
  modelInvoker?: ModelInvoker,
  repoRoot?: string
): Promise<FCCReport> {
  const agentOutputsSummary = context.agentOutputs
    .map(ao => `[${ao.agentName} (${ao.agentId}) in ${ao.stage}]:\n${ao.output}`)
    .join('\n\n---\n\n');

  const question = context.query || `
Audit the following agent outputs for:
- Consistency between agents
- Contradictions
- Quality issues
- Spec compliance
- Hallucinations

Agent Outputs:
${agentOutputsSummary}
`;

  const fccContext: FCCQuestionContext = {
    mode: 'agent_output_critique',
    question,
    relatedFiles: ['orchestrator.ts'],
    agentOutput: agentOutputsSummary,
    extra: {
      nf4Integration: true,
      crossAgentAudit: true,
      agentCount: context.agentOutputs.length,
    },
  };

  return runFCCQuery(fccContext, modelInvoker, repoRoot);
}

