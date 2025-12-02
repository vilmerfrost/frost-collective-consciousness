/**
 * FCC v4.4 - Zod Schema for FCC Metadata
 */

import { z } from 'zod';

export const ExtendedAgentOutputsSchema = z.object({
  riskHeatmap: z.any().optional(),
  feasibilityCurve: z.any().optional(),
  economicModel: z.any().optional(),
  repoIntel: z.any().optional(),
});

export const ExtendedAgentMetadataSchema = z.object({
  agentName: z.string(),
  executionTimeMs: z.number(),
  confidence: z.number().optional(),
}).passthrough();

export const FCCMetadataSchema = z.object({
  executionTimeMs: z.number().optional(),
  modelsUsed: z.array(z.string()).optional(),
  repoFilesScanned: z.number().optional(),
  timestamp: z.string().optional(),
  disagreementScore: z.number().min(0).max(100).optional(),
  selfCheckPassed: z.boolean().optional(),
  panelPipeline: z.boolean().optional(),
  visionAlignmentScore: z.number().min(0).max(100).optional(),
  extendedAgentOutputs: ExtendedAgentOutputsSchema.optional(),
  reportFormatVersion: z.string().optional(),
  adaptiveLayout: z.boolean().optional(),
  extendedAgents: z.array(ExtendedAgentMetadataSchema).optional(),
}).passthrough();

export type FCCMetadata = z.infer<typeof FCCMetadataSchema>;

