#!/bin/bash

# Simple FCC API test without complex quoting issues

echo "🧪 Testing FCC API (simple version)"
echo "===================================="
echo ""

echo "Sending POST request to /api/fcc..."
echo ""

# Use a temp file to avoid quoting issues
cat > /tmp/fcc-test.json << 'JSON'
{
  "mode": "pipeline_diagnosis",
  "question": "What are the main issues in this codebase?"
}
JSON

curl -X POST http://localhost:3000/api/fcc \
  -H "Content-Type: application/json" \
  --data @/tmp/fcc-test.json \
  --max-time 300 \
  -w "\n\n⏱️  Total time: %{time_total}s\n📊 HTTP Status: %{http_code}\n" \
  2>&1

echo ""
echo "===================================="
echo "✅ Request sent!"
echo ""
echo "💡 This may take 2-5 minutes to complete"
echo "💡 Check server console for progress logs"
echo "💡 Look for '[FCC API]' prefixed messages"

