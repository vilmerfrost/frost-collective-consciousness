/**
 * FCC v4.4 - Zod Schema for FCC Report
 */

import { z } from 'zod';
import { FCCMetadataSchema } from './FCCMetadataSchema';

export const FCCEvidenceSchema = z.object({
  filePath: z.string(),
  snippet: z.string(),
  reasoning: z.string(),
  lineNumbers: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
});

export const FCCFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  evidence: z.array(FCCEvidenceSchema),
  severity: z.number().min(1).max(10),
  impactArea: z.enum([
    'architecture',
    'performance',
    'scalability',
    'reliability',
    'security',
    'ux',
    'devx',
    'unknown',
  ]),
  confidence: z.number().min(0).max(100).optional(),
});

export const FCCRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  expectedImpact: z.string(),
  difficulty: z.enum(['low', 'medium', 'high']),
  relatedFindings: z.array(z.string()).optional(),
  priority: z.number().min(1).max(10).optional(),
  roiEstimate: z.string().optional(),
  architecturalSeverity: z.number().min(1).max(10).optional(),
  reliabilitySeverity: z.number().min(1).max(10).optional(),
  costImpact: z.string().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  operationalOverhead: z.string().optional(),
  technicalAlignmentScore: z.number().min(0).max(10).optional(),
});

export const FCCReportSchema = z.object({
  mode: z.enum(['pipeline_diagnosis', 'agent_output_critique', 'meta_prompt_architect']),
  question: z.string(),
  summary: z.string(),
  assumptions: z.array(z.string()),
  findings: z.array(FCCFindingSchema),
  recommendations: z.array(FCCRecommendationSchema),
  overallRiskScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  notes: z.string().optional(),
  adaptiveText: z.string().optional(),
  metadata: FCCMetadataSchema.optional(),
});

export type ValidatedFCCReport = z.infer<typeof FCCReportSchema>;

/**
 * Parse and validate FCC report with Zod
 */
export function parseFCCReport(modelOutput: string): { success: true; data: ValidatedFCCReport } | { success: false; error: z.ZodError } {
  try {
    // Try to extract JSON from markdown or plain text
    const jsonMatch = modelOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in model output');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const result = FCCReportSchema.safeParse(parsed);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof z.ZodError 
        ? error 
        : new z.ZodError([{
            code: 'custom',
            path: [],
            message: error instanceof Error ? error.message : 'Unknown parsing error',
          }]),
    };
  }
}

