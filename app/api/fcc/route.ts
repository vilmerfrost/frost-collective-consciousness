/**
 * FCC API Route
 * POST /api/fcc
 * 
 * Programmatic access to Frost Collective Consciousness v1
 */

import { NextRequest, NextResponse } from "next/server";
import { FCCQuestionContext } from "@/fcc/core/types";
import { requestFCCConsult } from "@/fcc/integrations/nightFactoryHook";

// Configure route segment for longer timeout (10 minutes)
// DeepSeek R1 can take 4-5 minutes to think, plus 3 model calls = up to 10 minutes needed
export const maxDuration = 600; // 10 minutes in seconds
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log(`[FCC API] POST request received at ${new Date().toISOString()}`);
    
    // Parse request body with error handling
    let body: any;
    try {
      body = await request.json();
      console.log(`[FCC API] Request body parsed successfully`);
    } catch (parseError) {
      console.error("[FCC API] Failed to parse request body:", parseError);
      return NextResponse.json(
        { 
          error: "Invalid JSON",
          message: "Request body must be valid JSON"
        },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!body.mode || !body.question) {
      console.log("[FCC API] Validation failed: missing mode or question");
      return NextResponse.json(
        { 
          error: "Invalid request",
          message: "Required fields: mode, question"
        },
        { status: 400 }
      );
    }

    // Validate mode
    const validModes = ["pipeline_diagnosis", "agent_output_critique", "meta_prompt_architect"];
    if (!validModes.includes(body.mode)) {
      console.log(`[FCC API] Validation failed: invalid mode ${body.mode}`);
      return NextResponse.json(
        { 
          error: "Invalid mode",
          message: `Mode must be one of: ${validModes.join(", ")}`
        },
        { status: 400 }
      );
    }

    console.log(`[FCC API] Processing request - Mode: ${body.mode}, Question length: ${body.question?.length || 0}`);

    // Build context
    let ctx: FCCQuestionContext;
    try {
      ctx = {
        mode: body.mode,
        question: body.question,
        relatedFiles: body.relatedFiles,
        logs: body.logs,
        stackTraces: body.stackTraces,
        agentName: body.agentName,
        agentOutput: body.agentOutput,
        currentPrompt: body.currentPrompt,
        desiredBehavior: body.desiredBehavior,
        failingStage: body.failingStage,
        extra: body.extra,
      };
      console.log(`[FCC API] Context built successfully`);
    } catch (ctxError) {
      console.error("[FCC API] Failed to build context:", ctxError);
      return NextResponse.json(
        { 
          error: "Context build failed",
          message: ctxError instanceof Error ? ctxError.message : "Unknown error building context"
        },
        { status: 400 }
      );
    }

    // Import requestFCCConsult dynamically to catch import errors
    let requestFCCConsultFn: typeof requestFCCConsult;
    try {
      const module = await import("@/fcc/integrations/nightFactoryHook");
      requestFCCConsultFn = module.requestFCCConsult;
      console.log(`[FCC API] requestFCCConsult imported successfully`);
    } catch (importError) {
      console.error("[FCC API] Failed to import requestFCCConsult:", importError);
      return NextResponse.json(
        { 
          error: "Module import failed",
          message: importError instanceof Error ? importError.message : "Unknown import error",
          stack: importError instanceof Error ? importError.stack : undefined,
        },
        { status: 500 }
      );
    }

    // Call FCC with repo root set to current working directory
    const repoRoot = process.cwd();
    console.log(`[FCC API] Calling requestFCCConsult with repo root: ${repoRoot}`);
    
    let report;
    try {
      report = await requestFCCConsultFn(ctx, undefined, repoRoot);
      console.log(`[FCC API] requestFCCConsult completed in ${Date.now() - startTime}ms`);
    } catch (execError) {
      console.error("[FCC API] requestFCCConsult execution failed:", execError);
      throw execError; // Re-throw to be caught by outer catch
    }
    
    console.log(`[FCC API] Success - Findings: ${report.findings.length}, Recommendations: ${report.recommendations.length}, Total time: ${Date.now() - startTime}ms`);

    return NextResponse.json(report);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[FCC API] Error after ${duration}ms:`, error);
    
    // Log stack trace for better debugging
    if (error instanceof Error) {
      console.error("[FCC API] Error name:", error.name);
      console.error("[FCC API] Error message:", error.message);
      console.error("[FCC API] Error stack:", error.stack);
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Always return a valid JSON response, even on error
    try {
      return NextResponse.json(
        { 
          error: "FCC execution failed",
          message: errorMessage,
          duration: `${duration}ms`,
          stack: error instanceof Error ? error.stack : undefined,
        },
        { status: 500 }
      );
    } catch (responseError) {
      // If we can't even return JSON, log and return minimal response
      console.error("[FCC API] Failed to create error response:", responseError);
      return new NextResponse(
        JSON.stringify({ 
          error: "FCC execution failed",
          message: "Unable to generate detailed error response"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
}

/**
 * GET /api/fcc - Health check and info
 */
export async function GET(request: NextRequest) {
  try {
    // Test that we can import the main function
    let importTest = "ok";
    try {
      const module = await import("@/fcc/integrations/nightFactoryHook");
      importTest = typeof module.requestFCCConsult === 'function' ? "available" : "missing";
    } catch (importError) {
      importTest = `error: ${importError instanceof Error ? importError.message : "unknown"}`;
    }
    
    return NextResponse.json({
      name: "Frost Collective Consciousness v1",
      version: "1.0.0",
      status: "healthy",
      timestamp: new Date().toISOString(),
      importTest,
      modes: ["pipeline_diagnosis", "agent_output_critique", "meta_prompt_architect"],
      endpoints: {
        POST: "/api/fcc - Run FCC analysis",
        GET: "/api/fcc - This info endpoint",
      },
      usage: {
        example: {
          mode: "pipeline_diagnosis",
          question: "Why did the pipeline fail?",
          failingStage: "planner",
          logs: "...",
          relatedFiles: ["agent-runner/planner.ts"],
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        name: "Frost Collective Consciousness v1",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

