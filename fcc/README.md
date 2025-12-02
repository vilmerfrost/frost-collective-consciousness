# Frost Collective Consciousness (FCC) v1.7 — BRUTAL MODE

FCC v1.7 is an internal consultant subsystem for Frost Night Factory operating in **BRUTAL MODE**. It provides evidence-based, multi-model analysis of the codebase, pipeline, and agent behavior with **zero fluff, zero corporate speak, and brutal honesty**.

## What is FCC v1.7?

FCC is **NOT** a generic chat assistant. It is a **fused analysis engine** operating in **BRUTAL MODE** that:

- ✅ Reads and understands the actual codebase (repo-aware)
- ✅ Routes questions through a panel of specialized models (Kimi K2 Thinking, DeepSeek V3.2, Gemini 2.0 Flash, Perplexity Sonar)
- ✅ Returns structured, evidence-based reports with **hard facts, inferred risks, and final verdicts**
- ✅ Anti-hallucination by design (always cites file paths with line numbers)
- ✅ **Always chooses a side** — no neutral positions, no hedging
- ✅ Models founder constraints (2-4h/day focus, energy fluctuations, context-switching costs)
- ✅ Prioritizes **MRR increase or chaos reduction** — everything else is "IGNORE THIS"
- ✅ Callable programmatically from Night Factory pipeline

## BRUTAL MODE Features

- **Zero fluff, zero consultant smooth talk**
- **Hard constraints modeling** (founder time, energy, context-switching)
- **Evidence-based reasoning only** (quotes from repo files, explicit assumptions)
- **Strategic founder-coach perspective** (thinks like a systems architect, cold risk analyst, personal optimization engine)
- **Clear thesis and verdict** (always chooses A/B/C/hybrid, never neutral)
- **Harsh critique of weaknesses** (tells you what to STOP doing)
- **12-month roadmap with "IGNORE THIS" sections**

## Model Panel

FCC v1.7 uses a 4-model panel with automatic fallback:

### Primary Models

1. **🧠 Kimi K2 Thinking (Moonshot)** — Lead Thinker
   - Provider: `moonshot`
   - Model ID: `kimi-k2-thinking`
   - Role: Deep reasoning, strategic analysis
   - API Key: `MOONSHOT_API_KEY`

2. **🤖 DeepSeek V3.2** — Reviewer
   - Provider: `deepseek`
   - Model ID: `deepseek-chat`
   - Role: Code analysis, technical review
   - API Key: `DEEPSEEK_API_KEY`

3. **⚡ Gemini 2.0 Flash** — Speed Layer
   - Provider: `gemini`
   - Model ID: `gemini-2.0-flash`
   - Role: Fast summarization, sanity checks
   - API Key: `GEMINI_API_KEY`

4. **🌐 Perplexity Sonar Reasoning** — Research
   - Provider: `perplexity`
   - Model ID: `sonar-reasoning`
   - Role: Web-enhanced research, external context
   - API Key: `PERPLEXITY_API_KEY`

### Fallback Logic

- If a model lacks its API key, **silently skip** and use the next available model
- If the primary model fails or times out, **automatically try** other models in the panel
- Only fails if **all models** are unavailable or fail

### Mode-Specific Panels

- **Pipeline Diagnosis**: Kimi K2 Thinking + DeepSeek V3.2 + Gemini 2.0 Flash
- **Agent Output Critique**: DeepSeek V3.2 + Kimi K2 Thinking + Gemini 2.0 Flash
- **Meta Prompt Architect**: Kimi K2 Thinking + DeepSeek V3.2 + Gemini 2.0 Flash

## Quick Start

### 1. Environment Setup

Create `.env.local` in the project root:

```bash
# Moonshot / Kimi K2 Thinking
MOONSHOT_API_KEY=sk-...

# DeepSeek V3.2 (deepseek-chat)
DEEPSEEK_API_KEY=sk-...

# Gemini 2.0 Flash (Google AI Studio / Gemini API)
GEMINI_API_KEY=...

# Perplexity Sonar (reasoning/search)
PERPLEXITY_API_KEY=sk-...
```

**See `ENV_SETUP.md` for detailed instructions on obtaining API keys.**

