/**
 * FCC Run API Route
 * POST /api/fcc/run
 * Accepts orchestrator parameters and returns FusedReport
 */

import { NextRequest, NextResponse } from "next/server";
import { orchestrator } from "@/orchestrator";
import { AgentId, FusedReport, ExternalContext } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      input, 
      activeAgentIds, 
      mode, 
      previousReport, 
      externalContext 
    } = body;

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Invalid request. Expected { input: string }" },
        { status: 400 }
      );
    }

    if (input.trim().length === 0) {
      return NextResponse.json(
        { error: "Input cannot be empty" },
        { status: 400 }
      );
    }

    // Collect logs from orchestrator
    const logs: string[] = [];
    const onLog = (msg: string) => {
      logs.push(msg);
    };

    // Run orchestrator on server side (where env variables are available)
    const result = await orchestrator.runCollective(
      input,
      activeAgentIds || ["NODE_ALPHA", "NODE_BETA", "NODE_OMEGA"],
      mode || "analysis",
      onLog,
      previousReport || null,
      externalContext || null
    );

    return NextResponse.json({
      ...result,
      logs, // Include logs in response
    });
  } catch (error) {
    console.error("FCC run error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "FCC execution failed",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
