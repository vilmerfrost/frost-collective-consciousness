# FCC v4.1 Stress Test Prompt

## Usage

Copy this JSON and send as POST request to `/api/fcc`:

```json
{
  "mode": "pipeline_diagnosis",
  "question": "Run FCC v4.1 FULL REPOSITORY STRESS TEST on the following GitHub repo:\n\nhttps://github.com/vilmerfrost/frost-night-factory/tree/auto/bug-export-crash\n\nYour job:\n- Analyze architecture, orchestration, reliability, latency, cost, code structure, and prompt pipeline.\n- Identify real flaws ONLY from verified repository files.\n- DO NOT infer files that do not exist.\n- DO NOT reference founder psychology, personal limits or daily hours.\n\nMain Question:\nGiven the current architecture, is it beneficial to integrate FCC as an internal agent inside Night Factory, or would this add unnecessary complexity?\n\nRequirements:\n- Evidence must cite file paths found by repoScanner\n- Mark missing files as [NOT FOUND IN REPOSITORY]\n- Findings: 8–12 items minimum\n- Recommendations: 4–6 items\n- Metadata must include reportFormatVersion = '4.1'\n- Keep tone: objective, engineering-focused\n\nReturn a full FCCReport JSON."
}
```

## Features

- Neutral, objective tone
- No personalization references
- Focus on technical analysis
- Repo verification required
- Engineering-focused recommendations

