/**
 * FCC Consensus Engine
 * Coordinates all nodes, collects responses, and builds consensus
 */

import { FCC_NODES } from "../models/config";
import { FCCNodeResponse, FCCConsensus, FCCResult } from "../types";

interface NodeOutput {
  nodeId: keyof typeof FCC_NODES;
  response: string;
  error?: string;
  executionTimeMs: number;
}

export async function runFCC(input: string): Promise<FCCResult> {
  const startTime = Date.now();
  
  // Run all nodes in parallel
  const nodePromises = Object.entries(FCC_NODES).map(async ([nodeId, config]) => {
    const nodeStartTime = Date.now();
    
    try {
      const response = await config.client(input, config.systemPrompt);
      const executionTimeMs = Date.now() - nodeStartTime;
      
      return {
        nodeId: nodeId as keyof typeof FCC_NODES,
        response,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - nodeStartTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      return {
        nodeId: nodeId as keyof typeof FCC_NODES,
        response: "",
        error: errorMessage,
        executionTimeMs,
      };
    }
  });

  const nodeOutputs = await Promise.all(nodePromises);
  
  // Filter out failed nodes
  const successfulNodes = nodeOutputs.filter(node => !node.error && node.response);
  
  if (successfulNodes.length === 0) {
    throw new Error("All FCC nodes failed. Check your API keys and network connection.");
  }

  // Build consensus
  const consensus = await buildConsensus(input, nodeOutputs, successfulNodes);
  
  const totalExecutionTimeMs = Date.now() - startTime;
  
  // Format node responses
  const nodeResponses: FCCNodeResponse[] = nodeOutputs.map(node => ({
    nodeId: node.nodeId,
    name: FCC_NODES[node.nodeId].name,
    response: node.response || `Error: ${node.error || "Unknown error"}`,
    error: node.error,
    executionTimeMs: node.executionTimeMs,
  }));

  return {
    consensus,
    nodes: nodeResponses,
    evaluation: {
      totalExecutionTimeMs,
      allNodesSuccess: nodeOutputs.every(node => !node.error),
    },
  };
}

async function buildConsensus(
  input: string,
  allNodes: NodeOutput[],
  successfulNodes: NodeOutput[]
): Promise<FCCConsensus> {
  const alphaNode = allNodes.find(n => n.nodeId === "alpha");
  const betaNode = allNodes.find(n => n.nodeId === "beta");
  const omegaNode = allNodes.find(n => n.nodeId === "omega");

  // Extract individual responses
  const alphaResponse = alphaNode?.response || "No response from ALPHA";
  const betaResponse = betaNode?.response || "No response from BETA";
  const omegaResponse = omegaNode?.response || "No response from OMEGA";

  // OMEGA critiques ALPHA + BETA (hallucination checking)
  let critique: string | undefined;
  if (omegaNode && !omegaNode.error && omegaNode.response) {
    try {
      const critiquePrompt = `You are OMEGA, the security and risk officer. Review these two responses to the user's query and identify any hallucinations, errors, contradictions, or risks:

USER QUERY: "${input}"

ALPHA (Architect) RESPONSE:
${alphaResponse}

BETA (Visionary) RESPONSE:
${betaResponse}

Provide a brief critique (2-3 sentences) focusing on:
1. Any factual errors or hallucinations
2. Contradictions between the two responses
3. Potential risks or oversights

If the responses are generally sound, say so.`;

      // Use OMEGA's client for critique (which is Llama)
      critique = await FCC_NODES.omega.client(critiquePrompt, FCC_NODES.omega.systemPrompt);
    } catch (error) {
      critique = `Critique generation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  // Build weighted consensus
  const weightedResponses: string[] = [];
  
  if (alphaNode && !alphaNode.error) {
    const repeat = Math.round(FCC_NODES.alpha.weight * 10);
    weightedResponses.push(`[ALPHA - Weight: ${FCC_NODES.alpha.weight * 100}%]\n${alphaResponse}\n`);
  }
  
  if (betaNode && !betaNode.error) {
    weightedResponses.push(`[BETA - Weight: ${FCC_NODES.beta.weight * 100}%]\n${betaResponse}\n`);
  }

  // Create synthesis prompt
  const synthesisPrompt = `You are synthesizing responses from multiple AI nodes. Create a consensus that:

1. Combines the best insights from each node
2. Addresses any contradictions
3. Provides a clear decision/recommendation
4. Explains the reasoning behind the consensus

USER QUERY: "${input}"

${weightedResponses.join("\n---\n\n")}

${critique ? `CRITIQUE FROM OMEGA (Risk Officer):\n${critique}\n\n` : ""}

Provide a structured response with:
- SUMMARY: A brief overview (2-3 sentences)
- DECISION: The main recommendation/answer (1-2 sentences)
- REASONING: Explain how ALPHA, BETA, and OMEGA contributed (3-4 sentences, one per node)
- RECOMMENDED_ACTION: What should be done next (1-2 sentences)
- CONFIDENCE: A number 0-100 representing how confident you are in this consensus

Format your response with these exact headers.`;

  // Use BETA (Gemini) for synthesis as it's good at combining perspectives
  let synthesis: string;
  try {
    synthesis = await FCC_NODES.beta.client(synthesisPrompt, "You are a synthesis engine that creates clear, actionable consensus from multiple perspectives.");
  } catch (error) {
    // Fallback to simple concatenation if synthesis fails
    synthesis = `SUMMARY: ${alphaResponse.substring(0, 200)}...\n\nDECISION: Based on the node responses, a consensus has been reached.\n\nREASONING: ALPHA provided architectural insights. BETA provided visionary perspectives. OMEGA provided risk analysis.\n\nRECOMMENDED_ACTION: Review the full node responses above.\n\nCONFIDENCE: 60`;
  }

  // Parse synthesis into structured format
  const parsed = parseSynthesis(synthesis, alphaResponse, betaResponse, omegaResponse);

  return {
    summary: parsed.summary,
    decision: parsed.decision,
    reasoning: {
      alpha: parsed.reasoning.alpha,
      beta: parsed.reasoning.beta,
      omega: parsed.reasoning.omega,
    },
    recommendedAction: parsed.recommendedAction,
    confidence: parsed.confidence,
    critique,
  };
}

function parseSynthesis(
  synthesis: string,
  alphaResponse: string,
  betaResponse: string,
  omegaResponse: string
): {
  summary: string;
  decision: string;
  reasoning: { alpha: string; beta: string; omega: string };
  recommendedAction: string;
  confidence: number;
} {
  // Extract sections using regex
  const extractSection = (label: string, text: string): string => {
    const regex = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=\\n\\n[A-Z_]+:|$)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  const summary = extractSection("SUMMARY", synthesis) || alphaResponse.substring(0, 200) + "...";
  const decision = extractSection("DECISION", synthesis) || "Review the node responses above.";
  
  const reasoningText = extractSection("REASONING", synthesis);
  
  // Extract reasoning for each node from the synthesis or use fallbacks
  let alphaReasoning = extractSection("ALPHA", reasoningText);
  let betaReasoning = extractSection("BETA", reasoningText);
  let omegaReasoning = extractSection("OMEGA", reasoningText);
  
  // Fallback to full reasoning text or default messages
  if (!alphaReasoning) {
    alphaReasoning = reasoningText.toLowerCase().includes("alpha") 
      ? reasoningText 
      : "Architectural analysis provided by ALPHA node.";
  }
  if (!betaReasoning) {
    betaReasoning = reasoningText.toLowerCase().includes("beta")
      ? reasoningText
      : "Visionary perspectives provided by BETA node.";
  }
  if (!omegaReasoning) {
    omegaReasoning = reasoningText.toLowerCase().includes("omega")
      ? reasoningText
      : "Risk assessment provided by OMEGA node.";
  }
  
  const recommendedAction = extractSection("RECOMMENDED_ACTION", synthesis) || "Proceed with caution.";
  
  const confidenceMatch = synthesis.match(/CONFIDENCE:\s*(\d+)/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 70;

  return {
    summary,
    decision,
    reasoning: {
      alpha: alphaReasoning,
      beta: betaReasoning,
      omega: omegaReasoning,
    },
    recommendedAction,
    confidence: Math.max(0, Math.min(100, confidence)),
  };
}

