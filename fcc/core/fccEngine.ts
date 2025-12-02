/**
 * FCC Engine
 * 
 * Main orchestration engine for Frost Collective Consciousness v1.
 * Coordinates repo scanning, prompt building, model routing, and report parsing.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  FCCQuestionContext,
  FCCReport,
  FCCFinding,
  FCCRecommendation,
  RunFCCQuery,
  FCCMode,
  LeadDraft,
  ReviewDraft,
  SynthDraft,
  ReviewOutput,
  RepoSnapshot,
} from './types';
import {
  buildRepoSnapshot,
  loadRelatedFiles,
  getRepoSummary,
  mergeRepoSnapshots,
} from './repoScanner';
import {
  getModelPanelForMode,
  getLeadThinkerForMode,
  getReviewerForMode,
  getSpeedLayerForMode,
  buildFCCPrompt,
  getPrimaryModel,
} from './modelRouter';
import { modelInvoker, type ModelInvoker } from './modelInvoker';
import { loadExternalGitRepo } from '../utils/gitLoader';

/**
 * Load prompt template from file
 */
function loadPromptTemplate(templatePath: string): string {
  try {
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.warn(`[FCC Engine] Cannot load prompt template: ${templatePath}`, error);
    return `[Template not found: ${templatePath}]`;
  }
}

/**
 * Get prompt template path for a mode
 */
function getModePromptPath(mode: string, repoRoot?: string): string {
  // Use repo root if provided, otherwise use process.cwd() (works in Next.js API routes)
  const root = repoRoot || process.cwd();
  const fccRoot = path.join(root, 'fcc');
  return path.join(fccRoot, 'prompts', 'modes', `${mode}.md`);
}

/**
 * Get system prompt path
 */
function getSystemPromptPath(repoRoot?: string): string {
  // Use repo root if provided, otherwise use process.cwd() (works in Next.js API routes)
  const root = repoRoot || process.cwd();
  const fccRoot = path.join(root, 'fcc');
  return path.join(fccRoot, 'prompts', 'system', 'fcc_system_prompt.md');
}

/**
 * Get agent prompt path for extended agents
 */
function getAgentPromptPath(agentName: string, repoRoot?: string): string {
  const root = repoRoot || process.cwd();
  const fccRoot = path.join(root, 'fcc');
  return path.join(fccRoot, 'prompts', 'agents', `${agentName}.md`);
}

/**
 * Run Risk Forecaster Extended Agent
 */
