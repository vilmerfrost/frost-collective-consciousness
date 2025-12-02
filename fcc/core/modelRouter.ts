/**
 * FCC Model Router
 * 
 * Defines the panel of models and their roles for different FCC modes.
 * Abstracts model invocation behind interfaces for easy provider swapping.
 */

import { ModelConfig, ModelProvider, ModelRole, CostTier, FCCMode, RepoSnapshot } from './types';

/**
 * Model registry - centralized configuration for all available models
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  // 🧠 Lead thinker – DeepSeek R1 (replaces Kimi K2 Thinking)
  {
    id: 'deepseek-r1',
    label: 'DeepSeek R1',
    role: 'lead_thinker',
    provider: 'deepseek',
    enabled: true,
    costTier: 'high',
    providerModelName: 'deepseek-reasoner',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
  },
  
  // 🤖 DeepSeek V3.2 – reviewer
  {
    id: 'deepseek-v3.2',
    label: 'DeepSeek V3.2',
    role: 'reviewer',
    provider: 'deepseek',
    enabled: true,
    costTier: 'medium',
    // DeepSeek API uses model "deepseek-chat" (the version behind is V3.2)
    providerModelName: 'deepseek-chat',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
  },
  
  // ⚡ Gemini 2.0 Flash – fast summarization / sanity
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    role: 'speed',
    provider: 'gemini',
    enabled: true,
    costTier: 'low',
    // Model name is gemini-2.0-flash in Gemini API
    providerModelName: 'gemini-2.0-flash',
    apiKeyEnvVar: 'GEMINI_API_KEY',
  },
  
  // 🌐 Perplexity Sonar – research mode
  {
    id: 'perplexity-sonar-reasoning',
    label: 'Perplexity Sonar Reasoning',
    role: 'research',
    enabled: true, // or false if you want to run it only explicitly
    costTier: 'medium',
    provider: 'perplexity',
    // A good default for deep reasoning is sonar-reasoning or sonar-reasoning-pro
    providerModelName: 'sonar-reasoning',
    apiKeyEnvVar: 'PERPLEXITY_API_KEY',
  },
];

/**
 * Legacy export for backward compatibility
 */
export const MODEL_PANEL = MODEL_REGISTRY;

/**
 * Get model panel for a specific FCC mode
 */
export function getModelPanelForMode(mode: FCCMode): ModelConfig[] {
  const enabled = MODEL_REGISTRY.filter(m => m.enabled);
  
  switch (mode) {
    case 'pipeline_diagnosis':
      // Deep reasoning + code analysis
      return enabled.filter(m => 
        m.id === 'deepseek-r1' ||
        m.id === 'deepseek-v3.2' ||
        m.id === 'gemini-2.0-flash'
      );
    
    case 'agent_output_critique':
      // Code review + meta-analysis
      return enabled.filter(m => 
        m.id === 'deepseek-r1' ||
        m.id === 'deepseek-v3.2' ||
        m.id === 'gemini-2.0-flash'
      );
    
    case 'meta_prompt_architect':
      // Prompt design + reasoning
      return enabled.filter(m => 
        m.id === 'deepseek-r1' ||
        m.id === 'deepseek-v3.2' ||
        m.id === 'gemini-2.0-flash'
      );
    
    default:
      return enabled;
  }
}

/**
 * Get primary model for a mode (lead thinker)
 */
export function getPrimaryModel(mode: FCCMode): ModelConfig | undefined {
  const panel = getModelPanelForMode(mode);
  return panel.find(m => m.role === 'lead_thinker') || panel[0];
}

/**
 * Get lead thinker model for a specific mode with API key check
 */
export function getLeadThinkerForMode(mode: FCCMode): ModelConfig {
  const deepseekR1 = MODEL_REGISTRY.find(
    (m) => m.id === 'deepseek-r1' && m.role === 'lead_thinker'
  );
  
  if (!deepseekR1) {
    throw new Error('DeepSeek R1 not found in model registry');
  }
  
  // Check if API key is available
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-...' || process.env.DEEPSEEK_API_KEY.trim().length === 0) {
    // Fallback to DeepSeek V3.2 if R1 API key is missing
    const deepseekV32 = MODEL_REGISTRY.find(
      (m) => m.id === 'deepseek-v3.2' && m.role === 'reviewer'
    );
    if (deepseekV32) {
      return deepseekV32;
    }
    throw new Error('DEEPSEEK_API_KEY is not configured. DeepSeek R1 requires DEEPSEEK_API_KEY in .env.local');
  }
  
  return deepseekR1;
}

/**
 * Get reviewer model for a specific mode with API key check
 */
