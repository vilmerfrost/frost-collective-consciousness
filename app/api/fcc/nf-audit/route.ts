/**
 * Night Factory v4 API: Cross-Agent Audit
 * POST /api/fcc/nf-audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditAgentOutputs } from '@/fcc/integrations/nightFactory/v4/nf4_cross_agent_audit';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentOutputs, query } = body;

    if (!agentOutputs || !Array.isArray(agentOutputs) || agentOutputs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { agentOutputs: Array, ... }' },
        { status: 400 }
      );
    }

    // Validate agentOutputs structure
    for (const ao of agentOutputs) {
      if (!ao.agentId || !ao.agentName || !ao.output || !ao.stage) {
        return NextResponse.json(
          { error: 'Invalid agentOutput. Expected { agentId, agentName, output, stage }' },
          { status: 400 }
        );
      }
    }

    const report = await auditAgentOutputs(
      {
        agentOutputs,
        query,
      },
      undefined,
      process.cwd()
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error('[NF4 Audit] Error:', error);
    return NextResponse.json(
      {
        error: 'NF4 audit failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

