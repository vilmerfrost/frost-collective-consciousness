
import { GoogleGenAI } from "@google/genai";
import { AGENTS } from "./config";
import { FusedReport, AgentId, ProposedAction, ExternalContext } from "./types";

// Helper for generating UUIDs
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const getApiKey = () => {
  try { return process.env.API_KEY; } 
  catch (e) { return ""; }
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
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    const startTime = performance.now();
    const modelName = 'gemini-2.5-flash';

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

    // 1. Parallel Agent Execution
    const activeAgents = AGENTS.filter(a => activeAgentIds.includes(a.id));
    const agentPromises = activeAgents.map(async (agent) => {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: `
            ${historyContext} 
            ${externalKnowledgeBlock}
            USER QUERY: ${query}
          ` }] }],
          config: { systemInstruction: agent.systemInstruction }
        });
        return { 
          name: agent.name, 
          role: agent.role, 
          content: response.text || "NO_DATA" 
        };
      } catch (e) {
        return { name: agent.name, role: agent.role, content: "ERROR_OFFLINE" };
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
      - Produce a FULL new FCC report with ALL required sections.
      - In ACTION MODE, also produce machine-readable \`proposedActions\` JSON.

      --------------------------------------------------
      STRUCTURED FCC REPORT – MANDATORY SECTIONS
      --------------------------------------------------
      You MUST output **exactly these seven section headers**, in this exact order, ALL CAPS, each on its own line, followed by a blank line, with content underneath each:

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
    
    let synthesisText = "";
    try {
      const synthesisResponse = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: synthesisPrompt }] }]
      });
      synthesisText = synthesisResponse.text || "";
    } catch (e) {
      throw e;
    }

    // 3. Parsing Logic
    const report: Partial<FusedReport> = {};
    
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
      confidence: 85,
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
      meta: {
        executionTimeMs: Math.round(performance.now() - startTime),
        model: modelName
      }
    };
  }
};
