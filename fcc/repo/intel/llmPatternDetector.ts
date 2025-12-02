/**
 * FCC v4.4 - LLM Pattern Detector for Repo Intelligence
 */

import type { ModelInvoker } from '../../core/modelInvoker';
import type { RepoSnapshot } from '../../core/types';
import { getReviewerForMode } from '../../core/modelRouter';

interface RepoIntelligenceResult {
  architectureStyle: 'monolith' | 'modular' | 'agent-based' | 'pipeline' | 'microservices' | 'unknown';
  criticalFiles: Array<{ path: string; reason: string; priority: number }>;
  hotspots: Array<{ path: string; reason: string; impact: number }>;
  patterns: string[];
}

/**
 * Detect repository patterns using LLM analysis
 */
export async function detectRepoPatterns(
  repoSnapshot: RepoSnapshot,
  invoker: ModelInvoker,
  systemPrompt: string
): Promise<RepoIntelligenceResult> {
  const model = getReviewerForMode('pipeline_diagnosis');
  
  const repoSummary = `
Root: ${repoSnapshot.root}
Files: ${repoSnapshot.files.length}
File paths (first 50):
${repoSnapshot.files.slice(0, 50).map(f => f.path).join('\n')}
`;

  const prompt = `Analyze this repository structure and detect patterns:

${repoSummary}

Return JSON with:
{
  "architectureStyle": "monolith" | "modular" | "agent-based" | "pipeline" | "microservices" | "unknown",
  "criticalFiles": [
    { "path": "string", "reason": "string", "priority": 1-10 }
  ],
  "hotspots": [
    { "path": "string", "reason": "string", "impact": 1-10 }
  ],
  "patterns": ["string"]
}`;

  try {
    const result = await invoker.invoke({
      model,
      prompt,
      systemPrompt,
    });

    const jsonMatch = result.rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed as RepoIntelligenceResult;
    }
  } catch (error) {
    console.warn('[Repo Intel] LLM pattern detection failed:', error);
  }

  // Fallback analysis
  return {
    architectureStyle: detectArchitectureStyle(repoSnapshot),
    criticalFiles: detectCriticalFiles(repoSnapshot),
    hotspots: detectHotspots(repoSnapshot),
    patterns: [],
  };
}

function detectArchitectureStyle(repoSnapshot: RepoSnapshot): RepoIntelligenceResult['architectureStyle'] {
  const paths = repoSnapshot.files.map(f => f.path.toLowerCase());
  
  if (paths.some(p => p.includes('agent'))) return 'agent-based';
  if (paths.some(p => p.includes('pipeline') || p.includes('orchestrat'))) return 'pipeline';
  if (paths.some(p => p.includes('microservice') || p.includes('service/'))) return 'microservices';
  if (paths.some(p => p.includes('module') || p.includes('component'))) return 'modular';
  
  return 'unknown';
}

function detectCriticalFiles(repoSnapshot: RepoSnapshot): Array<{ path: string; reason: string; priority: number }> {
  const critical: Array<{ path: string; reason: string; priority: number }> = [];
  
  for (const file of repoSnapshot.files) {
    const path = file.path.toLowerCase();
    
    if (path.includes('orchestrat')) {
      critical.push({ path: file.path, reason: 'Core orchestration logic', priority: 10 });
    } else if (path.includes('agent') && path.includes('index')) {
      critical.push({ path: file.path, reason: 'Agent entry point', priority: 9 });
    } else if (path.includes('config')) {
      critical.push({ path: file.path, reason: 'Configuration file', priority: 8 });
    }
  }
  
  return critical;
}

function detectHotspots(repoSnapshot: RepoSnapshot): Array<{ path: string; reason: string; impact: number }> {
  const hotspots: Array<{ path: string; reason: string; impact: number }> = [];
  
  for (const file of repoSnapshot.files) {
    const path = file.path.toLowerCase();
    
    if (path.includes('api') || path.includes('route')) {
      hotspots.push({ path: file.path, reason: 'API endpoint - high traffic area', impact: 9 });
    } else if (path.includes('engine') || path.includes('core')) {
      hotspots.push({ path: file.path, reason: 'Core logic - frequent changes', impact: 8 });
    }
  }
  
  return hotspots;
}