export function getReviewerForMode(mode: FCCMode): ModelConfig {
  const deepseek = MODEL_REGISTRY.find(
    (m) => m.id === 'deepseek-v3.2' && m.role === 'reviewer' && m.enabled
  );
  
  if (deepseek) {
    const apiKey = process.env[deepseek.apiKeyEnvVar || ''];
    if (apiKey && apiKey !== 'sk-...' && apiKey.trim().length > 0) {
      return deepseek;
    }
  }
  
  // Fallback to lead thinker if reviewer is unavailable
  return getLeadThinkerForMode(mode);
}

/**
 * Get speed layer (normalizer) model for a specific mode with API key check
 */
export function getSpeedLayerForMode(mode: FCCMode): ModelConfig {
  const gemini = MODEL_REGISTRY.find(
    (m) => m.id === 'gemini-2.0-flash' && m.role === 'speed' && m.enabled
  );
  
  if (gemini) {
    const apiKey = process.env[gemini.apiKeyEnvVar || ''];
    if (apiKey && apiKey !== 'sk-...' && apiKey.trim().length > 0) {
      return gemini;
    }
  }
  
  // Fallback to reviewer if speed layer is unavailable
  return getReviewerForMode(mode);
}

/**
 * Get reviewer models for a mode
 */
export function getReviewerModels(mode: FCCMode): ModelConfig[] {
  const panel = getModelPanelForMode(mode);
  return panel.filter(m => m.role === 'reviewer' || m.role === 'code_analyst');
}

/**
 * Get model by ID
 */
export function getModelById(id: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find(m => m.id === id);
}

/**
 * Route FCC question through model panel
 * 
 * This function is deprecated. Use runFCCQuery from fccEngine.ts instead.
 * Kept for backward compatibility.
 */
export async function routeFCCQuestion(
  prompt: string,
  systemPrompt: string,
  mode: FCCMode,
  repoSnapshot: RepoSnapshot,
  modelInvoker?: any
): Promise<string> {
  console.warn('[FCC ModelRouter] routeFCCQuestion is deprecated. Use runFCCQuery from fccEngine.ts instead.');
  
  const panel = getModelPanelForMode(mode);
  const primaryModel = getPrimaryModel(mode);
  
  if (!primaryModel) {
    throw new Error(`No enabled model found for mode: ${mode}`);
  }
  
  return `[DEPRECATED] Use runFCCQuery from fccEngine.ts instead.\nMode: ${mode}\nPrimary model: ${primaryModel.id}\nPrompt length: ${prompt.length} chars`;
}

/**
 * Build a fused prompt from context
 */
export function buildFCCPrompt(
  question: string,
  mode: FCCMode,
  repoSnapshot: RepoSnapshot,
  relatedFiles?: string[],
  logs?: string,
  stackTraces?: string,
  agentOutput?: string,
  currentPrompt?: string
): string {
  const repoSummary = `
=== REPOSITORY SNAPSHOT ===
Root: ${repoSnapshot.root}
Files scanned: ${repoSnapshot.files.length}
Scanned at: ${repoSnapshot.scannedAt}

File list (first 50):
${repoSnapshot.files.slice(0, 50).map(f => `  - ${f.path} (${f.isDirectory ? 'DIR' : `${f.size} bytes`})`).join('\n')}
${repoSnapshot.files.length > 50 ? `\n... and ${repoSnapshot.files.length - 50} more files` : ''}
`;

  let relatedFilesContent = '';
  if (relatedFiles && relatedFiles.length > 0) {
    relatedFilesContent = '\n=== RELATED FILES (FULL CONTENT) ===\n';
    for (const pattern of relatedFiles) {
      const matches = repoSnapshot.files.filter(f => 
        f.path.includes(pattern) || pattern.includes(f.path)
      );
      for (const file of matches.slice(0, 10)) { // Limit to 10 matches per pattern
        if (!file.isDirectory && file.content) {
          relatedFilesContent += `\n--- FILE: ${file.path} ---\n${file.content}\n`;
        }
      }
    }
  }

  let contextBlocks = '';
  if (logs) {
    contextBlocks += `\n=== LOGS ===\n${logs}\n`;
  }
  if (stackTraces) {
    contextBlocks += `\n=== STACK TRACES ===\n${stackTraces}\n`;
  }
  if (agentOutput) {
    contextBlocks += `\n=== AGENT OUTPUT ===\n${agentOutput}\n`;
  }
  if (currentPrompt) {
    contextBlocks += `\n=== CURRENT PROMPT ===\n${currentPrompt}\n`;
  }

  return `
${repoSummary}
${relatedFilesContent}
${contextBlocks}

=== USER QUESTION ===
${question}

=== MODE ===
${mode}

Remember:
- Base all findings on actual repo files (cite file paths).
- Clearly separate facts from inferences.
- List all assumptions explicitly.
- If something is NOT in the repo, say so clearly.
`.trim();
}

