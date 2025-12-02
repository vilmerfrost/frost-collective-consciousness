/**
 * FCC Benchmark Runner
 * 
 * Quick test script to run FCC on hard questions and evaluate output.
 * 
 * Usage:
 *   npm run fcc:bench
 *   or
 *   ts-node scripts/run-fcc-benchmarks.ts
 */

import { runFCCQuery } from '../fcc/core/fccEngine';
import { FCCQuestionContext } from '../fcc/core/types';

/**
 * Benchmark questions for each FCC mode
 */
const BENCHMARK_QUESTIONS: FCCQuestionContext[] = [
  // Pipeline Diagnosis
  {
    mode: 'pipeline_diagnosis',
    question: 'What are the main scalability bottlenecks in Night Factory if we want 1000 concurrent full pipelines?',
    relatedFiles: ['orchestrator.ts', 'config.ts'],
  },
  
  // Agent Output Critique
  {
    mode: 'agent_output_critique',
    question: 'Which agent in the Night Factory pipeline is currently the weakest link, based on the codebase?',
    relatedFiles: ['orchestrator.ts', 'lib/fcc/clients'],
  },
  
  // Meta Prompt Architect
  {
    mode: 'meta_prompt_architect',
    question: 'How should I redesign the Planner prompt to be more deterministic and avoid vague specs?',
    currentPrompt: 'You are a planning agent. Create a plan for the user.',
    desiredBehavior: 'Should produce deterministic, step-by-step plans with clear validation criteria',
    relatedFiles: ['orchestrator.ts'],
  },
  
  // Additional pipeline diagnosis
  {
    mode: 'pipeline_diagnosis',
    question: 'What are the potential failure modes in the current orchestrator implementation?',
    relatedFiles: ['orchestrator.ts'],
    logs: 'Sample log: [INFO] Starting pipeline stage planner...',
  },
  
  // Additional agent critique
  {
    mode: 'agent_output_critique',
    question: 'Analyze the agent output quality and identify any hallucinations or spec drift.',
    agentOutput: 'Sample agent output: Created plan with 5 steps...',
    agentName: 'planner',
    relatedFiles: ['orchestrator.ts'],
  },
];

/**
 * Run a single benchmark question
 */
async function runBenchmark(ctx: FCCQuestionContext, index: number): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log(`BENCHMARK ${index + 1}/${BENCHMARK_QUESTIONS.length}`);
  console.log('='.repeat(80));
  console.log(`Mode: ${ctx.mode}`);
  console.log(`Question: ${ctx.question}`);
  if (ctx.relatedFiles) {
    console.log(`Related Files: ${ctx.relatedFiles.join(', ')}`);
  }
  console.log('');

  try {
    const startTime = Date.now();
    const report = await runFCCQuery(ctx);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Analysis completed in ${duration}ms`);
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ${report.summary.substring(0, 200)}${report.summary.length > 200 ? '...' : ''}`);
    console.log(`\n🎯 RISK SCORE: ${report.overallRiskScore}/100`);
    console.log(`📈 CONFIDENCE: ${report.confidence}/100`);
    
    if (report.assumptions.length > 0) {
      console.log(`\n💭 ASSUMPTIONS (${report.assumptions.length}):`);
      report.assumptions.slice(0, 3).forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.substring(0, 100)}${a.length > 100 ? '...' : ''}`);
      });
    }

    console.log(`\n🔍 FINDINGS (${report.findings.length}):`);
    const topFindings = report.findings
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 3);
    
    topFindings.forEach((finding, i) => {
      console.log(`   ${i + 1}. [${finding.severity}/10] ${finding.title}`);
      console.log(`      ${finding.description.substring(0, 150)}${finding.description.length > 150 ? '...' : ''}`);
    });

    console.log(`\n💡 RECOMMENDATIONS (${report.recommendations.length}):`);
    const topRecs = report.recommendations.slice(0, 3);
    topRecs.forEach((rec, i) => {
      console.log(`   ${i + 1}. [${rec.difficulty}] ${rec.title}`);
      console.log(`      ${rec.description.substring(0, 150)}${rec.description.length > 150 ? '...' : ''}`);
    });

    if (report.metadata) {
      console.log(`\n📋 METADATA:`);
      console.log(`   Execution time: ${report.metadata.executionTimeMs}ms`);
      console.log(`   Files scanned: ${report.metadata.repoFilesScanned}`);
      if (report.metadata.modelsUsed) {
        console.log(`   Models used: ${report.metadata.modelsUsed.join(', ')}`);
      }
    }

  } catch (error) {
    console.error(`\n❌ Benchmark failed:`);
    console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`\n   Stack: ${error.stack.substring(0, 300)}...`);
    }
  }
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('🚀 FCC Benchmark Runner');
  console.log(`Running ${BENCHMARK_QUESTIONS.length} benchmark questions...\n`);

  const results: { success: number; failed: number } = { success: 0, failed: 0 };

  for (let i = 0; i < BENCHMARK_QUESTIONS.length; i++) {
    try {
      await runBenchmark(BENCHMARK_QUESTIONS[i], i);
      results.success++;
    } catch (error) {
      results.failed++;
      console.error(`\n❌ Benchmark ${i + 1} failed:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 BENCHMARK SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success rate: ${((results.success / BENCHMARK_QUESTIONS.length) * 100).toFixed(1)}%`);
  console.log('');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { BENCHMARK_QUESTIONS, runBenchmark };

