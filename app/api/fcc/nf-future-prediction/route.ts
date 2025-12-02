/**
 * Night Factory v4 API: Failure Prediction
 * POST /api/fcc/nf-future-prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictFailures } from '@/fcc/integrations/nightFactory/v4/nf4_failure_prediction';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pipeline, timeHorizon, currentRisks } = body;

    if (!pipeline || typeof pipeline !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request. Expected { pipeline: string, ... }' },
        { status: 400 }
      );
    }

    const report = await predictFailures(
      {
        pipeline,
        timeHorizon,
        currentRisks,
      },
      undefined,
      process.cwd()
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error('[NF4 Prediction] Error:', error);
    return NextResponse.json(
      {
        error: 'NF4 prediction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

