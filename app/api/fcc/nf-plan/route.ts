/**
 * Night Factory v4 API: Multi-Agent Planning
 * POST /api/fcc/nf-plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { planMultiAgentWorkflow } from '@/fcc/integrations/nightFactory/v4/nf4_agent_planning';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agents, goal, constraints, currentState, previousPlans } = body;

    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { agents: string[], goal: string, ... }' },
        { status: 400 }
      );
    }

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request. Expected { goal: string, ... }' },
        { status: 400 }
      );
    }

    const report = await planMultiAgentWorkflow(
      {
        agents,
        goal,
        constraints,
        currentState,
        previousPlans,
      },
      undefined,
      process.cwd()
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error('[NF4 Plan] Error:', error);
    return NextResponse.json(
      {
        error: 'NF4 planning failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

