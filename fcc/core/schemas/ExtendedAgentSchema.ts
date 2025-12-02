/**
 * FCC v4.4 - Zod Schema for Extended Agent Outputs
 */

import { z } from 'zod';

export const RiskHeatmapSchema = z.object({
  riskHeatmap: z.record(z.string(), z.object({
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
    timeline: z.string(),
    probability: z.number().min(0).max(1),
    impact: z.number().min(1).max(10),
  })),
  riskSummary: z.string(),
  confidence: z.number().min(0).max(100),
});

export const FeasibilityCurveSchema = z.object({
  feasibilityAnalysis: z.object({
    recommendations: z.array(z.object({
      recommendationId: z.string(),
      feasibilityScore: z.number().min(1).max(10),
      timeAvailabilityScore: z.number().min(1).max(10),
      complexityScore: z.number().min(1).max(10),
      blockerCount: z.number(),
    })),
    overallFeasibility: z.number().min(0).max(100),
  }),
  summary: z.string(),
  confidence: z.number().min(0).max(100),
});

export const EconomicAnalysisSchema = z.object({
  economicAnalysis: z.object({
    costProjections: z.object({
      totalEstimatedCost: z.number(),
      costPerQuery: z.number(),
      monthlyEstimate: z.number(),
      recommendedModels: z.array(z.string()),
    }),
    roiAnalysis: z.record(z.string(), z.object({
      roi: z.number(),
      breakEvenTime: z.string(),
    })),
  }),
  summary: z.string(),
  confidence: z.number().min(0).max(100),
});

export const ExtendedAgentOutputsSchema = z.object({
  riskHeatmap: RiskHeatmapSchema.optional(),
  feasibilityCurve: FeasibilityCurveSchema.optional(),
  economicModel: EconomicAnalysisSchema.optional(),
  repoIntel: z.any().optional(),
});

export type RiskHeatmap = z.infer<typeof RiskHeatmapSchema>;
export type FeasibilityCurve = z.infer<typeof FeasibilityCurveSchema>;
export type EconomicAnalysis = z.infer<typeof EconomicAnalysisSchema>;

