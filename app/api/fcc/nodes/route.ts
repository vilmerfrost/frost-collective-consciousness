/**
 * FCC Nodes Metadata API Route
 * GET /api/fcc/nodes
 * Returns information about all FCC nodes
 */

import { NextResponse } from "next/server";
import { FCC_NODES } from "@/lib/fcc/models/config";

export async function GET() {
  const nodes = Object.entries(FCC_NODES).map(([id, config]) => ({
    id,
    name: config.name,
    weight: config.weight,
    weightPercent: (config.weight * 100).toFixed(0) + "%",
  }));

  return NextResponse.json({
    nodes,
    totalNodes: nodes.length,
    totalWeight: nodes.reduce((sum, node) => sum + node.weight, 0),
  });
}

