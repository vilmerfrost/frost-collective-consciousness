/**
 * FCC v1 Core Types
 * 
 * Type definitions for Frost Collective Consciousness v1
 * - Structured report format
 * - Question context
 * - Evidence and findings
 * - Model configuration
 */

export type FCCMode = "pipeline_diagnosis" | "agent_output_critique" | "meta_prompt_architect";

export type ImpactArea = 
  | "architecture" 
  | "performance" 
  | "scalability" 
  | "reliability" 
  | "security" 
  | "ux" 
  | "devx" 
  | "unknown";

export type DifficultyLevel = "low" | "medium" | "high";

export interface FCCQuestionContext {
  mode: FCCMode;
  question: string;
  relatedFiles?: string[]; // glob patterns or explicit paths
  logs?: string;
  stackTraces?: string;
  agentName?: string;
  agentOutput?: string;
  currentPrompt?: string;
  desiredBehavior?: string;
  failingStage?: string;
  extra?: Record<string, any>;
  adaptiveLayout?: boolean; // v4.3: If true, output natural text instead of structured JSON
}

export interface FCCEvidence {
  filePath: string;
  snippet: string;
  reasoning: string;
  lineNumbers?: { start: number; end: number };
}

export interface FCCFinding {
  id: string;
  title: string;
  description: string;
  evidence: FCCEvidence[];
  severity: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  impactArea: ImpactArea;
  confidence?: number; // 0-100, optional
}

export interface FCCRecommendation {
  id: string;
  title: string;
  description: string;
  expectedImpact: string;
  difficulty: DifficultyLevel;
  relatedFindings?: string[]; // IDs of related findings
  priority?: number; // 1-10, optional
  roiEstimate?: string; // Optional ROI estimate
  architecturalSeverity?: number; // 1-10, architectural impact severity
  reliabilitySeverity?: number; // 1-10, reliability impact severity
  costImpact?: string; // Cost impact (estimated $ or resource hours)
  complexity?: DifficultyLevel; // Complexity score (low/medium/high)
  operationalOverhead?: string; // Operational overhead description
  technicalAlignmentScore?: number; // 0-10, how well this aligns with technical architecture goals (v4.2)
}

export interface FCCReport {
  mode: FCCMode;
  question: string;
  summary: string;
  assumptions: string[];
  findings: FCCFinding[];
  recommendations: FCCRecommendation[];
  overallRiskScore: number; // 0-100
  confidence: number; // 0-100
  notes?: string;
  adaptiveText?: string; // v4.3: Natural language output when adaptiveLayout=true
  metadata?: {
    executionTimeMs?: number;
    modelsUsed?: string[];
    repoFilesScanned?: number;
    timestamp?: string;
    disagreementScore?: number; // 0-100, based on LT/RV divergence
    selfCheckPassed?: boolean; // true if all self-checks passed
    panelPipeline?: boolean; // true if used 3-stage panel
    visionAlignmentScore?: number; // 0-100, average vision alignment across recommendations (v2.1)
    extendedAgentOutputs?: {
      riskHeatmap?: any;
      feasibilityCurve?: any;
      economicModel?: any;
    };
    reportFormatVersion?: string; // v4.1, v4.2, or v4.3
    adaptiveLayout?: boolean; // v4.3: Indicates adaptive layout mode was used
    extendedAgents?: ExtendedAgentMetadata; // Extended agent panel outputs (v3.0) - legacy
  };
}

/**
 * Main function type for running FCC queries
 */
export type RunFCCQuery = (ctx: FCCQuestionContext) => Promise<FCCReport>;

/**
 * Model provider types
 */
export type ModelProvider = 
  | "moonshot" 
  | "deepseek" 
  | "gemini" 
  | "perplexity";

export type ModelRole = 
  | "lead_thinker" 
  | "long_context"
  | "reviewer" 
  | "speed" 
  | "code_analyst"
  | "research";

export type CostTier = "high" | "medium" | "low";

export interface ModelConfig {
  id: string;
  label: string; // Human-friendly name
  role: ModelRole;
  provider: ModelProvider;
  enabled: boolean;
  costTier: CostTier;
  modelName?: string; // Legacy: e.g., "kimi-k2-thinking", "deepseek-r1"
  providerModelName?: string; // Provider-specific model name, e.g., "deepseek-chat-v3.2"
  apiKeyEnvVar?: string; // e.g., "MOONSHOT_API_KEY"
}

