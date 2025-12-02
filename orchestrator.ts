
import { AGENTS } from "./config";
import { FusedReport, AgentId, ProposedAction, ExternalContext } from "./types";
import { callQwen } from "@/lib/fcc/clients/qwen";
import { callGemini } from "@/lib/fcc/clients/gemini";
import { callLlama } from "@/lib/fcc/clients/llama";

// Helper for generating UUIDs
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Map agent IDs to their respective model clients
const getAgentClient = (agentId: AgentId) => {
  switch (agentId) {
    case "NODE_ALPHA":
      return callQwen;
    case "NODE_BETA":
      return callGemini;
    case "NODE_OMEGA":
      return callLlama;
    default:
      return callGemini; // Fallback
  }
};

export const orchestrator = {
  async runCollective(
    query: string,
    activeAgentIds: AgentId[],
    mode: "analysis" | "action",
    onLog: (msg: string) => void,
    previousReport?: FusedReport | null,
    externalContext?: ExternalContext | null
  ): Promise<FusedReport> {
    const startTime = performance.now();
    const modelName = 'FCC-Multi-Node (Qwen/Gemini/Llama)';

    onLog(`INITIALIZING_SWARM :: ${mode.toUpperCase()} MODE`);

    // Prepare Context Strings
    let historyContext = "";
    if (previousReport) {
      historyContext = `
      --- PREVIOUS REPORT CONTEXT (ID: ${previousReport.id}) ---
      OVERVIEW: ${previousReport.overview}
      ARCHITECTURE: ${previousReport.architectureAndIntegrations}
      RISKS: ${previousReport.keyRisks}
      MINORITY REPORTS: ${previousReport.minorityReports.map(m => m.details).join(' | ')}
      ACTIONS: ${previousReport.nextActionsForHuman}
      EXECUTIVE SUMMARY: ${previousReport.executiveSummary}
      --- END PREVIOUS CONTEXT ---
      `;
    }

    let externalKnowledgeBlock = "";
    if (externalContext) {
      onLog(`CONTEXT_INJECTION :: LOADING ${externalContext.source.toUpperCase()}`);
      externalKnowledgeBlock = `
      --- EXTERNAL KNOWLEDGE SOURCE: ${externalContext.source} ---
      ${externalContext.content}
      --- END EXTERNAL KNOWLEDGE ---
      `;
    }

    // 1. Parallel Agent Execution - using new free model clients
    const activeAgents = AGENTS.filter(a => activeAgentIds.includes(a.id));
    const agentPromises = activeAgents.map(async (agent) => {
      try {
        const client = getAgentClient(agent.id);
        const agentPrompt = `
            ${historyContext} 
            ${externalKnowledgeBlock}
            USER QUERY: ${query}
          `;
        const content = await client(agentPrompt, agent.systemInstruction);
        return { 
          name: agent.name, 
          role: agent.role, 
          content: content || "NO_DATA" 
        };
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "ERROR_OFFLINE";
        onLog(`NODE_ERROR :: ${agent.name} - ${errorMsg}`);
        
        // FCC v4 Integration: Trigger diagnosis on agent failure (optional, non-blocking)
        // Uncomment to enable automatic FCC v4 diagnosis on agent failures:
        /*
        try {
          const { diagnosePipelineStage } = await import('./fcc/integrations/nightFactory/v4');
          const fccReport = await diagnosePipelineStage(
            {
              stage: agent.name,
              query: `Diagnose why ${agent.name} failed: ${errorMsg}`,
              logs: errorMsg,
              stackTrace: e instanceof Error ? e.stack : undefined,
              agentId: agent.id,
              relatedFiles: ['orchestrator.ts', `lib/fcc/clients/${agent.id.toLowerCase()}.ts`],
            }
          );
          onLog(`FCC_V4_DIAGNOSIS :: ${agent.name} - Risk: ${fccReport.overallRiskScore}, Findings: ${fccReport.findings.length}`);
          if (fccReport.recommendations && fccReport.recommendations.length > 0) {
            onLog(`FCC_V4_RECOMMENDATIONS :: ${agent.name} - Top: ${fccReport.recommendations[0]?.title}`);
          }
        } catch (fccError) {
          // FCC diagnosis failed, continue without it
          console.warn('[FCC v4] Failed to diagnose agent failure:', fccError);
        }
        */
        
        // TODO: Add FCC v4 hooks for:
        // - Pre-flight diagnosis before running agent: diagnoseBeforeStage()
        // - Post-flight diagnosis after agent completes: diagnoseAfterStage()
        // - Cross-agent audit: auditAgentOutputs()
        // - Failure prediction: predictFailures()
        
        return { name: agent.name, role: agent.role, content: `ERROR: ${errorMsg}` };
      }
    });

    const agentResults = await Promise.all(agentPromises);
    onLog(`DATA_INGEST :: RECEIVED ${agentResults.length} STREAMS`);

    // 2. Synthesis Prompt Construction
    const contextBlock = agentResults
      .map(r => `[NODE: ${r.name} (${r.role})]:\n${r.content}`)
      .join('\n\n');

    const synthesisPrompt = `
      You are the **Frost Collective Consciousness (FCC)** – a synchronized multi-agent council designed to think like a senior architecture board + ethics committee + product strategist for Frost Solutions.

      CONTEXT (Individual Agent Thoughts):
      ${contextBlock}

      ${historyContext ? 'PREVIOUS REPORT CONTEXT IS AVAILABLE ABOVE.' : ''}
      ${externalKnowledgeBlock ? 'EXTERNAL CODEBASE CONTEXT IS AVAILABLE ABOVE. USE IT FOR CONCRETE REFERENCES.' : ''}
      
      USER QUERY: "${query}"
      CURRENT MODE: "${mode}"

      --------------------------------------------------
      CORE BEHAVIOR
      --------------------------------------------------
      You MUST:
      - Re-evaluate the situation based on the agent inputs, external context (if any), and user query.
      - Calculate a **CONFIDENCE SCORE** (0-100) representing the alignment of agents and clarity of the solution.
      - Produce a FULL new FCC report with ALL required sections.
      - In ACTION MODE, also produce machine-readable \`proposedActions\` JSON.

      --------------------------------------------------
      OUTPUT FORMAT (STRICT)
      --------------------------------------------------
      
      **FIRST LINE MUST BE:**
      CONFIDENCE_SCORE: <integer 0-100>
      
      (Calculation Guide: 
       - 90-100: Total consensus, clear query, full context.
       - 70-89: Minor disagreements, feasible solution.
       - 50-69: Major architectural dissent or vague query.
       - <50: Critical ethical blocking or impossible request.)

      **THEN LEAVE A BLANK LINE.**

      **THEN OUTPUT exactly these seven section headers**, in this exact order, ALL CAPS, each on its own line, followed by a blank line:

      1. OVERVIEW
      2. ARCHITECTURE & INTEGRATIONS
      3. KEY FEATURES & WORKFLOWS
      4. KEY RISKS
      5. MINORITY REPORTS
      6. NEXT ACTIONS
      7. EXECUTIVE SUMMARY

      **SECTION GUIDELINES:**
      - **OVERVIEW**: What is the tension or decision? (1-3 paragraphs)
      - **ARCHITECTURE & INTEGRATIONS**: System design, data flow, relevant files (e.g. types.ts, config.ts). Do not hallucinate libraries. IF EXTERNAL CONTEXT IS PROVIDED, REFERENCE ACTUAL FILES FOUND IN THE CONTEXT.
      - **KEY FEATURES & WORKFLOWS**: Concrete workflows. Who does what? Through which UI?
      - **KEY RISKS**: Technical, Security, Ethical, Operational, UX.
      - **MINORITY REPORTS**: Explicit disagreements between ALPHA (Architecture), BETA (UX/Vision), OMEGA (Ethics/Safety).
      - **NEXT ACTIONS**: Human-level steps (docs, meetings, decisions). Natural language only.
      - **EXECUTIVE SUMMARY**: 5-10 bullets summarizing the decision. This must be the LAST textual section.

      --------------------------------------------------
      MODE SPECIFIC INSTRUCTIONS
      --------------------------------------------------
      
      ${mode === 'action' ? `
      **ACTION MODE ACTIVE**
      
      After the EXECUTIVE SUMMARY and a blank line, you MUST append a valid **proposedActions** JSON array.
      
      JSON Shape:
      proposedActions: [
        {
          "id": "short-unique-id",
          "type": "document" | "config" | "migration" | "job" | "webhook" | "other",
          "target": "github" | "supabase" | "notion" | "email" | "log" | "other",
          "shortDescription": "Human-readable action summary",
          "priority": 1 | 2 | 3,
          "requiredHumanConfirmation": true
        }
      ]
      
      Rules:
      - Use small, concrete actions (e.g. "Create Supabase migration", "Update types.ts").
      - Be consistent with Next.js/Supabase stack.
      - You MUST NOT output any extra text after the JSON block.
      ` : `
      **ANALYSIS MODE ACTIVE**
      
      You MUST NOT output any section titled "Protocol Execution", "Cloud Action Pipeline", or similar.
      You MUST NOT output any "proposedActions" JSON.
      Stop immediately after the EXECUTIVE SUMMARY.
      `}
      
      --------------------------------------------------
      PRIORITIES & TONE
      --------------------------------------------------
      1. Human safety & dignity (especially workers).
      2. Legal/Regulatory compliance.
      3. Data correctness.
      4. Maintainability (small team).
      5. Premium, trustworthy UX.
    `;

    onLog("SYNTHESIS_ENGINE :: PROCESSING VECTORS...");
    
    // Use Gemini (BETA) for synthesis as it's good at combining perspectives
    let synthesisText = "";
    try {
      synthesisText = await callGemini(synthesisPrompt, "You are the Frost Collective Consciousness synthesis engine. Combine multiple perspectives into coherent, actionable reports.");
    } catch (e) {
      // FCC Integration: Trigger diagnosis on synthesis failure
      // Uncomment to enable automatic FCC diagnosis on synthesis failures:
      /*
      try {
        const { triggerFCCOnFailure } = await import('./fcc/integrations/nightFactoryHook');
        const fccReport = await triggerFCCOnFailure(
          'synthesis',
          `Synthesis failed: ${e instanceof Error ? e.message : "Unknown error"}`,
          e instanceof Error ? e.stack : undefined,
          ['orchestrator.ts']
        );
        onLog(`FCC_DIAGNOSIS :: Synthesis failure - Risk: ${fccReport.overallRiskScore}`);
      } catch (fccError) {
        console.warn('[FCC] Failed to diagnose synthesis failure:', fccError);
      }
      */
      throw new Error(`Synthesis failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // 3. Parsing Logic
    const report: Partial<FusedReport> = {};
    
    // Extract Confidence Score
    let confidence = 85; // Default fallback
    const confidenceMatch = synthesisText.match(/^CONFIDENCE_SCORE:\s*(\d+)/m);
    if (confidenceMatch && confidenceMatch[1]) {
        confidence = Math.min(100, Math.max(0, parseInt(confidenceMatch[1], 10)));
        // Remove the confidence line from the text to avoid polluting the sections
        synthesisText = synthesisText.replace(/^CONFIDENCE_SCORE:\s*\d+\s*/, '').trim();
    }

    // Helper to extract section content
    const getSection = (header: string, nextHeader?: string) => {
      // Normalize to find the header (handle potential numbering "1. OVERVIEW" vs "OVERVIEW")
      const regex = new RegExp(`(?:^|\\n)(?:\\d+\\.\\s*)?${header}(?:\\r?\\n|$)`, 'i');
      const match = synthesisText.match(regex);
      
      if (!match || match.index === undefined) return "";
      
      const contentStart = match.index + match[0].length;
      
      let end = -1;
      if (nextHeader) {
        const nextRegex = new RegExp(`(?:^|\\n)(?:\\d+\\.\\s*)?${nextHeader}(?:\\r?\\n|$)`, 'i');
        const nextMatch = synthesisText.match(nextRegex);
        if (nextMatch && nextMatch.index !== undefined) {
          end = nextMatch.index;
        }
      } else {
        // For the last section (Executive Summary)
        // If Action Mode, stop before "proposedActions:"
        if (mode === 'action') {
          const jsonStart = synthesisText.indexOf('proposedActions:', contentStart);
          if (jsonStart !== -1) end = jsonStart;
        }
      }
      
      const content = end === -1 
        ? synthesisText.slice(contentStart) 
        : synthesisText.slice(contentStart, end);
      
      return content.trim();
    };

    report.overview = getSection("OVERVIEW", "ARCHITECTURE & INTEGRATIONS");
    report.architectureAndIntegrations = getSection("ARCHITECTURE & INTEGRATIONS", "KEY FEATURES & WORKFLOWS");
    report.keyFeaturesAndWorkflows = getSection("KEY FEATURES & WORKFLOWS", "KEY RISKS");
    report.keyRisks = getSection("KEY RISKS", "MINORITY REPORTS");
    
    const minorityText = getSection("MINORITY REPORTS", "NEXT ACTIONS");
    report.minorityReports = [];
    if (minorityText && !minorityText.includes("None")) {
       report.minorityReports.push({ agent: "SYSTEM", title: "Dissent", details: minorityText });
    }

    report.nextActionsForHuman = getSection("NEXT ACTIONS", "EXECUTIVE SUMMARY");
    report.executiveSummary = getSection("EXECUTIVE SUMMARY");

    // Extract JSON for Action Mode
    let actions: ProposedAction[] = [];
    if (mode === 'action') {
      try {
        const jsonMatch = synthesisText.match(/proposedActions:\s*(\[\s*\{[\s\S]*\}\s*\])/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (Array.isArray(parsed)) {
            actions = parsed.map((a: any) => ({
              ...a,
              id: a.id || generateId(),
              requiredHumanConfirmation: true, // Force safety
              status: undefined // reset UI state
            }));
          }
        }
      } catch (e) {
        onLog("PARSING :: FAILED TO EXTRACT ACTION JSON");
        console.error("JSON Parse Error", e);
      }
    }

    return {
      id: generateId(),
      query,
      confidence: confidence, // Use the dynamic score
      overview: report.overview || "System Error: Output Missing",
      architectureAndIntegrations: report.architectureAndIntegrations || "",
      keyFeaturesAndWorkflows: report.keyFeaturesAndWorkflows || "",
      keyRisks: report.keyRisks || "",
      minorityReports: report.minorityReports || [],
      nextActionsForHuman: report.nextActionsForHuman || "",
      executiveSummary: report.executiveSummary || "",
      proposedActions: actions,
      participatingAgents: activeAgentIds,
      mode,
      createdAt: new Date().toISOString(),
      externalContext: externalContext || undefined, // PERSIST CONTEXT
      meta: {
        executionTimeMs: Math.round(performance.now() - startTime),
        model: modelName
      }
    };
  }
};