### 2. Programmatic Usage

```typescript
import { requestFCCConsult } from './fcc/integrations/nightFactoryHook';
import { FCCQuestionContext } from './fcc/core/types';

const ctx: FCCQuestionContext = {
  mode: 'pipeline_diagnosis',
  question: 'Why did the planner stage fail?',
  failingStage: 'planner',
  logs: '...',
  relatedFiles: ['agent-runner/planner.ts'],
};

const report = await requestFCCConsult(ctx);
console.log('Thesis:', report.summary);
console.log('Findings:', report.findings);
console.log('Verdict:', report.notes); // Contains final verdict in BRUTAL MODE
```

### 3. Convenience Functions

```typescript
import {
  triggerFCCOnFailure,
  critiqueAgentOutput,
  architectPrompt,
} from './fcc/integrations/nightFactoryHook';

// On pipeline failure
const report = await triggerFCCOnFailure(
  'planner',
  logs,
  stackTrace,
  ['agent-runner/planner.ts']
);

// Critique agent output (BRUTAL MODE)
const critique = await critiqueAgentOutput(
  'planner',
  agentOutput,
  currentPrompt,
  ['agent-runner/planner.ts']
);

// Design prompt (with Brutal Mode requirements)
const promptDesign = await architectPrompt(
  'planner',
  currentPrompt,
  'Should produce deterministic plans',
  ['agent-runner/planner.ts']
);
```

## API Route

FCC exposes a REST API endpoint:

```bash
POST /api/fcc
Content-Type: application/json

{
  "mode": "pipeline_diagnosis",
  "question": "Why did the pipeline fail?",
  "failingStage": "planner",
  "logs": "...",
  "relatedFiles": ["agent-runner/planner.ts"]
}
```

Response:

```json
{
  "mode": "pipeline_diagnosis",
  "question": "...",
  "summary": "...",
  "assumptions": [...],
  "findings": [...],
  "recommendations": [...],
  "overallRiskScore": 75,
  "confidence": 85,
  "metadata": {
    "executionTimeMs": 1234,
    "modelsUsed": ["kimi-k2-thinking"],
    "repoFilesScanned": 150,
    "timestamp": "2025-12-01T..."
  }
}
```

## Output Format (BRUTAL MODE)

FCC returns a structured `FCCReport` with BRUTAL MODE enhancements:

```typescript
interface FCCReport {
  mode: FCCMode;
  question: string;
  summary: string; // Executive summary with THESIS
  assumptions: string[];
  findings: FCCFinding[];
  recommendations: FCCRecommendation[];
  overallRiskScore: number; // 0-100
  confidence: number; // 0-100
  notes?: string; // Contains verdict, harsh critique, roadmap in BRUTAL MODE
  metadata?: {
    executionTimeMs?: number;
    modelsUsed?: string[]; // Which models were actually used
    repoFilesScanned?: number;
    timestamp?: string;
  };
}
```

### Findings (BRUTAL MODE)

Each finding includes:
- `id`: Unique identifier
- `title`: Specific, harsh title
- `description`: Brutally honest description with evidence
- `evidence`: Array of file paths with line numbers and code quotes
- `severity`: 1-10 (10 = will cause production outage)
- `impactArea`: architecture, performance, scalability, reliability, security, ux, devx, unknown

### Recommendations (BRUTAL MODE)

Each recommendation includes:
- `id`: Unique identifier
- `title`: Action-oriented title
- `description`: Concrete recommendation with file paths
- `expectedImpact`: Direct MRR impact OR chaos reduction metric
- `difficulty`: low, medium, or high (with time estimates for solo founder)
- `relatedFindings`: IDs of related findings

## BRUTAL MODE Output Sections

FCC v1.7 reports include:

1. **Thesis**: Clear statement choosing A, B, C, or hybrid (no neutral)
2. **Hard Facts**: Only repo evidence with file paths and line numbers
3. **Inferred Risks**: Clearly marked inferences based on hard facts
4. **Final Verdict**: Chosen path with reasoning
5. **Harsh Critique**: What to STOP doing immediately
6. **12-Month Roadmap**: With "IGNORE THIS" sections for low-priority items

## Anti-Hallucination Guarantees

