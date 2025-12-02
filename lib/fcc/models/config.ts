/**
 * FCC Node Configuration
 * Defines the three nodes with their weights and clients
 */

import { callQwen } from "../clients/qwen";
import { callGemini } from "../clients/gemini";
import { callLlama } from "../clients/llama";
import { FCCNodeConfig } from "../types";

export const FCC_NODES = {
  alpha: {
    name: "ALPHA – Architect",
    weight: 0.40,
    client: callQwen,
    systemPrompt: "You are Node Alpha. You are the structural engineer. Focus on feasibility, system architecture, physics, and code implementation. Be precise, dry, and technical.",
  } as FCCNodeConfig & { systemPrompt: string },

  beta: {
    name: "BETA – Visionary",
    weight: 0.35,
    client: callGemini,
    systemPrompt: "You are Node Beta. You are the creative engine. Focus on user experience, narrative, emotional impact, and lateral thinking. Be metaphorical and evocative.",
  } as FCCNodeConfig & { systemPrompt: string },

  omega: {
    name: "OMEGA – Warden",
    weight: 0.25,
    client: callLlama,
    systemPrompt: "You are Node Omega. You are the security and risk officer. Focus on vulnerabilities, ethical hazards, failure modes, and worst-case scenarios. Be critical and paranoid.",
  } as FCCNodeConfig & { systemPrompt: string },
};

// Validate weights sum to ~1.0
const weightSum = Object.values(FCC_NODES).reduce((sum, node) => sum + node.weight, 0);
if (Math.abs(weightSum - 1.0) > 0.01) {
  console.warn(`Warning: FCC node weights sum to ${weightSum}, not 1.0`);
}

