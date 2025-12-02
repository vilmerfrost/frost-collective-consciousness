# Diagnosing "Failed to fetch" Error

## Status Check

✅ **GET endpoint works**: Server is running and accessible
✅ **maxDuration set**: 10 minutes (600 seconds)  
✅ **Client timeout set**: 10 minutes (600000ms)
✅ **Error handling**: Comprehensive logging in place

## What "Failed to fetch" Means

"Failed to fetch" occurs when the fetch request itself fails **before getting ANY response**. This is different from:
- Timeout (would show timeout message)
- Error response (would show HTTP error status)

## Most Likely Causes

### 1. Request Never Reached Server
- **Check**: Look for `[FCC API] POST request received` in server logs
- **If missing**: Request was blocked/aborted before reaching server
- **Solutions**: 
  - Check browser Network tab for request status
  - Check if browser blocked the request
  - Try using curl instead to test

### 2. Server Crashed During Request
- **Check**: Server console for error messages/stack traces
- **If found**: Server crashed while processing
- **Solutions**:
  - Restart dev server
  - Check for import/module errors
  - Check API key configuration

### 3. Browser Timeout/Abort
- **Check**: Browser DevTools → Network tab
- **Look for**: Request status (pending, failed, cancelled)
- **Solutions**:
  - Check if request was cancelled manually
  - Try different browser
  - Check browser console for additional errors

### 4. Network Connectivity Issue
- **Check**: Try GET endpoint (already confirmed working)
- **Test**: `curl -X POST http://localhost:3000/api/fcc -H "Content-Type: application/json" -d '{"mode":"pipeline_diagnosis","question":"test"}'`
- **Solutions**:
  - Restart dev server
  - Check localhost connectivity
  - Try different port

## Diagnostic Steps

### Step 1: Test with Minimal Request

```bash
curl -X POST http://localhost:3000/api/fcc \
  -H "Content-Type: application/json" \
  -d '{"mode":"pipeline_diagnosis","question":"test"}' \
  --max-time 600 \
  -v
```

Watch server console for:
- `[FCC API] POST request received`
- Any error messages

### Step 2: Check Browser Network Tab

1. Open DevTools → Network tab
2. Make request from UI
3. Find the `/api/fcc` request
4. Check:
   - Request status (pending/failed/cancelled)
   - Response status code
   - Error details

### Step 3: Check Server Console

While making request, watch server console for:
- `[FCC API] POST request received` ← Should appear immediately
- `[FCC API] Request body parsed successfully`
- `[FCC API] Processing request...`
- Any error messages or stack traces

### Step 4: Test Question Length

Very long questions might cause issues. Try with a short question first:
- Short: "test"
- Medium: "What are the main issues?"
- Long: Your full question

## Common Scenarios

### Scenario A: Request Never Received
**Symptoms**: No `[FCC API] POST request received` in server logs  
**Cause**: Browser blocked/cancelled request before it reached server  
**Fix**: Check browser Network tab, try curl test

### Scenario B: Server Crashed
**Symptoms**: Server logs show error, GET endpoint stops working  
**Cause**: Server crashed during request processing  
**Fix**: Restart dev server, check for module errors

### Scenario C: Timeout Before Response
**Symptoms**: Request appears in server logs, processes, but client times out  
**Cause**: Request takes longer than timeout (unlikely with 10min timeout)  
**Fix**: Check if DeepSeek R1 is taking longer than expected

## Quick Test Script

Create `test-post-minimal.sh`:

```bash
#!/bin/bash
curl -X POST http://localhost:3000/api/fcc \
  -H "Content-Type: application/json" \
  -d '{"mode":"pipeline_diagnosis","question":"test"}' \
  --max-time 600 \
  -v 2>&1 | tee /tmp/fcc-test.log
```

Run: `./test-post-minimal.sh`

## What to Share for Debugging

If issue persists, share:

1. **Server console logs** (especially `[FCC API]` messages)
2. **Browser console errors** (full error message)
3. **Browser Network tab** (request status and details)
4. **curl test results** (if you ran it)
5. **Question length** (character count)

## Expected Behavior

✅ Normal flow:
1. Server logs: `[FCC API] POST request received`
2. Server logs: Processing stages
3. Request completes in 6-8 minutes
4. Response returned with FCCReport

❌ If "Failed to fetch" appears:
- Request failed before getting response
- Check diagnostics above