FCC enforces strict anti-hallucination rules:

1. **Always cites file paths with line numbers** for every important claim
2. **Quotes actual code snippets**, doesn't paraphrase
3. **Separates facts from inferences** clearly
4. **Lists assumptions** explicitly with reasoning
5. **States when something is NOT found** in the repo: "NOT FOUND IN REPOSITORY"
6. **References knowledge files** for framework details (if available)

## JSON Soft Parsing

FCC v1.7 includes robust JSON parsing:

1. **Strict JSON parsing** — tries to parse raw output as JSON first
2. **Regex JSON extraction** — extracts JSON from code fences or markdown
3. **Markdown fallback** — falls back to markdown parsing if JSON fails
4. **Graceful degradation** — always returns a valid FCCReport, even if parsing is incomplete

## Model Invoker Implementation

All four providers are fully implemented:

- **Moonshot/Kimi**: `POST https://api.moonshot.cn/v1/chat/completions`
- **DeepSeek**: `POST https://api.deepseek.com/chat/completions`
- **Gemini**: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Perplexity**: `POST https://api.perplexity.ai/chat/completions`

All calls:
- Have 30-second timeouts
- Include proper error handling
- Return `rawText` with model content
- Never throw unhandled errors (FCCEngine always returns a valid FCCReport)

## Troubleshooting

### "All models failed"

- Check that at least one API key is configured in `.env.local`
- Verify API keys are valid (not `sk-...` placeholders)
- Check server logs for specific error messages
- See `ENV_SETUP.md` for API key setup instructions

### "Template not found"

- Ensure prompt templates exist in `fcc/prompts/`
- Check file paths are correct
- Restart dev server after adding new templates

### "Repository root does not exist"

- Verify you're running from the correct directory
- Pass explicit `repoRoot` parameter to `requestFCCConsult`

### Parsing errors

- FCC includes JSON soft parsing with fallbacks
- If parsing fails, check `report.notes` for raw output preview
- Structured output (JSON mode) from models is preferred but not required

## File Structure

```
/fcc/
  core/
    types.ts              # Type definitions
    repoScanner.ts        # Repo scanning logic
    modelRouter.ts        # Model panel configuration (Kimi/DeepSeek/Gemini/Perplexity)
    modelInvoker.ts       # Full API implementations for all 4 providers
    fccEngine.ts          # Main orchestration engine with fallback logic
  prompts/
    system/
      fcc_system_prompt.md  # BRUTAL MODE system prompt
    modes/
      pipeline_diagnosis.md     # 3-stage reasoning model
      agent_output_critique.md
      meta_prompt_architect.md  # Brutal Mode prompt design
  knowledge/
    README.md
    nextjs-16-notes.md
  integrations/
    nightFactoryHook.ts   # Integration functions
  README.md               # This file
```

## Configuration

FCC reads configuration from:

- **Model API keys**: Environment variables (see `.env.local` or `ENV_SETUP.md`)
- **Repo root**: `process.cwd()` by default, or pass explicitly
- **Excluded directories**: See `repoScanner.ts` for defaults

## Integration with Night Factory

FCC is designed to be called from the Night Factory pipeline:

```typescript
// In your pipeline orchestrator
import { triggerFCCOnFailure } from './fcc/integrations/nightFactoryHook';

try {
  await runStage('planner');
} catch (error) {
  // Trigger FCC analysis (BRUTAL MODE)
  const fccReport = await triggerFCCOnFailure(
    'planner',
    getLogs(),
    error.stack,
    ['agent-runner/planner.ts']
  );
  
  // Log findings (brutally honest)
  console.error('FCC Analysis:', fccReport.summary);
  fccReport.findings.forEach(f => {
    console.error(`  [${f.severity}/10] ${f.title}`);
  });
}
```

## Extending FCC

### Adding New Modes

1. Add mode to `FCCMode` type in `fcc/core/types.ts`
2. Create prompt template in `fcc/prompts/modes/[mode].md`
3. Update `getModelPanelForMode()` in `fcc/core/modelRouter.ts`

### Adding Knowledge

Add markdown files to `fcc/knowledge/` for framework-specific or domain-specific information.

## License

Part of Frost Night Factory. Internal use only.
