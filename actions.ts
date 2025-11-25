
import { ProposedAction, ActionExecutionResult } from "./types";

/**
 * CLIENT-SIDE LIBRARY for executing cloud actions.
 * In a real Next.js app, this would call /api/fcc/actions.
 */
export async function executeCloudActions(
  actions: ProposedAction[],
  opts: { dryRun?: boolean } = {}
): Promise<ActionExecutionResult[]> {
  if (!actions || actions.length === 0) {
    return [];
  }

  const results: ActionExecutionResult[] = [];
  const isDryRun = opts.dryRun ?? true;

  for (const action of actions) {
    try {
      // In a real app, this would be:
      // const res = await fetch("/api/fcc/actions", { 
      //   method: "POST", 
      //   body: JSON.stringify({ action, dryRun: isDryRun }) 
      // });
      
      // MOCK BACKEND LOGIC (simulating app/api/fcc/actions/route.ts)
      const mockResponse = await mockApiRoute({ action, dryRun: isDryRun });
      
      results.push({
        id: action.id,
        success: mockResponse.success,
        message: mockResponse.message,
      });

    } catch (error: any) {
      results.push({
        id: action.id,
        success: false,
        message: error?.message ?? "Unknown error executing action",
      });
    }
  }

  return results;
}

/**
 * MOCK SERVER HANDLER (Simulates app/api/fcc/actions/route.ts)
 */
async function mockApiRoute(payload: { action: ProposedAction, dryRun: boolean }) {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800));

  const { action, dryRun } = payload;

  if (dryRun) {
    return {
      success: true,
      message: `[DRY RUN] Would execute ${action.type.toUpperCase()} on ${action.target.toUpperCase()}: ${action.shortDescription}`
    };
  }

  // Real execution logic simulation
  if (action.target === "log") {
    console.log(`[FCC LOG] ${action.shortDescription}`);
    return { success: true, message: "Logged to internal system." };
  }

  // Environment credential check simulation
  // In a real app, this checks process.env.GITHUB_TOKEN etc.
  const HAS_CREDENTIALS = true; 

  if (!HAS_CREDENTIALS) {
    return { success: false, message: `Missing credentials for ${action.target}` };
  }

  return {
    success: true,
    message: `[SUCCESS] Executed ${action.type} on ${action.target}. Resource updated.`
  };
}
