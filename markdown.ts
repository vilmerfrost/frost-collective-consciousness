
import { FusedReport } from "./types";

export function generateMarkdown(report: FusedReport): string {
  const blocks: string[] = [];

  // 1. Title and Meta
  blocks.push(`# Fused Intelligence Report`);
  blocks.push(
    `- **ID:** ${report.id}\n` +
    `- **Date:** ${new Date(report.createdAt).toLocaleString()}\n` +
    `- **Confidence:** ${report.confidence}%\n` +
    `- **Mode:** ${report.mode.toUpperCase()}\n` +
    `- **Agents:** ${report.participatingAgents.join(', ')}`
  );

  // 2. Standard Sections (Mapped to clean H2 headers)
  const sections = [
    { title: "Overview", content: report.overview },
    { title: "Architecture & Integrations", content: report.architectureAndIntegrations },
    { title: "Key Features & Workflows", content: report.keyFeaturesAndWorkflows },
    { title: "Key Risks", content: report.keyRisks },
  ];

  sections.forEach(s => {
    if (s.content) {
      blocks.push(`## ${s.title}\n\n${s.content}`);
    }
  });

  // 3. Minority Reports
  if (report.minorityReports && report.minorityReports.length > 0) {
    blocks.push(`## Minority Reports`);
    report.minorityReports.forEach(mr => {
      // Clean up the agent name if needed (e.g. NODE_ALPHA -> ALPHA)
      const agentName = mr.agent.replace('NODE_', '');
      blocks.push(`**${agentName}:** ${mr.title}\n\n${mr.details}`);
    });
  }

  // 4. Next Actions
  if (report.nextActionsForHuman) {
    blocks.push(`## Next Actions\n\n${report.nextActionsForHuman}`);
  }

  // 5. Executive Summary
  if (report.executiveSummary) {
    blocks.push(`## Executive Summary\n\n${report.executiveSummary}`);
  }

  // 6. Proposed Actions (JSON) - Only in Action Mode
  if (report.mode === 'action' && report.proposedActions && report.proposedActions.length > 0) {
    blocks.push(`## Proposed Actions (JSON)`);
    blocks.push("```json");
    // Clean up internal UI state before exporting
    const cleanActions = report.proposedActions.map(({ status, resultMessage, ...rest }) => rest);
    blocks.push(JSON.stringify(cleanActions, null, 2));
    blocks.push("```");
  }

  return blocks.join('\n\n');
}
