/**
 * GitHub Ingestion API Route
 * POST /api/fcc/github/ingest
 * Fetches GitHub repository content on the server side to avoid CORS issues
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestGitHubRepo } from "@/github";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerRepo, token } = body;

    if (!ownerRepo || typeof ownerRepo !== "string") {
      return NextResponse.json(
        { error: "Invalid request. Expected { ownerRepo: string, token?: string }" },
        { status: 400 }
      );
    }

    // Validation will happen in the parseGitHubRepo function
    // Just ensure it's not empty
    if (ownerRepo.trim().length === 0) {
      return NextResponse.json(
        { error: "Repository identifier cannot be empty." },
        { status: 400 }
      );
    }

    // Call the ingestion function on the server side
    const content = await ingestGitHubRepo(ownerRepo, token || undefined);

    return NextResponse.json({
      success: true,
      content,
      source: `github:${ownerRepo}`,
      loadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GitHub ingestion error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "GitHub ingestion failed",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
