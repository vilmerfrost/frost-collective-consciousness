
import { GoogleGenAI } from "@google/genai";
import { AGENTS } from "./config";
import { FusedReport, AgentId, ProposedAction } from "./types";

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
    onLog: (msg: string) => void
  ): Promise<FusedReport> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    const startTime = performance.now();
    const modelName = 'gemini-2.5-flash';

    onLog(`INITIALIZING_SWARM :: ${mode.toUpperCase()} MODE`);

    // 1. Parallel Agent Execution
    const activeAgents = AGENTS.filter(a => activeAgentIds.includes(a.id));
    const agentPromises = activeAgents.map(async (agent) => {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: `USER QUERY: ${query}` }] }],
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

      USER QUERY: "${query}"
      CURRENT MODE: ${mode}

      --------------------------------------------------
      GLOBAL OUTPUT FORMAT (BOTH MODES)
      --------------------------------------------------
      You always produce a **Fused Intelligence Report**.
      You MUST output **exactly these seven section headers**, in this exact order, ALL CAPS, each on its own line, followed by a blank line, with content underneath each:

      OVERVIEW

      ARCHITECTURE & INTEGRATIONS

      KEY FEATURES & WORKFLOWS

      KEY RISKS

      MINORITY REPORTS
      (Explicitly describe disagreements between ALPHA, BETA, OMEGA. If none, say "None".)

      NEXT ACTIONS
      (Human-level next steps, e.g. "Schedule X", "Draft Y". Natural language only.)

      EXECUTIVE SUMMARY
      (A concise summary. This must be the LAST textual section.)

      --------------------------------------------------
      MODE SPECIFIC INSTRUCTIONS
      --------------------------------------------------
      
      ${mode === 'action' ? `
      **ACTION MODE ACTIVE**
      
      After the EXECUTIVE SUMMARY and a blank line, you MUST append a valid **proposedActions** JSON array.
      
      JSON Shape:
      proposedActions: [
        {
          "id": "string-id",
          "type": "document" | "config" | "migration" | "job" | "webhook" | "other",
          "target": "github" | "supabase" | "notion" | "email" | "log" | "other",
          "shortDescription": "Human-readable action summary",
          "priority": 1 | 2 | 3,
          "requiredHumanConfirmation": true
        }
      ]
      
      You MUST NOT output any extra text after the JSON block.
      ` : `
      **ANALYSIS MODE ACTIVE**
      
      You MUST NOT output any section titled "Protocol Execution", "Cloud Action Pipeline", or similar.
      You MUST NOT output any "proposedActions" JSON.
      Stop immediately after the EXECUTIVE SUMMARY.
      `}
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
      const start = synthesisText.indexOf(header);
      if (start === -1) return "";
      const contentStart = start + header.length;
      
      let end = -1;
      if (nextHeader) {
        end = synthesisText.indexOf(nextHeader);
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
        // Find the array part of proposedActions: [...]
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
