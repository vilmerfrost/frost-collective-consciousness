# FCC Request Timing Explained

## Why POST requests take 2-5 minutes

When you make a POST request to `/api/fcc`, it's doing a LOT of work:

### 1. Repository Scanning (10-30 seconds)
- Scans entire codebase
- Identifies relevant files
- Loads file content for context
- Builds repository snapshot

### 2. Model API Calls (60-90 seconds minimum)
The collaborative panel calls **3 models sequentially**:

#### Lead Thinker (DeepSeek R1)
- Analyzes the question deeply
- Creates initial draft report
- Timeout: 30 seconds
- Typical: 20-30 seconds

#### Reviewer (DeepSeek V3.2)
- Reviews Lead Thinker's output
- Finds issues and hallucinations
- Provides critique
- Timeout: 30 seconds
- Typical: 20-30 seconds

#### Synthesizer (Gemini 2.0 Flash)
- Merges Lead + Review outputs
- Creates final report
- Normalizes and structures data
- Timeout: 30 seconds
- Typical: 10-20 seconds

### 3. Processing Overhead (10-20 seconds)
- Prompt building
- JSON parsing
- Report normalization
- Error handling

## Total Expected Time

**Minimum**: ~90 seconds (if everything is fast)  
**Typical**: 2-3 minutes  
**Maximum**: 5 minutes (with timeouts/retries)

## How to Monitor Progress

### Server Console Logs

Watch for these log messages:

```
[FCC API] POST request received at 2025-12-02T12:34:39.886Z
[FCC API] Request body parsed successfully
[FCC Engine] Starting repo scan at: /path/to/repo
[FCC Engine] Scanned repo in 15234ms: 234 files, 45 directories
[FCC Engine] Prompt templates loaded in 45ms
[FCC Engine] Starting collaborative panel for pipeline_diagnosis mode
[FCC Engine] Invoking Lead Thinker (deepseek-r1) at 2025-12-02T12:35:00.000Z
[FCC Engine] Lead Thinker completed in 28456ms
[FCC Engine] Invoking Reviewer (deepseek-v3.2) at 2025-12-02T12:35:28.000Z
[FCC Engine] Reviewer completed in 19876ms
[FCC Engine] Invoking Synthesizer (gemini-2.0-flash) at 2025-12-02T12:35:48.000Z
[FCC Engine] Synthesizer completed in 12543ms
[FCC Engine] Pipeline completed in 60975ms, total execution: 76254ms
[FCC API] Success - Findings: 5, Recommendations: 3, Total time: 76254ms
```

## Common Timeouts

- **Client timeout**: 5 minutes (300 seconds)
- **Server timeout**: 5 minutes (maxDuration = 300)
- **Individual model timeout**: 30 seconds each

## Troubleshooting Slow Requests

### If request takes > 5 minutes:
1. Check API keys are valid
2. Check network connectivity
3. Check server logs for errors
4. Model APIs might be slow/down

### If request times out:
1. Check `.env.local` has all API keys:
   - `DEEPSEEK_API_KEY`
   - `GEMINI_API_KEY`
2. Check server console for error messages
3. Try reducing `relatedFiles` scope

### If repo scan is slow:
- Large repos take longer
- Consider excluding more directories
- Current limit: 50 files loaded max

## Best Practices

1. **Use the UI** instead of curl for better UX
2. **Monitor server logs** to see progress
3. **Be patient** - 2-5 minutes is normal
4. **Check API keys** if timing out

## Quick Test

Test with a minimal request:

```bash
curl -X POST http://localhost:3000/api/fcc \
  -H "Content-Type: application/json" \
  -d '{"mode":"pipeline_diagnosis","question":"test"}' \
  --max-time 300 \
  -v
```

The `-v` flag shows verbose output so you can see it's actually working.

