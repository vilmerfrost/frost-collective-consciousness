/**
 * FCC v4.4 - Parallel Phase 1 Architecture
 * 
 * Runs Lead Thinker, Risk Forecaster, Feasibility Analyst, and Economic Optimizer in parallel
 */

import { ModelInvoker } from './modelInvoker';
import { RepoSnapshot, FCCQuestionContext, FCCReport } from './types';
import { getLeadThinkerForMode, getReviewerForMode } from './modelRouter';

interface PhaseOneResult {
  leadThinker: FCCReport | { error: string; partial: boolean };
  risk: any | { error: string; partial: boolean };
  feasibility: any | { error: string; partial: boolean };
  economics: any | { error: string; partial: boolean };
}

interface AgentContext {
  question: string;
  repoSnapshot: RepoSnapshot;
  systemPrompt: string;
  mode: FCCQuestionContext['mode'];
  repoRoot?: string;
  leadDraft?: FCCReport | null;
  recommendations?: any[];
}

/**
 * Run Phase 1 agents in parallel using Promise.allSettled
 */
export async function runParallelPhaseOne(
  ctx: AgentContext,
  invoker: ModelInvoker,
  buildLeadPrompt: (systemPrompt: string, modePrompt: string, question: string, repoSnapshot: RepoSnapshot, fullContext: FCCQuestionContext) => string,
  modePrompt: string,
  fullContext: FCCQuestionContext,
  runRiskForecaster: (ctx: any, invoker: ModelInvoker) => Promise<any>,
  runFeasibilityAnalyst: (ctx: any, invoker: ModelInvoker) => Promise<any>,
  runEconomicOptimizer: (ctx: any, invoker: ModelInvoker) => Promise<any>
): Promise<PhaseOneResult> {
  
  const leadModel = getLeadThinkerForMode(ctx.mode);
  const reviewerModel = getReviewerForMode(ctx.mode);
  
  // Build Lead Thinker prompt
  const leadPrompt = buildLeadPrompt(
    ctx.systemPrompt,
    modePrompt,
    ctx.question,
    ctx.repoSnapshot,
    fullContext
  );
  
  // Prepare all agent invocations
  const leadThinkerPromise = invoker.invoke({
    model: leadModel,
    prompt: leadPrompt,
    systemPrompt: ctx.systemPrompt,
  }).then(async (result) => {
    if (!result.rawText || result.rawText.trim().length === 0) {
      throw new Error('Lead Thinker returned empty output');
    }
    
    const jsonMatch = result.rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Lead Thinker output');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as FCCReport;
  });
  
  const riskPromise = runRiskForecaster({
    question: ctx.question,
    repoSnapshot: ctx.repoSnapshot,
    leadDraft: null, // Will be updated after lead thinker completes
    systemPrompt: ctx.systemPrompt,
    repoRoot: ctx.repoRoot,
  }, invoker);
  
  const feasibilityPromise = runFeasibilityAnalyst({
    question: ctx.question,
    repoSnapshot: ctx.repoSnapshot,
    recommendations: ctx.recommendations || [],
    systemPrompt: ctx.systemPrompt,
    repoRoot: ctx.repoRoot,
  }, invoker);
  
  const economicsPromise = runEconomicOptimizer({
    question: ctx.question,
    repoSnapshot: ctx.repoSnapshot,
    systemPrompt: ctx.systemPrompt,
    repoRoot: ctx.repoRoot,
  }, invoker);
  
  // Run all in parallel
  const [leadResult, riskResult, feasibilityResult, economicsResult] = await Promise.allSettled([
    leadThinkerPromise,
    riskPromise,
    feasibilityPromise,
    economicsPromise,
  ]);
  
  // Process results with fallbacks
  const result: PhaseOneResult = {
    leadThinker: leadResult.status === 'fulfilled' 
      ? leadResult.value 
      : { error: leadResult.reason?.message || 'Lead Thinker failed', partial: true },
    risk: riskResult.status === 'fulfilled'
      ? riskResult.value
      : { error: riskResult.reason?.message || 'Risk Forecaster failed', partial: true },
    feasibility: feasibilityResult.status === 'fulfilled'
      ? feasibilityResult.value
      : { error: feasibilityResult.reason?.message || 'Feasibility Analyst failed', partial: true },
    economics: economicsResult.status === 'fulfilled'
      ? economicsResult.value
      : { error: economicsResult.reason?.message || 'Economic Optimizer failed', partial: true },
  };
  
  return result;
}

