export interface FCCNodeResponse {
  nodeId: string;
  name: string;
  response: string;
  error?: string;
  executionTimeMs: number;
}

export interface FCCConsensus {
  summary: string;
  decision: string;
  reasoning: {
    alpha: string;
    beta: string;
    omega: string;
  };
  recommendedAction: string;
  confidence: number;
  critique?: string;
}

export interface FCCResult {
  consensus: FCCConsensus;
  nodes: FCCNodeResponse[];
  evaluation: {
    totalExecutionTimeMs: number;
    allNodesSuccess: boolean;
  };
}

export interface FCCNodeConfig {
  name: string;
  weight: number;
  client: (input: string, systemPrompt?: string) => Promise<string>;
}

