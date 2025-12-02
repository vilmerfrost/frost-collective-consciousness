/**
 * FCC v4.4 - Cost-Aware Model Router v2
 */

import { ModelConfig } from '../core/types';
import { MODEL_REGISTRY } from '../core/modelRouter';

interface RoutingContext {
  complexityScore: number; // 0-1
  confidence?: number; // 0-1
  questionLength?: number;
  repoFileCount?: number;
}

/**
 * Calculate complexity score from context
 */
function calculateComplexityScore(ctx: RoutingContext): number {
  let score = ctx.complexityScore || 0.5;
  
  // Adjust based on question length
  if (ctx.questionLength) {
    if (ctx.questionLength > 1000) score += 0.2;
    else if (ctx.questionLength > 500) score += 0.1;
  }
  
  // Adjust based on repo size
  if (ctx.repoFileCount) {
    if (ctx.repoFileCount > 400) score += 0.2;
    else if (ctx.repoFileCount > 200) score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Route to model based on complexity and confidence
 */
export function routeModelV2(
  ctx: RoutingContext,
  role: 'lead_thinker' | 'reviewer' | 'speed' | 'research'
): ModelConfig {
  const complexity = calculateComplexityScore(ctx);
  const confidence = ctx.confidence ?? 1.0;
  
  // Find available models for role
  const availableModels = MODEL_REGISTRY.filter(m => 
    m.role === role && 
    m.enabled &&
    (process.env[m.apiKeyEnvVar] && process.env[m.apiKeyEnvVar] !== 'sk-...')
  );

  if (availableModels.length === 0) {
    throw new Error(`No available models found for role: ${role}`);
  }

  // Routing rules based on complexity
  if (complexity < 0.3) {
    // Low complexity: Use cheapest model
    const deepseek = availableModels.find(m => m.id.includes('deepseek') && !m.id.includes('r1'));
    if (deepseek) return deepseek;
  } else if (complexity < 0.7) {
    // Medium complexity: Use Gemini Flash
    const gemini = availableModels.find(m => m.id.includes('gemini'));
    if (gemini) return gemini;
  }

  // High complexity or fallback: Use DeepSeek R1
  const deepseekR1 = availableModels.find(m => m.id.includes('deepseek-r1'));
  if (deepseekR1) return deepseekR1;

  // Escalate if confidence is low
  if (confidence < 0.8) {
    const bestModel = availableModels.find(m => m.id.includes('deepseek-r1')) ||
                     availableModels.find(m => m.id.includes('deepseek'));
    if (bestModel) return bestModel;
  }

  // Final fallback: first available model
  return availableModels[0];
}

/**
 * Get lead thinker with complexity-based routing
 */
export function getLeadThinkerV2(ctx: RoutingContext): ModelConfig {
  return routeModelV2(ctx, 'lead_thinker');
}

/**
 * Get reviewer with complexity-based routing
 */
export function getReviewerV2(ctx: RoutingContext): ModelConfig {
  return routeModelV2(ctx, 'reviewer');
}

/**
 * Get speed layer with complexity-based routing
 */
export function getSpeedLayerV2(ctx: RoutingContext): ModelConfig {
  return routeModelV2(ctx, 'speed');
}

