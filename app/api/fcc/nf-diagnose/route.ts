/**
 * Night Factory v4 API: Pipeline Diagnosis
 * POST /api/fcc/nf-diagnose
 */

import { NextRequest, NextResponse } from 'next/server';
import { diagnosePipelineStage, diagnoseBeforeStage, diagnoseAfterStage } from '@/fcc/integrations/nightFactory/v4/nf4_pipeline_diagnosis';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stage, query, logs, stackTrace, relatedFiles, mode } = body;

    if (!stage || typeof stage !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request. Expected { stage: string, ... }' },
        { status: 400 }
      );
    }

    let report;
    
    if (mode === 'before') {
      report = await diagnoseBeforeStage(
        stage,
        query,
        undefined, // modelInvoker (use default)
        process.cwd()
      );
    } else if (mode === 'after') {
      report = await diagnoseAfterStage(
        stage,
        logs,
        query,
        undefined,
        process.cwd()
      );
    } else {
      report = await diagnosePipelineStage(
        {
          stage,
          query,
          logs,
          stackTrace,
          relatedFiles,
        },
        undefined,
        process.cwd()
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('[NF4 Diagnose] Error:', error);
    return NextResponse.json(
      {
        error: 'NF4 diagnosis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

