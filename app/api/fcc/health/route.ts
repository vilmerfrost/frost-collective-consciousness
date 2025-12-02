/**
 * FCC Health Check API Route
 * GET /api/fcc/health
 * Checks API key configuration for all model endpoints
 */

import { NextResponse } from "next/server";

export async function GET() {
  const healthChecks = {
    alpha: { status: "unknown", error: null as string | null, apiKeyConfigured: false },
    beta: { status: "unknown", error: null as string | null, apiKeyConfigured: false },
    omega: { status: "unknown", error: null as string | null, apiKeyConfigured: false },
  };

  // Check ALPHA (Qwen) - HuggingFace
  const hfToken = process.env.HF_TOKEN;
  if (hfToken) {
    healthChecks.alpha.apiKeyConfigured = true;
    healthChecks.alpha.status = "configured";
  } else {
    healthChecks.alpha.status = "unconfigured";
    healthChecks.alpha.error = "HF_TOKEN environment variable not set";
  }

  // Check BETA (Gemini) - Google AI Studio
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    healthChecks.beta.apiKeyConfigured = true;
    healthChecks.beta.status = "configured";
  } else {
    healthChecks.beta.status = "unconfigured";
    healthChecks.beta.error = "GEMINI_API_KEY environment variable not set";
  }

  // Check OMEGA (Llama) - Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    healthChecks.omega.apiKeyConfigured = true;
    healthChecks.omega.status = "configured";
  } else {
    healthChecks.omega.status = "unconfigured";
    healthChecks.omega.error = "GROQ_API_KEY environment variable not set";
  }

  const allConfigured = Object.values(healthChecks).every(check => check.apiKeyConfigured);
  const overallStatus = allConfigured ? "ready" : "partial";

  return NextResponse.json({
    status: overallStatus,
    nodes: healthChecks,
    timestamp: new Date().toISOString(),
    note: "Health check verifies API key configuration only. Actual API connectivity is tested during FCC runs.",
  });
}