async function runRiskForecasterAgent(
  ctx: {
    question: string;
    repoSnapshot: RepoSnapshot;
    leadDraft: FCCReport | null;
    systemPrompt: string;
    repoRoot?: string;
  },
  invoker: ModelInvoker
): Promise<any> {
  try {
    console.log(`[FCC Engine] Invoking Risk Forecaster Agent...`);
    
    const agentPromptTemplate = loadPromptTemplate(getAgentPromptPath('risk_forecaster', ctx.repoRoot));
    const repoSummary = getRepoSummary(ctx.repoSnapshot);
    
    const riskPrompt = `You are the Risk Forecaster Agent in the FCC Extended Panel.

${ctx.systemPrompt}

${agentPromptTemplate}

=== CONTEXT ===
Question: ${ctx.question}
Repository: ${ctx.repoSnapshot.root}
Files scanned: ${repoSummary.totalFiles}

=== LEAD THINKER FINDINGS ===
${ctx.leadDraft ? JSON.stringify(ctx.leadDraft.findings || [], null, 2) : 'No findings yet'}

=== YOUR TASK ===
Analyze temporal risk patterns and forecast when failures are likely to occur.
Return ONLY a valid JSON object with riskHeatmap structure as specified in your prompt template.

Output format:
{
  "riskHeatmap": { ... },
  "riskSummary": "string",
  "confidence": 0-100
}

Return ONLY the JSON object. No markdown, no commentary.`;

    const result = await invoker.invoke({
      model: getReviewerForMode('pipeline_diagnosis'), // Use reviewer model for extended agents
      prompt: riskPrompt,
      systemPrompt: ctx.systemPrompt,
    });
    
    // Parse JSON response
    try {
      const jsonMatch = result.rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[FCC Engine] Risk Forecaster completed successfully`);
        return parsed.riskHeatmap || parsed;
      }
    } catch (parseError) {
      console.warn(`[FCC Engine] Risk Forecaster parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    return null;
  } catch (error) {
    console.warn(`[FCC Engine] Risk Forecaster failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Run Feasibility Analyst Extended Agent
 */
async function runFeasibilityAnalystAgent(
  ctx: {
    question: string;
    repoSnapshot: RepoSnapshot;
    recommendations: FCCRecommendation[];
    systemPrompt: string;
    repoRoot?: string;
  },
  invoker: ModelInvoker
): Promise<any> {
  try {
    console.log(`[FCC Engine] Invoking Feasibility Analyst Agent...`);
    
    const agentPromptTemplate = loadPromptTemplate(getAgentPromptPath('feasibility_analyst', ctx.repoRoot));
    const repoSummary = getRepoSummary(ctx.repoSnapshot);
    
    const feasibilityPrompt = `You are the Feasibility Analyst Agent in the FCC Extended Panel.

${ctx.systemPrompt}

${agentPromptTemplate}

=== CONTEXT ===
Question: ${ctx.question}
Repository: ${ctx.repoSnapshot.root}
Files scanned: ${repoSummary.totalFiles}

=== RECOMMENDATIONS TO EVALUATE ===
${JSON.stringify(ctx.recommendations || [], null, 2)}

=== YOUR TASK ===
Evaluate whether recommendations are realistically achievable given founder constraints.
Return ONLY a valid JSON object with feasibilityAnalysis structure as specified in your prompt template.

Output format:
{
  "feasibilityAnalysis": { ... },
  "summary": "string",
  "confidence": 0-100
}

Return ONLY the JSON object. No markdown, no commentary.`;

    const result = await invoker.invoke({
      model: getReviewerForMode('pipeline_diagnosis'), // Use reviewer model for extended agents
      prompt: feasibilityPrompt,
      systemPrompt: ctx.systemPrompt,
    });
    
    // Parse JSON response
    try {
      const jsonMatch = result.rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[FCC Engine] Feasibility Analyst completed successfully`);
        return parsed.feasibilityAnalysis || parsed;
      }
    } catch (parseError) {
      console.warn(`[FCC Engine] Feasibility Analyst parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    return null;
  } catch (error) {
    console.warn(`[FCC Engine] Feasibility Analyst failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Run Economic Optimizer Extended Agent
 */
async function runEconomicOptimizerAgent(
  ctx: {
    question: string;
    repoSnapshot: RepoSnapshot;
    systemPrompt: string;
    repoRoot?: string;
  },
  invoker: ModelInvoker
): Promise<any> {
  try {
    console.log(`[FCC Engine] Invoking Economic Optimizer Agent...`);
    
    const agentPromptTemplate = loadPromptTemplate(getAgentPromptPath('economic_optimizer', ctx.repoRoot));
    const repoSummary = getRepoSummary(ctx.repoSnapshot);
    
    const economicPrompt = `You are the Economic Optimizer Agent in the FCC Extended Panel.

${ctx.systemPrompt}

${agentPromptTemplate}

=== CONTEXT ===
Question: ${ctx.question}
Repository: ${ctx.repoSnapshot.root}
Files scanned: ${repoSummary.totalFiles}

=== YOUR TASK ===
Compute API cost projections and recommend model routing configurations.
Return ONLY a valid JSON object with economicAnalysis structure as specified in your prompt template.

Output format:
{
  "economicAnalysis": { ... },
  "summary": "string",
  "confidence": 0-100
}

Return ONLY the JSON object. No markdown, no commentary.`;

    const result = await invoker.invoke({
      model: getReviewerForMode('pipeline_diagnosis'), // Use reviewer model for extended agents
      prompt: economicPrompt,
      systemPrompt: ctx.systemPrompt,
    });
    
    // Parse JSON response
    try {
      const jsonMatch = result.rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[FCC Engine] Economic Optimizer completed successfully`);
        return parsed.economicAnalysis || parsed;
      }
    } catch (parseError) {
      console.warn(`[FCC Engine] Economic Optimizer parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    return null;
  } catch (error) {
    console.warn(`[FCC Engine] Economic Optimizer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Helper function to verify file path exists in repository
 */
function verifyFilePath(filePath: string, repoSnapshot: RepoSnapshot, externalRepoPath?: string | null): boolean {
  // Extract just the file path (remove line numbers like "file.ts:20-50")
  const cleanPath = filePath.split(':')[0];
  
  // Check if this is an external repo path
  if (cleanPath.startsWith('[EXTERNAL:')) {
    // External repo paths are prefixed with [EXTERNAL:repoName]/
    // They should already exist in the merged snapshot, so check normally
    return repoSnapshot.files.some(f => 
      f.path === cleanPath || 
      f.path.endsWith(cleanPath) ||
      cleanPath.endsWith(f.path)
    );
  }
  
  // For normal paths, also check external repo if available
  if (externalRepoPath && cleanPath.startsWith(externalRepoPath)) {
    // Path references external repo directly
    const fs = require('fs');
    if (fs.existsSync(cleanPath)) {
      return true;
    }
  }
  
  // Check if file exists in repository
  return repoSnapshot.files.some(f => 
    f.path === cleanPath || 
    f.path.endsWith(cleanPath) ||
    cleanPath.endsWith(f.path)
  );
}

/**
 * Helper function to normalize a parsed report into FCCReport format
 * Includes anti-hallucination checks for file paths
 */
function normalizeParsedReport(
  parsed: any,
  ctx: FCCQuestionContext,
  repoSnapshot: RepoSnapshot
): FCCReport {
  // Anti-hallucination check: verify file paths in evidence
  let hallucinationCount = 0;
  const verifiedFindings = Array.isArray(parsed.findings)
    ? parsed.findings.map((f: any) => {
        const verifiedEvidence = Array.isArray(f.evidence)
          ? f.evidence.map((ev: any) => {
              const filePath = ev.filePath || ev.file || '';
              if (filePath && repoSnapshot.files.length > 0) {
                const exists = verifyFilePath(filePath, repoSnapshot);
                if (!exists) {
                  hallucinationCount++;
                  // Mark as not verified but keep it
                  return {
                    ...ev,
                    filePath: filePath,
                    reasoning: (ev.reasoning || '') + ' [NOT VERIFIED IN REPOSITORY]',
                  };
                }
              }
              return ev;
            })
          : [];
        
        return {
          id: f.id || `finding-${Math.random().toString(36).substr(2, 9)}`,
          title: f.title || 'Finding',
          description: f.description || '',
          evidence: verifiedEvidence,
          severity: (f.severity >= 1 && f.severity <= 10 ? f.severity : 5) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
          impactArea: f.impactArea || 'unknown',
          confidence: f.confidence,
        };
      })
    : [];

  // Check if evidenceMode should be NO_REPO_MODE
  const evidenceMode = repoSnapshot.files.length === 0 ? 'NO_REPO_MODE' : 'ON';
  
  // Calculate self-check status
  const selfCheckPassed = hallucinationCount === 0 && 
    parsed.summary && 
    Array.isArray(parsed.findings) && 
    Array.isArray(parsed.recommendations);

  return {
    mode: parsed.mode || ctx.mode,
    question: parsed.question || ctx.question,
    summary: parsed.summary || '',
    assumptions: Array.isArray(parsed.assumptions) 
      ? parsed.assumptions.map((a: any) => typeof a === 'string' ? a : a.assumption || a.reasoning || String(a))
      : [],
    findings: verifiedFindings,
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r: any) => ({
          id: r.id || `rec-${Math.random().toString(36).substr(2, 9)}`,
          title: r.title || 'Recommendation',
          description: r.description || '',
          expectedImpact: r.expectedImpact || 'TBD',
          difficulty: r.difficulty || 'medium',
          relatedFindings: Array.isArray(r.relatedFindings) ? r.relatedFindings : undefined,
          priority: r.priority,
          roiEstimate: r.roiEstimate,
          founderFeasibilityScore: r.founderFeasibilityScore,
          requiredFocusMinutes: r.requiredFocusMinutes,
          contextSwitchingImpact: r.contextSwitchingImpact,
          emotionalLoadImpact: r.emotionalLoadImpact,
          costImpact: r.costImpact,
        }))
      : [],
    overallRiskScore: typeof parsed.overallRiskScore === 'number' ? Math.min(100, Math.max(0, parsed.overallRiskScore)) : 50,
    confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
    notes: parsed.notes || (hallucinationCount > 0 ? `[WARNING: ${hallucinationCount} file path(s) not verified in repository]` : undefined),
    metadata: {
      ...parsed.metadata,
      repoFilesScanned: repoSnapshot.files.length,
      timestamp: parsed.metadata?.timestamp || new Date().toISOString(),
      disagreementScore: parsed.metadata?.disagreementScore,
      selfCheckPassed: parsed.metadata?.selfCheckPassed !== undefined ? parsed.metadata.selfCheckPassed : selfCheckPassed,
    },
  };
}

/**
 * Parse model output into structured FCCReport
 * 
 * This is a basic parser. In production, you might want to:
 * - Use structured output from models (JSON mode)
 * - Implement more robust parsing with fallbacks
 * - Add validation
 */
function parseFCCReport(
  rawOutput: string,
  ctx: FCCQuestionContext,
  repoSnapshot: any
): FCCReport {
  // JSON "soft parsing" - try strict JSON first, then regex extraction, then fallback
  const report: FCCReport = {
    mode: ctx.mode,
    question: ctx.question,
    summary: '',
    assumptions: [],
    findings: [],
    recommendations: [],
    overallRiskScore: 50,
    confidence: 70,
    notes: '',
    metadata: {
      repoFilesScanned: repoSnapshot.files.length,
      timestamp: new Date().toISOString(),
    },
  };

  // Step 1: Try strict JSON parsing
  try {
    const strictJson = JSON.parse(rawOutput.trim());
    if (strictJson.mode && (strictJson.findings || strictJson.recommendations)) {
      // Looks like a valid FCCReport - normalize it
      return normalizeParsedReport(strictJson, ctx, repoSnapshot);
    }
  } catch (e) {
    // Not strict JSON, continue with regex extraction
  }

  // Step 2: Try to extract JSON with regex (handle code fences, markdown, etc.)
  try {
    // Look for JSON objects in code fences
    const jsonInFences = rawOutput.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonInFences) {
      try {
        const parsed = JSON.parse(jsonInFences[1]);
        if (parsed.mode && (parsed.findings || parsed.recommendations)) {
          return normalizeParsedReport(parsed, ctx, repoSnapshot);
        }
      } catch (e) {
        // JSON parsing failed, continue
      }
    }

    // Look for largest JSON object block in the text
    const jsonMatches = rawOutput.match(/\{[\s\S]*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      // Try the largest match first (most likely to be complete)
      const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
      for (const jsonStr of sortedMatches) {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.mode && (parsed.findings || parsed.recommendations || parsed.summary)) {
            return normalizeParsedReport(parsed, ctx, repoSnapshot);
          }
        } catch (e) {
          // This JSON block failed, try next
          continue;
        }
      }
    }
  } catch (e) {
    // JSON extraction failed, continue with markdown parsing
  }

  // Step 3: Fallback to markdown parsing (existing logic)

  // Extract summary (look for "## Summary" or similar)
  const summaryMatch = rawOutput.match(/(?:##\s*)?summary[:\n]+([\s\S]*?)(?=\n##|\n#|$)/i);
  if (summaryMatch) {
    report.summary = summaryMatch[1].trim();
  } else {
    // Fallback: use first paragraph or default message
    const firstPara = rawOutput.split('\n\n')[0]?.trim();
    report.summary = firstPara || 'FCC Execution Completed (unstructured model output)';
  }

  // Extract assumptions (look for "## Assumptions" or bullet list)
  const assumptionsMatch = rawOutput.match(/(?:##\s*)?assumptions?[:\n]+([\s\S]*?)(?=\n##|\n#|$)/i);
  if (assumptionsMatch) {
    const assumptionsText = assumptionsMatch[1];
    report.assumptions = assumptionsText
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  // Extract findings (look for "## Findings" or numbered/bulleted list)
  const findingsMatch = rawOutput.match(/(?:##\s*)?findings?[:\n]+([\s\S]*?)(?=\n##\s*(?:recommendations?|summary|$))/i);
  if (findingsMatch) {
    // Simple extraction - enhance based on your needs
    const findingsText = findingsMatch[1];
    const findingBlocks = findingsText.split(/\n(?=\d+\.|\*|\-)/);
    
    let findingId = 1;
    for (const block of findingBlocks.slice(0, 20)) { // Limit to 20 findings
      const titleMatch = block.match(/(?:^\d+\.\s*|\*\s*|-\s*)(.+?)(?:\n|$)/);
      const descMatch = block.match(/\n([\s\S]+?)(?:\n(?:severity|impact|evidence)|$)/);
      
      if (titleMatch || descMatch) {
        report.findings.push({
          id: `finding-${findingId++}`,
          title: titleMatch ? titleMatch[1].trim() : 'Finding',
          description: descMatch ? descMatch[1].trim() : block.trim(),
          evidence: [],
          severity: 5 as const,
          impactArea: 'unknown',
        });
      }
    }
  }

  // Extract recommendations
  const recsMatch = rawOutput.match(/(?:##\s*)?recommendations?[:\n]+([\s\S]*?)(?=\n##|\n#|$)/i);
  if (recsMatch) {
    const recsText = recsMatch[1];
    const recBlocks = recsText.split(/\n(?=\d+\.|\*|\-)/);
    
    let recId = 1;
    for (const block of recBlocks.slice(0, 15)) { // Limit to 15 recommendations
      const titleMatch = block.match(/(?:^\d+\.\s*|\*\s*|-\s*)(.+?)(?:\n|$)/);
      
      if (titleMatch) {
        report.recommendations.push({
          id: `rec-${recId++}`,
          title: titleMatch[1].trim(),
          description: block.trim(),
          expectedImpact: 'TBD',
          difficulty: 'medium',
        });
      }
    }
  }

  // Extract risk score (look for "risk score" or "risk: X")
  const riskMatch = rawOutput.match(/(?:overall\s*)?risk\s*score[:\s]*(\d+)/i);
  if (riskMatch) {
    report.overallRiskScore = Math.min(100, Math.max(0, parseInt(riskMatch[1], 10)));
  }

  // Extract confidence
  const confMatch = rawOutput.match(/confidence[:\s]*(\d+)/i);
  if (confMatch) {
    report.confidence = Math.min(100, Math.max(0, parseInt(confMatch[1], 10)));
  }

  // If parsing failed badly, construct minimal report (NEVER throw)
  if (report.findings.length === 0 && report.recommendations.length === 0 && !report.summary) {
    report.summary = 'FCC execution failed: Report Parsing Incomplete';
    report.findings.push({
      id: 'parsing-error',
      title: 'Report Parsing Incomplete',
      description: 'The model output could not be fully parsed into structured findings. Raw output may need manual review.',
      evidence: [],
      severity: 8,
      impactArea: 'unknown',
      confidence: 30,
    });
    report.confidence = 30;
    report.overallRiskScore = 50;
    report.notes = `Parsing failed. Raw output (first 500 chars): ${rawOutput.substring(0, 500)}...`;
  }
  
  // Ensure summary is always set
  if (!report.summary || report.summary.trim().length === 0) {
    report.summary = 'FCC Execution Completed (unstructured model output)';
  }

  return report;
}

/**
 * Build prompt for LEAD THINKER stage
 */
function buildLeadPrompt(
  systemPrompt: string,
  modePrompt: string,
  question: string,
  repoSnapshot: RepoSnapshot,
  ctx: FCCQuestionContext
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
  if (ctx.relatedFiles && ctx.relatedFiles.length > 0) {
    relatedFilesContent = '\n=== RELATED FILES (FULL CONTENT) ===\n';
    for (const pattern of ctx.relatedFiles) {
      const matches = repoSnapshot.files.filter(f => 
        f.path.includes(pattern) || pattern.includes(f.path)
      );
      for (const file of matches.slice(0, 10)) {
        if (!file.isDirectory && file.content) {
          relatedFilesContent += `\n--- FILE: ${file.path} ---\n${file.content}\n`;
        }
      }
    }
  }

  let contextBlocks = '';
  if (ctx.logs) contextBlocks += `\n=== LOGS ===\n${ctx.logs}\n`;
  if (ctx.stackTraces) contextBlocks += `\n=== STACK TRACES ===\n${ctx.stackTraces}\n`;
  if (ctx.agentOutput) contextBlocks += `\n=== AGENT OUTPUT ===\n${ctx.agentOutput}\n`;
  if (ctx.currentPrompt) contextBlocks += `\n=== CURRENT PROMPT ===\n${ctx.currentPrompt}\n`;

  return `You are LEAD THINKER (LT) in the FCC 3-model panel.

${systemPrompt}

=== MODE-SPECIFIC INSTRUCTIONS ===
${modePrompt}

=== YOUR ROLE ===
You are the FIRST stage in a collaborative panel. Your output will be reviewed by DeepSeek V3.2 (Reviewer) and then synthesized by Gemini Flash 2.0 (Synthesizer).

Your job:
- Do deep reasoning
- Take a strong position (BRUTAL MODE: choose A or B, never neutral)
- Identify risks, contradictions, causal structures
- Produce harsh findings with evidence
- Generate 6–15 findings with severity 1–10

=== REPOSITORY CONTEXT ===
${repoSummary}
${relatedFilesContent}

${contextBlocks}

=== USER QUESTION ===
${question}

=== MODE ===
${ctx.mode}

=== BRUTAL MODE RULES ===
- Always choose a side (never "it depends")
- Always criticize weak logic
- State confidence as % (0-100)
- State risk 0–100
- ALWAYS cite file paths with line numbers for every claim
- NEVER invent files or APIs
- If unsure: write "NOT VERIFIED IN REPOSITORY"

=== FOUNDER CONSTRAINTS ===
Account for:
- Founder is 16
- Focus time: 2–4h/day
- ADHD/bipolar energy swings
- Zero employees
- School hours
- Solo-founder stress load
- Budget constraints

=== SELF-CHECK BEFORE OUTPUT (MANDATORY) ===
Before returning, verify:
- [ ] All file paths in evidence exist in repository
- [ ] All code snippets are accurate quotes
- [ ] No invented files/APIs/functions
- [ ] summary is 2–4 sentences with clear thesis
- [ ] assumptions is an array
- [ ] findings is an array with required fields
- [ ] recommendations is an array with required fields
- [ ] overallRiskScore is 0–100
- [ ] confidence is 0–100

If any check fails, regenerate the report.

=== OUTPUT REQUIREMENTS ===
You MUST output ONLY valid FCCReport JSON. No markdown, no commentary, no code fences.

{
  "mode": "${ctx.mode}",
  "question": "${question}",
  "summary": "2–4 sentences. Clear thesis. Choose A or B.",
  "assumptions": [
    "Assumption with reasoning",
    "Assumption with reasoning"
  ],
  "findings": [
    {
      "id": "string",
      "title": "Short title",
      "severity": 1,
      "impactArea": "architecture/reliability/scalability/cost/founder-stress/etc",
      "description": "Clear, harsh explanation",
      "evidence": [
        {
          "filePath": "file.ts:20-50",
          "snippet": "code or reasoning",
          "reasoning": "why this is evidence"
        }
      ],
      "confidence": 0
    }
  ],
  "recommendations": [
    {
      "id": "string",
      "title": "Clear and actionable",
      "difficulty": "low/medium/high",
      "expectedImpact": "string",
      "roiEstimate": "string",
      "description": "exact steps to fix",
      "founderFeasibilityScore": 1,
      "requiredFocusMinutes": 0,
      "contextSwitchingImpact": "string",
      "emotionalLoadImpact": "string",
      "costImpact": "string"
    }
  ],
  "overallRiskScore": 0,
  "confidence": 0
}

Return ONLY the JSON object.`.trim();
}

/**
 * Build prompt for REVIEWER stage
 */
function buildReviewerPrompt(
  systemPrompt: string,
  modePrompt: string,
  question: string,
  repoSnapshot: RepoSnapshot,
  ctx: FCCQuestionContext,
  leadDraft: string
): string {
  const repoSummary = `
=== REPOSITORY SNAPSHOT ===
Root: ${repoSnapshot.root}
Files scanned: ${repoSnapshot.files.length}
`;

  return `You are REVIEWER (RV) in the FCC 3-model panel.

${systemPrompt}

=== MODE-SPECIFIC INSTRUCTIONS ===
${modePrompt}

=== YOUR ROLE ===
You are the SECOND stage. A Lead Thinker (DeepSeek R1) has produced a draft FCCReport. Your job is to critique it and suggest improvements.

Your responsibilities:
- Attack LT's logic
- Find hallucinations
- Repair logic errors
- Expose hidden flaws
- Add missing evidence
- Strengthen reasoning
- Fix contradictions
- Patch hallucinations

=== ORIGINAL QUESTION ===
${question}

=== MODE ===
${ctx.mode}

=== REPOSITORY CONTEXT ===
${repoSummary}

=== LEAD THINKER DRAFT (FCCReport JSON) ===
${leadDraft}

=== YOUR JOB ===
1. Identify weaknesses in the draft:
   - Missing evidence (must cite file paths with line numbers)
   - Unclear reasoning
   - Incomplete findings
   - Hallucinations (invented files/APIs)
   - Weak conclusions
   - Contradictions

2. Verify all file references exist in the repository

3. Add missing risks and findings

4. Produce a review with:
   - Review summary
   - List of issues found (with severity 1-10)
   - Optionally, a patched FCCReport

=== SELF-CHECK BEFORE OUTPUT (MANDATORY) ===
Before returning, verify:
- [ ] All file paths in LT draft exist in repository
- [ ] All code snippets are accurate
- [ ] No invented APIs or functions referenced
- [ ] All issues have severity 1–10
- [ ] Review summary is clear and actionable

If any check fails, regenerate the review.

=== OUTPUT FORMAT (strict JSON) ===
{
  "reviewSummary": "string",
  "issues": [
    {
      "id": "string",
      "severity": 1,
      "description": "string"
    }
  ],
  "patch": FCCReport | null
}

Return ONLY the JSON object. No markdown, no commentary.`.trim();
}

/**
 * Build prompt for SYNTHESIZER stage
 */
function buildSynthesizerPrompt(
  systemPrompt: string,
  modePrompt: string,
  question: string,
  repoSnapshot: RepoSnapshot,
  ctx: FCCQuestionContext,
  leadDraft: string,
  reviewerDraft: string
): string {
  const repoSummary = `
=== REPOSITORY SNAPSHOT ===
Root: ${repoSnapshot.root}
Files scanned: ${repoSnapshot.files.length}
`;

  return `You are SYNTHESIZER (SZ) in the FCC 3-model panel.

${systemPrompt}

=== MODE-SPECIFIC INSTRUCTIONS ===
${modePrompt}

=== YOUR ROLE ===
You are the FINAL stage. You receive:
1. The original question
2. The lead draft (FCCReport from DeepSeek R1)
3. The review (with issues and optional patch from DeepSeek V3.2)

Your responsibilities:
- Combine LT + RV drafts
- Remove contradictions
- Produce clean summary
- Structure into FCCReport JSON
- Add founder constraints
- Final judgment

=== REPOSITORY CONTEXT ===
${repoSummary}

=== ORIGINAL QUESTION ===
${question}

=== MODE ===
${ctx.mode}

=== LEAD THINKER DRAFT (FCCReport JSON) ===
${leadDraft}

=== REVIEWER DRAFT (Review JSON) ===
${reviewerDraft}

=== YOUR JOB ===
Produce the FINAL FCCReport by:

1. Merging the best parts of the lead draft with reviewer patches
2. Fixing contradictions / removing duplicated findings
3. Respecting founder constraints:
   - Founder is 16
   - Focus time: 2–4h/day
   - ADHD/bipolar energy swings
   - Zero employees
   - School hours
   - Solo-founder stress load
   - Budget constraints
4. Keeping it concise but brutal
5. Ensuring all findings have evidence with file paths
6. Normalizing severities (10 = critical, 1 = minor)
7. Adding founder feasibility scores to recommendations (1-10)

=== FOUNDER CONSTRAINTS INTEGRATION ===
For each recommendation, ensure:
- founderFeasibilityScore (1–10)
- requiredFocusMinutes (continuous focus time)
- contextSwitchingImpact (string description)
- emotionalLoadImpact (string description)
- costImpact (string description)

If any recommendation requires more than 2 hours uninterrupted focus → Mark it "UNREALISTIC FOR SOLO FOUNDER" in description

=== CALCULATE DISAGREEMENT SCORE ===
Compare LT draft vs RV review:
- If LT and RV agree on most findings → disagreementScore: 0–30
- If LT and RV have some differences → disagreementScore: 31–70
- If LT and RV strongly disagree → disagreementScore: 71–100

Include disagreementScore in metadata.

=== SELF-CHECK BEFORE OUTPUT (MANDATORY) ===
Before returning, verify:
- [ ] All file paths in evidence exist in repository
- [ ] All code snippets are accurate
- [ ] No invented files/APIs/functions
- [ ] summary exists and is 2–4 sentences
- [ ] assumptions is an array
- [ ] findings is an array with required fields
- [ ] recommendations is an array with required fields
- [ ] overallRiskScore is 0–100
- [ ] confidence is 0–100
- [ ] metadata.disagreementScore exists (0–100)
- [ ] metadata.selfCheckPassed exists (true/false)

If any check fails, regenerate the report and mark selfCheckPassed: false

${ctx.adaptiveLayout ? `=== ADAPTIVE LAYOUT MODE (v4.3) ===
Produce the final answer in adaptive layout mode. No sections are required. No templates. Write the answer naturally, like a normal LLM (ChatGPT, Gemini, Claude), while grounding all claims in verified repository files.

Return your answer as natural text. No JSON, no templates. Just write clearly and naturally.

=== OUTPUT FORMAT ===
Write your answer naturally using paragraphs, headings, bullet points, or any structure that improves clarity. Answer like a modern LLM would.` : `=== OUTPUT FORMAT ===
Output MUST be valid FCCReport JSON. No markdown, no commentary.`}

{
  "mode": "${ctx.mode}",
  "question": "${question}",
  "summary": "2–4 sentences. Clear thesis.",
  "assumptions": ["string"],
  "findings": [
    {
      "id": "string",
      "title": "string",
      "severity": 1,
      "impactArea": "architecture/reliability/scalability/cost/founder-stress/etc",
      "description": "string",
      "evidence": [
        {
          "filePath": "file.ts:20-50",
          "snippet": "code or reasoning",
          "reasoning": "why this is evidence"
        }
      ],
      "confidence": 0
    }
  ],
  "recommendations": [
    {
      "id": "string",
      "title": "string",
      "difficulty": "low/medium/high",
      "expectedImpact": "string",
      "roiEstimate": "string",
      "description": "string",
      "founderFeasibilityScore": 1,
      "requiredFocusMinutes": 0,
      "contextSwitchingImpact": "string",
      "emotionalLoadImpact": "string",
      "costImpact": "string"
    }
  ],
  "overallRiskScore": 0,
  "confidence": 0,
  "notes": "string (optional)",
  "metadata": {
    "disagreementScore": 0,
    "selfCheckPassed": true
  }
}

Return ONLY the JSON object.`.trim();
}

/**
 * 3-step collaborative panel for pipeline_diagnosis mode
 * DeepSeek R1 (lead) → DeepSeek V3.2 (reviewer) → Gemini (synthesizer)
 */
async function runCollaborativePipelineDiagnosis(
  ctx: {
    mode: FCCMode;
    question: string;
    repoSnapshot: RepoSnapshot;
    systemPrompt: string;
    modePrompt: string;
    fullContext: FCCQuestionContext;
  },
  customModelInvoker?: ModelInvoker
): Promise<FCCReport> {
  const startTime = Date.now();
  
  try {
    // Build panel context
    // Note: External repo loading is handled in runFCCQuery, snapshot already includes external repo files
    const repoSummary = getRepoSummary(ctx.repoSnapshot);
    const panelContext = {
      mode: ctx.mode,
      question: ctx.question,
      repoRoot: ctx.repoSnapshot.root,
      fileCount: ctx.repoSnapshot.files.length,
      firstFiles: ctx.repoSnapshot.files.slice(0, 10).map(f => f.path),
      timestamp: new Date().toISOString(),
    };

    // Get panel models
    const leadModel = getLeadThinkerForMode(ctx.mode);
    const reviewerModel = getReviewerForMode(ctx.mode);
    const speedModel = getSpeedLayerForMode(ctx.mode);

    const invoker = customModelInvoker || modelInvoker;

    // ==========================================
    // STEP 1: Lead Thinker (DeepSeek R1) - Create initial draft
    // ==========================================
    console.log(`[FCC Engine] Collaborative Panel Step 1: Lead Thinker (${leadModel.id})`);
    
    const leadPrompt = `You are LEAD THINKER (LT) in the FCC 3-model panel.

${ctx.systemPrompt}

=== MODE-SPECIFIC INSTRUCTIONS ===
${ctx.modePrompt}

=== YOUR ROLE ===
You are the FIRST stage in a collaborative panel. Your output will be reviewed by DeepSeek V3.2 (Reviewer) and then synthesized by Gemini Flash 2.0 (Synthesizer).

Your job:
- Do DEEP reasoning (trace causal chains, identify root causes, model systems)
- Take a STRONG position (Professional Engineering: choose A or B, never neutral)
- NO HEDGING: Never use "probably", "maybe", "might", "could be". State your position clearly.
- Identify risks, contradictions, causal structures
- Produce findings with STRICT evidence
- REQUIRED: Generate 5–8 findings minimum with severity 1–10
- Model engineering constraints (resource constraints, operational overhead, budget, complexity)

${ctx.fullContext.adaptiveLayout ? `=== ADAPTIVE LAYOUT MODE (v4.3) ===
You should not use any fixed format. Write the analysis in the clearest, most natural style given the question.
Use paragraphs, bullet points, headings, or any structure that improves clarity. Answer like a modern LLM (ChatGPT, Gemini, Claude).
` : ''}

You know that a reviewer model will critique you afterwards, so it is OK to be opinionated and slightly imperfect – but you must be concrete and evidence-based.

=== REPOSITORY CONTEXT ===
Root: ${panelContext.repoRoot}
Files scanned: ${panelContext.fileCount}
First files: ${panelContext.firstFiles.join(', ')}
${ctx.repoSnapshot.files.some(f => f.path && f.path.startsWith('[EXTERNAL:')) ? `
⚠️ EXTERNAL REPOSITORY DETECTED:
This analysis includes files from an external GitHub repository that was cloned automatically.
Files from external repos are prefixed with [EXTERNAL:repoName]/path/to/file
You MUST cite files from the cloned repository when giving findings about the external repo.
` : ''}

=== USER QUESTION ===
${ctx.question}

=== EVIDENCE-MODE RULES ===
- ALWAYS cite file paths with line numbers for every claim
- ALWAYS paste relevant code snippets
- NEVER invent files or APIs
- If external repo is loaded, cite files with [EXTERNAL:repoName]/ prefix when referencing external repo files
- If unsure: write "NOT VERIFIED IN REPOSITORY"

=== FOUNDER CONSTRAINTS ===
Account for:
- Founder is 16
- Focus time: 2–4h/day
- ADHD/bipolar energy swings
- Zero employees
- School hours
- Solo-founder stress load
- Budget constraints

=== SELF-CHECK BEFORE OUTPUT (MANDATORY) ===
Before returning, verify:
- [ ] All file paths in evidence exist in repository
- [ ] All code snippets are accurate quotes
- [ ] No invented files/APIs/functions
- [ ] summary is 2–4 sentences with clear thesis
- [ ] assumptions is an array
- [ ] findings is an array with required fields
- [ ] recommendations is an array with required fields
- [ ] overallRiskScore is 0–100
- [ ] confidence is 0–100

If any check fails, regenerate the report.

=== OUTPUT REQUIREMENTS ===
Output MUST be strict JSON following FCCReport structure. No markdown, no commentary, no code fences.

Required fields:
{
  "mode": "${ctx.mode}",
  "question": "${ctx.question}",
  "summary": "2–4 sentences. Clear thesis. Choose A or B.",
  "assumptions": ["string"],
  "findings": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "evidence": [
        {
          "filePath": "file.ts:20-50",
          "snippet": "code or reasoning",
          "reasoning": "why this is evidence"
        }
      ],
      "severity": 1,
      "impactArea": "architecture/reliability/scalability/cost/founder-stress/etc",
      "confidence": 0
    }
  ],
  "recommendations": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "expectedImpact": "string",
      "difficulty": "low/medium/high",
      "roiEstimate": "string",
      "founderFeasibilityScore": 1,
      "requiredFocusMinutes": 0,
      "contextSwitchingImpact": "string",
      "emotionalLoadImpact": "string",
      "costImpact": "string"
    }
  ],
  "overallRiskScore": 0,
  "confidence": 0
}

Return ONLY the JSON object.`;

    let leadResult;
    let leadDraftParsed: FCCReport | null = null;
    
    const leadStartTime = Date.now();
    try {
      console.log(`[FCC Engine] Invoking Lead Thinker (${leadModel.id}) at ${new Date().toISOString()}`);
      leadResult = await invoker.invoke({
        model: leadModel,
        prompt: leadPrompt,
        systemPrompt: ctx.systemPrompt,
      });
      
      const leadDuration = Date.now() - leadStartTime;
      console.log(`[FCC Engine] Lead Thinker completed in ${leadDuration}ms`);
      
      if (!leadResult.rawText || leadResult.rawText.trim().length === 0) {
        throw new Error('Lead Thinker returned empty output');
      }
      
      // Try to parse JSON
      try {
        const jsonMatch = leadResult.rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Normalize the parsed report to ensure proper structure and anti-hallucination checks
          leadDraftParsed = normalizeParsedReport(parsed, ctx.fullContext, ctx.repoSnapshot);
        }
      } catch (parseError) {
        throw new Error(`Failed to parse Lead Thinker output as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      
      if (!leadDraftParsed) {
        throw new Error('Lead Thinker output could not be parsed into FCCReport');
      }
      
      console.log(`[FCC Engine] Lead Thinker completed - ${leadDraftParsed.findings?.length || 0} findings`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FCC Engine] Lead Thinker failed:`, errorMsg);
      
      // Create a more helpful error report for authentication issues
      if (errorMsg.includes('401') || errorMsg.includes('authentication') || errorMsg.includes('Invalid API key')) {
        const authErrorReport: FCCReport = {
          mode: ctx.mode,
          question: ctx.question,
          summary: 'Lead Thinker (DeepSeek R1) authentication failed. Cannot continue panel pipeline.',
          assumptions: [],
          findings: [
            {
              id: 'lead-thinker-auth-failure',
              title: 'API Authentication Failed',
              description: errorMsg + '\n\nThe Moonshot API key (MOONSHOT_API_KEY) is invalid or missing. Please check your .env.local file and ensure the key is correct.',
              evidence: [],
              severity: 10,
              impactArea: 'architecture',
            },
          ],
          recommendations: [
            {
              id: 'fix-api-key',
              title: 'Fix Moonshot API Key Configuration',
              description: '1. Check that MOONSHOT_API_KEY is set in .env.local\n2. Verify the key is correct and not expired\n3. Ensure the key starts with "sk-"\n4. Restart your dev server after updating the key\n5. See ENV_SETUP.md for detailed instructions',
              expectedImpact: 'Enable FCC collaborative panel to function',
              difficulty: 'low',
            },
          ],
          overallRiskScore: 100,
          confidence: 100,
          notes: 'This is a configuration issue, not a code error. Fix the API key to continue.',
          metadata: {
            executionTimeMs: Date.now() - startTime,
            modelsUsed: [leadModel.id],
            repoFilesScanned: ctx.repoSnapshot.files.length,
            timestamp: new Date().toISOString(),
            panelPipeline: true,
          },
        };
        return authErrorReport;
      }
      
      throw error; // Hard fail for other errors - do not continue
    }

    // ==========================================
    // STEP 2: Reviewer (DeepSeek) - Review and critique
    // ==========================================
    console.log(`[FCC Engine] Collaborative Panel Step 2: Reviewer (${reviewerModel.id})`);
    
    const reviewPrompt = `You are REVIEWER (RV) in the FCC 3-model panel.

${ctx.systemPrompt}

=== MODE-SPECIFIC INSTRUCTIONS ===
${ctx.modePrompt}

=== YOUR ROLE ===
You are the SECOND stage. A Lead Thinker (DeepSeek R1) has produced a draft FCCReport. Your job is to critique it and suggest improvements.

Your responsibilities:
- Attack LT's logic aggressively
- Find hallucinations (VERIFY all file references exist in repository)
- Validate evidence paths (check every filePath in evidence)
- Repair logic errors
- Expose hidden flaws
- Add missing evidence
- Strengthen reasoning
- Fix contradictions
- Patch hallucinations
- Recalculate severity scores (1-10)
- Add visionAlignmentScore (0-10) for each recommendation
${ctx.fullContext.adaptiveLayout ? `- Do not enforce any report structure. Focus only on correctness, evidence validation, and clarity.
` : '- Enforce JSON validity'}

=== REPOSITORY CONTEXT ===
Root: ${panelContext.repoRoot}
Files scanned: ${panelContext.fileCount}
${ctx.repoSnapshot.files.some(f => f.path && f.path.startsWith('[EXTERNAL:')) ? `
⚠️ EXTERNAL REPOSITORY DETECTED:
Files from external repos are prefixed with [EXTERNAL:repoName]/path/to/file
Verify external repo file paths when checking evidence.
` : ''}

=== ORIGINAL QUESTION ===
${ctx.question}

=== LEAD_DRAFT FCCReport (JSON) ===
${JSON.stringify(leadDraftParsed, null, 2)}

=== YOUR JOB ===
1. Identify weaknesses in the draft:
   - Missing evidence (must cite file paths with line numbers)
   - Unclear reasoning
   - Incomplete findings
   - Hallucinations (invented files/APIs - VERIFY all file paths exist, including external repo paths)
   - Weak conclusions
   - Contradictions

2. Verify all file references exist in the repository (including external repo if loaded)

3. Add missing risks and findings

4. Produce a review with:
   - Review summary
   - List of issues found (with severity 1-10)
   - Optionally, a patched FCCReport

=== SELF-CHECK BEFORE OUTPUT (MANDATORY) ===
Before returning, verify:
- [ ] All file paths in LT draft exist in repository
- [ ] All code snippets are accurate
- [ ] No invented APIs or functions referenced
- [ ] All issues have severity 1–10
- [ ] Review summary is clear and actionable

If any check fails, regenerate the review.

=== OUTPUT FORMAT (strict JSON) ===
{
  "reviewSummary": "string",
  "issues": [
    {
      "id": "string",
      "severity": 1,
      "description": "string"
    }
  ],
  "patch": FCCReport | null
}

Return ONLY the JSON object. No markdown, no commentary.`;

    let reviewResult;
    let reviewParsed: ReviewOutput | null = null;
    
    const reviewStartTime = Date.now();
    try {
      console.log(`[FCC Engine] Invoking Reviewer (${reviewerModel.id}) at ${new Date().toISOString()}`);
      reviewResult = await invoker.invoke({
        model: reviewerModel,
        prompt: reviewPrompt,
        systemPrompt: ctx.systemPrompt,
      });
      
      const reviewDuration = Date.now() - reviewStartTime;
      console.log(`[FCC Engine] Reviewer completed in ${reviewDuration}ms`);
      
      // Try to parse JSON
      try {
        const jsonMatch = reviewResult.rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          reviewParsed = JSON.parse(jsonMatch[0]) as ReviewOutput;
        }
      } catch (parseError) {
        console.warn(`[FCC Engine] Failed to parse review output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        reviewParsed = {
          reviewSummary: 'Review parsing failed',
          issues: [],
          patch: null,
        };
      }
      
      console.log(`[FCC Engine] Reviewer completed - ${reviewParsed?.issues?.length || 0} issues found`);
    } catch (error) {
      console.warn(`[FCC Engine] Reviewer failed:`, error instanceof Error ? error.message : 'Unknown error');
      reviewParsed = {
        reviewSummary: `Reviewer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        issues: [],
        patch: null,
      };
    }

    // ==========================================
    // EXTENDED AGENTS: Run extended agent panel (v4.1)
    // ==========================================
    console.log(`[FCC Engine] Running Extended Agent Panel...`);
    const extendedAgentOutputs: {
      riskHeatmap?: any;
      feasibilityCurve?: any;
      economicModel?: any;
    } = {};
    
    const repoRoot = ctx.repoSnapshot.root;
    const effectiveRepoRoot = repoRoot || process.cwd();
    
    // Always run Risk Forecaster
    try {
      const riskHeatmap = await runRiskForecasterAgent({
        question: ctx.question,
        repoSnapshot: ctx.repoSnapshot,
        leadDraft: leadDraftParsed,
        systemPrompt: ctx.systemPrompt,
        repoRoot: effectiveRepoRoot,
      }, invoker);
      if (riskHeatmap) {
        extendedAgentOutputs.riskHeatmap = riskHeatmap;
        console.log(`[FCC Engine] Risk Forecaster completed`);
      }
    } catch (error) {
      console.warn(`[FCC Engine] Risk Forecaster failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Always run Feasibility Analyst (needs recommendations from leadDraftParsed)
    try {
      const recommendations = leadDraftParsed?.recommendations || [];
      if (recommendations.length > 0) {
        const feasibilityCurve = await runFeasibilityAnalystAgent({
          question: ctx.question,
          repoSnapshot: ctx.repoSnapshot,
          recommendations: recommendations,
          systemPrompt: ctx.systemPrompt,
          repoRoot: effectiveRepoRoot,
        }, invoker);
        if (feasibilityCurve) {
          extendedAgentOutputs.feasibilityCurve = feasibilityCurve;
          console.log(`[FCC Engine] Feasibility Analyst completed`);
        }
      }
    } catch (error) {
      console.warn(`[FCC Engine] Feasibility Analyst failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Run Economic Optimizer only for long/strategic prompts (question length > 500 chars)
    const shouldRunEconomicOptimizer = ctx.question.length > 500;
    if (shouldRunEconomicOptimizer) {
      try {
        const economicModel = await runEconomicOptimizerAgent({
          question: ctx.question,
          repoSnapshot: ctx.repoSnapshot,
          systemPrompt: ctx.systemPrompt,
          repoRoot: effectiveRepoRoot,
        }, invoker);
        if (economicModel) {
          extendedAgentOutputs.economicModel = economicModel;
          console.log(`[FCC Engine] Economic Optimizer completed`);
        }
      } catch (error) {
        console.warn(`[FCC Engine] Economic Optimizer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log(`[FCC Engine] Economic Optimizer skipped (question length ${ctx.question.length} <= 500)`);
    }
    
    console.log(`[FCC Engine] Extended Agent Panel completed - ${Object.keys(extendedAgentOutputs).length} agents ran`);

    // ==========================================
    // STEP 3: Synthesizer (Gemini) - Final merge
    // ==========================================
    console.log(`[FCC Engine] Collaborative Panel Step 3: Synthesizer (${speedModel.id})`);
    
    const synthPrompt = `You are SYNTHESIZER (SZ) in the FCC 3-model panel.

${ctx.systemPrompt}

=== MODE-SPECIFIC INSTRUCTIONS ===
${ctx.modePrompt}

=== YOUR ROLE ===
You are the FINAL stage. You receive:
1. The original question
2. The lead draft (FCCReport from DeepSeek R1)
3. The review (with issues and optional patch from DeepSeek V3.2)

Your responsibilities:
- Combine LT + RV drafts
- Remove contradictions
- Produce clean summary
- Structure into FCCReport JSON
- Add founder constraints
- Final judgment

=== REPOSITORY CONTEXT ===
Root: ${panelContext.repoRoot}
Files scanned: ${panelContext.fileCount}
${ctx.repoSnapshot.files.some(f => f.path && f.path.startsWith('[EXTERNAL:')) ? `
⚠️ EXTERNAL REPOSITORY DETECTED:
Files from external repos are prefixed with [EXTERNAL:repoName]/path/to/file
Include external repo files in final report when relevant.
` : ''}

=== ORIGINAL QUESTION ===
${ctx.question}

=== LEAD_DRAFT (FCCReport JSON) ===
${JSON.stringify(leadDraftParsed, null, 2)}

=== REVIEW_DRAFT (Review JSON) ===
${JSON.stringify(reviewParsed, null, 2)}

${Object.keys(extendedAgentOutputs).length > 0 ? `=== EXTENDED AGENT OUTPUTS (v4.1) ===
${JSON.stringify(extendedAgentOutputs, null, 2)}

Your task: Include these extended agent outputs in the final report's metadata.extendedAgentOutputs field.
Format them cleanly in the notes section if needed.

` : ''}=== YOUR JOB ===
Produce the FINAL FCCReport in v4.1 format by:

1. Merging the best parts of the lead draft with reviewer patches
2. Fixing contradictions / removing duplicated findings
3. Respecting founder constraints:
   - Founder is 16
   - Focus time: 2–4h/day
   - ADHD/bipolar energy swings
   - Zero employees
   - School hours
   - Solo-founder stress load
   - Budget constraints
4. Keeping it concise but brutal
5. Ensuring all findings have evidence with file paths
6. Normalizing severities (10 = critical, 1 = minor)
7. Adding founder feasibility scores to recommendations (1-10)

=== FOUNDER CONSTRAINTS INTEGRATION ===
For each recommendation, ensure:
- founderFeasibilityScore (1–10)
- requiredFocusMinutes (continuous focus time)
- contextSwitchingImpact (string description)
- emotionalLoadImpact (string description)
- costImpact (string description)

If any recommendation requires more than 2 hours uninterrupted focus → Mark it "UNREALISTIC FOR SOLO FOUNDER" in description

=== CALCULATE DISAGREEMENT SCORE ===
Compare LT draft vs RV review:
- If LT and RV agree on most findings → disagreementScore: 0–30
- If LT and RV have some differences → disagreementScore: 31–70
- If LT and RV strongly disagree → disagreementScore: 71–100

Include disagreementScore in metadata.

=== SELF-CHECK BEFORE OUTPUT (MANDATORY) ===
Before returning, verify:
- [ ] All file paths in evidence exist in repository
- [ ] All code snippets are accurate
- [ ] No invented files/APIs/functions
- [ ] summary exists and is 2–4 sentences
- [ ] assumptions is an array
- [ ] findings is an array with required fields
- [ ] recommendations is an array with required fields
- [ ] overallRiskScore is 0–100
- [ ] confidence is 0–100
- [ ] metadata.disagreementScore exists (0–100)
- [ ] metadata.selfCheckPassed exists (true/false)

If any check fails, regenerate the report and mark selfCheckPassed: false

${ctx.fullContext.adaptiveLayout ? `=== OUTPUT FORMAT (v4.3 Adaptive Layout) ===
Produce the final answer in adaptive layout mode. No sections are required. No templates. Write the answer naturally, like a normal LLM, while grounding all claims in verified repository files.

Return your answer as natural text. No JSON, no templates. Just write clearly and naturally.` : `=== OUTPUT FORMAT ===
Output MUST be valid FCCReport JSON. No markdown, no commentary.

{
  "mode": "${ctx.mode}",
  "question": "${ctx.question}",
  "summary": "2–4 sentences. Clear thesis.",
  "assumptions": ["string"],
  "findings": [
    {
      "id": "string",
      "title": "string",
      "severity": 1,
      "impactArea": "architecture/reliability/scalability/cost/founder-stress/etc",
      "description": "string",
      "evidence": [
        {
          "filePath": "file.ts:20-50",
          "snippet": "code or reasoning",
          "reasoning": "why this is evidence"
        }
      ],
      "confidence": 0
    }
  ],
  "recommendations": [
    {
      "id": "string",
      "title": "string",
      "difficulty": "low/medium/high",
      "expectedImpact": "string",
      "roiEstimate": "string",
      "description": "string",
      "founderFeasibilityScore": 1,
      "requiredFocusMinutes": 0,
      "contextSwitchingImpact": "string",
      "emotionalLoadImpact": "string",
      "costImpact": "string"
    }
  ],
  "overallRiskScore": 0,
  "confidence": 0,
  "notes": "string (optional)",
  "metadata": {
    "disagreementScore": 0,
    "selfCheckPassed": true,
    "reportFormatVersion": "4.1",
    "extendedAgentOutputs": ${JSON.stringify(extendedAgentOutputs)}
  }
}

Return ONLY the JSON object.`}`;

    let finalResult;
    let finalReport: FCCReport;
    
    const synthStartTime = Date.now();
    try {
      console.log(`[FCC Engine] Invoking Synthesizer (${speedModel.id}) at ${new Date().toISOString()}`);
      finalResult = await invoker.invoke({
        model: speedModel,
        prompt: synthPrompt,
        systemPrompt: ctx.systemPrompt,
      });
      
      const synthDuration = Date.now() - synthStartTime;
      console.log(`[FCC Engine] Synthesizer completed in ${synthDuration}ms`);
      
      // Check if adaptive layout mode is enabled
      const isAdaptiveLayout = ctx.fullContext.adaptiveLayout === true;
      
      if (isAdaptiveLayout) {
        // v4.3 Adaptive Layout Mode: Store natural text output
        console.log(`[FCC Engine] Adaptive Layout Mode: Storing natural text output`);
        finalReport = {
          mode: ctx.mode,
          question: ctx.question,
          summary: finalResult.rawText, // Natural text as summary
          adaptiveText: finalResult.rawText, // Also store in adaptiveText field
          assumptions: [],
          findings: [],
          recommendations: [],
          overallRiskScore: 50,
          confidence: 75,
          metadata: {
            reportFormatVersion: "4.3",
            adaptiveLayout: true,
          },
        };
      } else {
        // Legacy JSON mode: Try to parse JSON
        try {
          const jsonMatch = finalResult.rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            finalReport = normalizeParsedReport(JSON.parse(jsonMatch[0]), ctx.fullContext, ctx.repoSnapshot);
          } else {
            throw new Error('No JSON found in synthesizer output');
          }
        } catch (parseError) {
        console.warn(`[FCC Engine] Failed to parse synthesizer output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        
        // Fallback: use review.patch if available, otherwise use leadDraftParsed
        if (reviewParsed?.patch) {
          finalReport = normalizeParsedReport(reviewParsed.patch, ctx.fullContext, ctx.repoSnapshot);
          finalReport.notes = (finalReport.notes || '') + ' [Synthesizer parsing failed, used reviewer patch]';
        } else if (leadDraftParsed) {
          finalReport = normalizeParsedReport(leadDraftParsed, ctx.fullContext, ctx.repoSnapshot);
          finalReport.notes = (finalReport.notes || '') + ' [Synthesizer parsing failed, used lead draft]';
        } else {
          throw new Error('Cannot fallback - no valid report available');
        }
        
        // Add meta-finding about synth failure
        finalReport.findings.push({
          id: 'synth-parsing-failure',
          title: 'Synthesizer Parsing Failed',
          description: 'The synthesizer output could not be parsed. Used fallback report.',
          evidence: [],
          severity: 5,
          impactArea: 'unknown',
        });
        }
      }
      
      console.log(`[FCC Engine] Synthesizer completed - Final report with ${finalReport.findings?.length || 0} findings`);
    } catch (error) {
      console.error(`[FCC Engine] Synthesizer failed:`, error instanceof Error ? error.message : 'Unknown error');
      
      // Fallback: use review.patch or leadDraftParsed
      if (reviewParsed?.patch) {
        finalReport = normalizeParsedReport(reviewParsed.patch, ctx.fullContext, ctx.repoSnapshot);
        finalReport.notes = (finalReport.notes || '') + ' [Synthesizer failed, used reviewer patch]';
      } else if (leadDraftParsed) {
        finalReport = normalizeParsedReport(leadDraftParsed, ctx.fullContext, ctx.repoSnapshot);
        finalReport.notes = (finalReport.notes || '') + ' [Synthesizer failed, used lead draft]';
      } else {
        throw new Error('Synthesizer failed and no fallback available');
      }
      
      finalReport.findings.push({
        id: 'synth-execution-failure',
        title: 'Synthesizer Execution Failed',
        description: `The synthesizer failed: ${error instanceof Error ? error.message : 'Unknown error'}. Used fallback report.`,
        evidence: [],
        severity: 5,
        impactArea: 'unknown',
      });
    }

    // Set metadata with v4.1 fields
    if (!finalReport.metadata) {
      finalReport.metadata = {};
    }
    finalReport.metadata.executionTimeMs = Date.now() - startTime;
    finalReport.metadata.modelsUsed = [leadModel.id, reviewerModel.id, speedModel.id];
    finalReport.metadata.repoFilesScanned = ctx.repoSnapshot.files.length;
    finalReport.metadata.timestamp = new Date().toISOString();
    finalReport.metadata.panelPipeline = true;
    
    // v4.1/v4.3 metadata fields
    if (!finalReport.metadata) {
      finalReport.metadata = {};
    }
    
    // Set format version (4.3 if adaptive, otherwise 4.1)
    if (ctx.fullContext.adaptiveLayout) {
      finalReport.metadata.reportFormatVersion = "4.3";
      finalReport.metadata.adaptiveLayout = true;
    } else {
      finalReport.metadata.reportFormatVersion = finalReport.metadata.reportFormatVersion || "4.1";
    }
    
    // Add extended agent outputs (v4.1) - only if not in adaptive mode
    if (!ctx.fullContext.adaptiveLayout) {
      finalReport.metadata.extendedAgentOutputs = extendedAgentOutputs;
    }
    
    // Calculate disagreementScore if not already set
    if (finalReport.metadata.disagreementScore === undefined) {
      // Simple heuristic: count differences between LT and RV
      const ltFindingsCount = leadDraftParsed?.findings?.length || 0;
      const rvIssuesCount = reviewParsed?.issues?.length || 0;
      const rvPatchFindingsCount = reviewParsed?.patch?.findings?.length || 0;
      
      // If RV found many issues or created a patch, there's disagreement
      if (rvIssuesCount === 0 && !reviewParsed?.patch) {
        finalReport.metadata.disagreementScore = 0; // High agreement
      } else if (rvIssuesCount > 0 && rvIssuesCount < ltFindingsCount / 2) {
        finalReport.metadata.disagreementScore = 30; // Some disagreement
      } else if (rvIssuesCount >= ltFindingsCount / 2) {
        finalReport.metadata.disagreementScore = 70; // Significant disagreement
      } else {
        finalReport.metadata.disagreementScore = 50; // Moderate disagreement
      }
    }
    
    // Ensure selfCheckPassed is set
    if (finalReport.metadata.selfCheckPassed === undefined) {
      // Check if report structure is valid
      const hasValidStructure = Boolean(
        finalReport.summary && 
        finalReport.summary.length > 0 &&
        Array.isArray(finalReport.findings) &&
        Array.isArray(finalReport.recommendations) &&
        typeof finalReport.overallRiskScore === 'number' &&
        typeof finalReport.confidence === 'number'
      );
      
      finalReport.metadata.selfCheckPassed = hasValidStructure;
    }
    
    // Calculate visionAlignmentScore (v2.1) - average of all recommendation visionAlignmentScores
    if (finalReport.metadata.visionAlignmentScore === undefined) {
      const recommendations = finalReport.recommendations || [];
      if (recommendations.length > 0) {
        const visionScores = recommendations
          .map(r => r.technicalAlignmentScore)
          .filter((score): score is number => typeof score === 'number' && score >= 0 && score <= 10);
        
        if (visionScores.length > 0) {
          const avgVisionScore = visionScores.reduce((sum, score) => sum + score, 0) / visionScores.length;
          finalReport.metadata.visionAlignmentScore = Math.round(avgVisionScore * 10); // Scale 0-10 to 0-100
        } else {
          finalReport.metadata.visionAlignmentScore = 50; // Default: moderate alignment
        }
      } else {
        finalReport.metadata.visionAlignmentScore = 50; // Default: moderate alignment
      }
    }
    
    return finalReport;

  } catch (error) {
    // Return error report
    const errorReport: FCCReport = {
      mode: ctx.mode,
      question: ctx.question,
      summary: `FCC collaborative panel failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      assumptions: [],
      findings: [
        {
          id: 'panel-error',
          title: 'Collaborative Panel Error',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          evidence: [],
          severity: 10,
          impactArea: 'unknown',
        },
      ],
      recommendations: [],
      overallRiskScore: 100,
      confidence: 0,
      notes: `Error occurred during collaborative panel execution. Stack: ${error instanceof Error ? error.stack : 'N/A'}`,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        modelsUsed: [],
        repoFilesScanned: ctx.repoSnapshot.files.length,
        timestamp: new Date().toISOString(),
      },
    };

    return errorReport;
  }
}

/**
 * Panel pipeline: 3-stage analysis (Lead Thinker → Reviewer → Normalizer)
 */
async function runWithPanelPipeline(
  ctx: {
    mode: FCCMode;
    question: string;
    repoSnapshot: RepoSnapshot;
    systemPrompt: string;
    modePrompt: string;
    fullContext: FCCQuestionContext;
  },
  customModelInvoker?: ModelInvoker
): Promise<FCCReport> {
  const startTime = Date.now();
  const modelsUsed: string[] = [];
  
  try {
    // Get panel models
    const leadModel = getLeadThinkerForMode(ctx.mode);
    const reviewerModel = getReviewerForMode(ctx.mode);
    const speedModel = getSpeedLayerForMode(ctx.mode);

    const invoker = customModelInvoker || modelInvoker;

    // Stage 1: Lead Thinker (DeepSeek R1) - Create initial draft
    console.log(`[FCC Engine] Panel Pipeline Stage 1: Lead Thinker (${leadModel.id})`);
    const leadPrompt = buildLeadPrompt(
      ctx.systemPrompt,
      ctx.modePrompt,
      ctx.question,
      ctx.repoSnapshot,
      ctx.fullContext
    );
    
    let leadResult;
    try {
      leadResult = await invoker.invoke({
        model: leadModel,
        prompt: leadPrompt,
        systemPrompt: ctx.systemPrompt,
      });
      
      // HARD FAIL: If lead thinker returns empty or error, fail immediately
      if (!leadResult.rawText || leadResult.rawText.trim().length === 0 || (leadResult as any).error) {
        console.error(`[FCC Engine] Lead Thinker returned empty or error output`);
        const errorReport: FCCReport = {
          mode: ctx.mode,
          question: ctx.question,
          summary: 'Lead Thinker failed (DeepSeek R1). Cannot continue panel pipeline.',
          assumptions: [],
          findings: [
            {
              id: 'lead-thinker-failure',
              title: 'Primary model failed',
              description: 'The lead thinker (DeepSeek R1) did not return output. This indicates invalid API config or routing.',
              evidence: [],
              severity: 10,
              impactArea: 'architecture',
            },
          ],
          recommendations: [],
          overallRiskScore: 100,
          confidence: 20,
          notes: 'Lead Thinker stage failed - panel pipeline cannot continue without primary model output.',
          metadata: {
            executionTimeMs: Date.now() - startTime,
            modelsUsed: [leadModel.id],
            repoFilesScanned: ctx.repoSnapshot.files.length,
            timestamp: new Date().toISOString(),
            panelPipeline: true,
          },
        };
        return errorReport;
      }
      
      modelsUsed.push(leadModel.id);
      console.log(`[FCC Engine] Lead Thinker completed`);
    } catch (error) {
      console.error(`[FCC Engine] Lead Thinker failed:`, error instanceof Error ? error.message : 'Unknown error');
      
      // HARD FAIL: Do NOT fallback to DeepSeek - return error report immediately
      const errorReport: FCCReport = {
        mode: ctx.mode,
        question: ctx.question,
        summary: 'Lead Thinker failed (DeepSeek R1). Cannot continue panel pipeline.',
        assumptions: [],
        findings: [
          {
            id: 'lead-thinker-failure',
            title: 'Primary model failed',
            description: `The lead thinker (DeepSeek R1) failed to execute. Error: ${error instanceof Error ? error.message : 'Unknown error'}. This indicates invalid API config or routing.`,
            evidence: [],
            severity: 10,
            impactArea: 'architecture',
          },
        ],
        recommendations: [],
        overallRiskScore: 100,
        confidence: 20,
        notes: `Lead Thinker stage failed with error: ${error instanceof Error ? error.stack : 'N/A'}`,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          modelsUsed: [leadModel.id],
          repoFilesScanned: ctx.repoSnapshot.files.length,
          timestamp: new Date().toISOString(),
          panelPipeline: true,
        },
      };
      return errorReport;
    }

    // Stage 2: Reviewer (DeepSeek) - Review and improve
    console.log(`[FCC Engine] Panel Pipeline Stage 2: Reviewer (${reviewerModel.id})`);
    const reviewPrompt = buildReviewerPrompt(
      ctx.systemPrompt,
      ctx.modePrompt,
      ctx.question,
      ctx.repoSnapshot,
      ctx.fullContext,
      leadResult.rawText
    );
    
    let reviewResult;
    try {
      reviewResult = await invoker.invoke({
        model: reviewerModel,
        prompt: reviewPrompt,
        systemPrompt: ctx.systemPrompt,
      });
      modelsUsed.push(reviewerModel.id);
      console.log(`[FCC Engine] Reviewer completed`);
    } catch (error) {
      console.warn(`[FCC Engine] Reviewer failed:`, error instanceof Error ? error.message : 'Unknown error');
      // Fallback: use lead draft
      reviewResult = leadResult;
      modelsUsed.push(`${reviewerModel.id} (failed, using lead draft)`);
    }

    // Stage 3: Normalizer (Gemini) - Finalize
    console.log(`[FCC Engine] Panel Pipeline Stage 3: Normalizer (${speedModel.id})`);
    const finalPrompt = buildSynthesizerPrompt(
      ctx.systemPrompt,
      ctx.modePrompt,
      ctx.question,
      ctx.repoSnapshot,
      ctx.fullContext,
      leadResult.rawText,
      reviewResult.rawText
    );
    
    let finalResult;
    try {
      finalResult = await invoker.invoke({
        model: speedModel,
        prompt: finalPrompt,
        systemPrompt: ctx.systemPrompt,
      });
      modelsUsed.push(speedModel.id);
      console.log(`[FCC Engine] Normalizer completed`);
    } catch (error) {
      console.warn(`[FCC Engine] Normalizer failed:`, error instanceof Error ? error.message : 'Unknown error');
      // Fallback: use reviewer draft
      finalResult = reviewResult;
      modelsUsed.push(`${speedModel.id} (failed, using reviewer draft)`);
    }

    // Parse final result into FCCReport
    const report = parseFCCReport(finalResult.rawText, ctx.fullContext, ctx.repoSnapshot);
    
    // Set metadata with correct order: ["deepseek-r1", "deepseek-v3.2", "gemini-2.0-flash"]
    if (!report.metadata) {
      report.metadata = {};
    }
    report.metadata.executionTimeMs = Date.now() - startTime;
    // Ensure models are logged in correct order
    const orderedModels = [
      leadModel.id,
      reviewerModel.id,
      speedModel.id,
    ].filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates while preserving order
    report.metadata.modelsUsed = orderedModels.length > 0 ? orderedModels : modelsUsed;
    report.metadata.repoFilesScanned = ctx.repoSnapshot.files.length;
    report.metadata.timestamp = new Date().toISOString();
    
    // @ts-ignore - adding panelPipeline flag (not in type yet but useful for tracking)
    report.metadata.panelPipeline = true;

    return report;
  } catch (error) {
    // Return error report (parsing never throws)
    const errorReport: FCCReport = {
      mode: ctx.mode,
      question: ctx.question,
      summary: `FCC panel pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      assumptions: [],
      findings: [
        {
          id: 'pipeline-error',
          title: 'Panel Pipeline Error',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          evidence: [],
          severity: 10,
          impactArea: 'unknown',
        },
      ],
      recommendations: [],
      overallRiskScore: 100,
      confidence: 0,
      notes: `Error occurred during panel pipeline execution. Stack: ${error instanceof Error ? error.stack : 'N/A'}`,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        modelsUsed,
        repoFilesScanned: ctx.repoSnapshot.files.length,
        timestamp: new Date().toISOString(),
        panelPipeline: true,
      },
    };

    return errorReport;
  }
}

/**
 * Main FCC query runner
 * 
 * This is the core function that orchestrates the entire FCC analysis.
 */
export async function runFCCQuery(
  ctx: FCCQuestionContext,
  customModelInvoker?: ModelInvoker,
  repoRoot?: string
): Promise<FCCReport> {
  const startTime = Date.now();
  const REPO_SCAN_TIMEOUT_MS = 30000; // 30 seconds max for repo scan
  
  try {
    // ==========================================
    // EXTERNAL REPO LOADER: Check for GitHub URLs
    // ==========================================
    let externalRepoPath: string | null = null;
    
    if (ctx.question.includes("github.com")) {
      const match = ctx.question.match(/https:\/\/github\.com\/[^\s]+/);
      if (match) {
        const repoUrl = match[0].replace("/tree/", "#tree-split#"); // safe hack
        const cleanRepoUrl = repoUrl.split("#tree-split#")[0] + ".git";
        
        try {
          externalRepoPath = await loadExternalGitRepo(cleanRepoUrl);
          console.log(`[FCC Engine] External repo loaded: ${externalRepoPath}`);
        } catch (error) {
          console.warn(`[FCC Engine] Failed to load external repo: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue without external repo
        }
      }
    }
    
    // 1. Build repo snapshot (use process.cwd() if repoRoot not provided)
    const effectiveRepoRoot = repoRoot || process.cwd();
    console.log(`[FCC Engine] Starting repo scan at: ${effectiveRepoRoot}`);
    
    const scanStartTime = Date.now();
    const snapshots: RepoSnapshot[] = [buildRepoSnapshot(effectiveRepoRoot)];
    
    // Add external repo snapshot if available
    if (externalRepoPath) {
      try {
        console.log(`[FCC Engine] Scanning external repo at: ${externalRepoPath}`);
        const externalSnapshot = buildRepoSnapshot(externalRepoPath);
        snapshots.push(externalSnapshot);
        console.log(`[FCC Engine] External repo scanned: ${externalSnapshot.files.length} files`);
      } catch (error) {
        console.warn(`[FCC Engine] Failed to scan external repo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Merge snapshots if we have multiple
    const snapshot = snapshots.length > 1 ? mergeRepoSnapshots(snapshots) : snapshots[0];
    const scanDuration = Date.now() - scanStartTime;
    
    if (scanDuration > REPO_SCAN_TIMEOUT_MS) {
      console.warn(`[FCC Engine] Repo scan took ${scanDuration}ms (exceeded ${REPO_SCAN_TIMEOUT_MS}ms threshold)`);
    }
    
    const repoSummary = getRepoSummary(snapshot);
    console.log(`[FCC Engine] Scanned repo in ${scanDuration}ms: ${repoSummary.totalFiles} files, ${repoSummary.totalDirectories} directories`);

    // 2. Load related files if specified
    if (ctx.relatedFiles && ctx.relatedFiles.length > 0) {
      loadRelatedFiles(snapshot, ctx.relatedFiles);
      console.log(`[FCC Engine] Loaded ${ctx.relatedFiles.length} related file patterns`);
    }

    // 3. Load prompt templates
    console.log(`[FCC Engine] Loading prompt templates...`);
    const promptLoadStartTime = Date.now();
    const systemPrompt = loadPromptTemplate(getSystemPromptPath(effectiveRepoRoot));
    const modePrompt = loadPromptTemplate(getModePromptPath(ctx.mode, effectiveRepoRoot));
    const promptLoadDuration = Date.now() - promptLoadStartTime;
    console.log(`[FCC Engine] Prompt templates loaded in ${promptLoadDuration}ms`);

    // 4. Route to appropriate pipeline based on mode
    console.log(`[FCC Engine] Routing to ${ctx.mode} pipeline...`);
    const pipelineStartTime = Date.now();
    let report: FCCReport;
    if (ctx.mode === 'pipeline_diagnosis') {
      // Use collaborative 3-step panel for pipeline_diagnosis
      console.log(`[FCC Engine] Starting collaborative panel for pipeline_diagnosis mode at ${new Date().toISOString()}`);
      report = await runCollaborativePipelineDiagnosis(
        {
          mode: ctx.mode,
          question: ctx.question,
          repoSnapshot: snapshot,
          systemPrompt,
          modePrompt,
          fullContext: ctx,
        },
        customModelInvoker
      );
    } else {
      // Use standard panel pipeline for other modes
      console.log(`[FCC Engine] Starting standard panel pipeline for mode: ${ctx.mode} at ${new Date().toISOString()}`);
      report = await runWithPanelPipeline(
        {
          mode: ctx.mode,
          question: ctx.question,
          repoSnapshot: snapshot,
          systemPrompt,
          modePrompt,
          fullContext: ctx,
        },
        customModelInvoker
      );
    }
    
    const pipelineDuration = Date.now() - pipelineStartTime;
    const totalDuration = Date.now() - startTime;
    console.log(`[FCC Engine] Pipeline completed in ${pipelineDuration}ms, total execution: ${totalDuration}ms`);
    
    // Ensure metadata is complete
    if (!report.metadata) {
      report.metadata = {};
    }
    report.metadata.executionTimeMs = totalDuration;
    report.metadata.repoFilesScanned = snapshot.files.length;
    report.metadata.timestamp = report.metadata.timestamp || new Date().toISOString();

    console.log(`[FCC Engine] Final report ready - Findings: ${report.findings.length}, Recommendations: ${report.recommendations.length}, Risk: ${report.overallRiskScore}`);
    return report;

  } catch (error) {
    const errorDuration = Date.now() - startTime;
    console.error(`[FCC Engine] Execution failed after ${errorDuration}ms:`, error);
    
    // Return error report
    const errorReport: FCCReport = {
      mode: ctx.mode,
      question: ctx.question,
      summary: `FCC execution failed after ${Math.round(errorDuration / 1000)}s: ${error instanceof Error ? error.message : 'Unknown error'}`,
      assumptions: [],
      findings: [
        {
          id: 'execution-error',
          title: 'FCC Engine Error',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          evidence: [],
          severity: 10,
          impactArea: 'unknown',
        },
      ],
      recommendations: [
        {
          id: 'check-timeout',
          title: 'Check Timeout Configuration',
          description: `Execution took ${Math.round(errorDuration / 1000)}s. If this exceeds 5 minutes, check:\n1. Model API keys are valid\n2. Network connectivity\n3. Repository scan is not too slow\n4. Model invocations are timing out properly (30s each)`,
          expectedImpact: 'Identify timeout cause',
          difficulty: 'low',
        },
      ],
      overallRiskScore: 100,
      confidence: 0,
      notes: `Error occurred during FCC execution after ${errorDuration}ms. Stack: ${error instanceof Error ? error.stack : 'N/A'}`,
      metadata: {
        executionTimeMs: errorDuration,
        timestamp: new Date().toISOString(),
      },
    };

    return errorReport;
  }
}

/**
 * Export the main function type
 */
export const runFCCQueryTyped: RunFCCQuery = runFCCQuery;

