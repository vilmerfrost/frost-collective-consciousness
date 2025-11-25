
export type AgentId = "NODE_ALPHA" | "NODE_BETA" | "NODE_OMEGA";

export type AgentRole = "ARCHITECT" | "VISIONARY" | "WARDEN";

export interface AgentProfile {
  id: AgentId;
  name: string;
  role: AgentRole;
  color: string;
  icon: string;
  description: string;
  systemInstruction: string;
}

export type ProposedActionTarget = 
  | "github" 
  | "supabase" 
  | "notion" 
  | "email" 
  | "log" 
  | "other";

export type ProposedActionType = 
  | "document" 
  | "config" 
  | "migration" 
  | "job" 
  | "webhook" 
  | "other";

export interface ProposedAction {
  id: string;
  type: ProposedActionType;
  target: ProposedActionTarget;
  shortDescription: string;
  priority: 1 | 2 | 3;
  requiredHumanConfirmation: boolean;
  // UI State fields
  status?: 'pending' | 'simulating' | 'executing' | 'success' | 'failed' | 'simulated';
  resultMessage?: string;
}

export interface MinorityReport {
  agent: string;
  title: string;
  details: string;
}

export interface FusedReport {
  id: string;
  query: string;
  confidence: number; // 0–100
  
  // Standardized Content Sections (7 Headers)
  overview: string;
  architectureAndIntegrations: string;
  keyFeaturesAndWorkflows: string;
  keyRisks: string;
  minorityReports: MinorityReport[];
  nextActionsForHuman: string;
  executiveSummary: string;
  
  // Cloud Actions (Only present in ACTION mode)
  proposedActions: ProposedAction[];
  
  // Metadata
  participatingAgents: AgentId[];
  mode: "analysis" | "action";
  createdAt: string; // ISO string
  meta: {
    executionTimeMs: number;
    model: string;
  };
}

export type ActionExecutionResult = {
  id: string;
  success: boolean;
  message: string;
};