/**
 * Repository snapshot types
 */
export interface RepoFileSummary {
  path: string;
  size: number;
  content?: string; // Full content if loaded, undefined if not loaded yet
  isDirectory: boolean;
  lastModified?: string;
}

export interface RepoSnapshot {
  root: string;
  files: RepoFileSummary[];
  scannedAt: string;
}

/**
 * Panel draft types for collaborative 3-step panel workflow
 */
export interface PanelDraftBase {
  mode: FCCMode;
  rawText: string;
  parsedReport?: FCCReport;
  modelId: string;
  notes?: string[];
}

export interface LeadDraft extends PanelDraftBase {
  stage: "lead";
}

export interface ReviewDraft extends PanelDraftBase {
  stage: "review";
  issuesFound?: Array<{
    id: string;
    severity: number;
    description: string;
  }>;
}

export interface SynthDraft extends PanelDraftBase {
  stage: "synth";
}

/**
 * Review output from reviewer stage
 */
export interface ReviewOutput {
  reviewSummary: string;
  issues: Array<{
    id: string;
    severity: number;
    description: string;
  }>;
  patch: FCCReport | null;
}

/**
 * Extended Agent Panel types (v3.0)
 */
export interface RiskHeatmap {
  timeWindows: Array<{
    period: string;
    risks: Array<{
      id: string;
      title: string;
      category: 'technical' | 'operational' | 'resource' | 'external';
      probability: number;
      severity: number;
      impact: string;
      mitigation: string;
      dependencies?: string[];
      founderFeasibility: 'feasible' | 'challenging' | 'unrealistic';
    }>;
    compositeRiskScore: number;
  }>;
  criticalWindows: string[];
  recommendedInterventions: Array<{
    timeWindow: string;
    actions: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

export interface RiskForecastOutput {
  riskHeatmap: RiskHeatmap;
  riskSummary: string;
  confidence: number;
}

export interface FeasibilityAnalysis {
  recommendations: Array<{
    recommendationId: string;
    feasibilityScores: {
      founderFeasibility: number;
      energyAlignment: number;
      timeAvailability: number;
      stressTolerance: number;
      overallFeasibility: number;
    };
    requirements: {
      focusMinutes: number;
      contextSwitches: number;
      learningCurve: 'low' | 'medium' | 'high';
      highEnergyDays: boolean;
      lowEnergyDays: boolean;
    };
    blockers: string[];
    alternative: string | null;
    sequencing: string | null;
  }>;
  unrealistic: Array<{
    recommendationId: string;
    reason: string;
    alternative: string;
  }>;
  recommendedSequence: string[];
  estimatedTimeline: string;
}

export interface FeasibilityAnalysisOutput {
  feasibilityAnalysis: FeasibilityAnalysis;
  summary: string;
  confidence: number;
}

export interface EconomicAnalysis {
  currentCosts: {
    perQuery: {
      leadThinker: number;
      reviewer: number;
      synthesizer: number;
      total: number;
    };
    monthlyEstimate: {
      queries: number;
      totalCost: number;
      currency: string;
    };
  };
  recommendations: Array<{
    type: string;
    description: string;
    costSavings: string;
    performanceImpact: string;
    implementation: string;
  }>;
  optimizedRouting: {
    simpleQueries: {
      leadThinker: string;
      reviewer: string;
      synthesizer: string;
      estimatedCost: number;
    };
    complexQueries: {
      leadThinker: string;
      reviewer: string;
      synthesizer: string;
      estimatedCost: number;
    };
  };
  costReduction: {
    monthlySavings: number;
    percentage: string;
    annualProjection: number;
  };
}

export interface EconomicAnalysisOutput {
  economicAnalysis: EconomicAnalysis;
  summary: string;
  confidence: number;
}

export interface ExtendedAgentMetadata {
  riskForecast?: RiskForecastOutput;
  feasibilityAnalysis?: FeasibilityAnalysisOutput;
  economicAnalysis?: EconomicAnalysisOutput;
  extendedAgentsUsed?: string[];
}

