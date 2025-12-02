#!/bin/bash

echo "🧪 Quick FCC API Test (with timeout)"
echo "====================================="
echo ""

# Test with a very short question
echo "Testing POST /api/fcc with minimal request..."
echo ""

curl -X POST http://localhost:3000/api/fcc \
  -H "Content-Type: application/json" \
  -d '{"mode":"pipeline_diagnosis","question":"test"}' \
  --max-time 60 \
  -w "\n\n⏱️  Total time: %{time_total}s\n📊 HTTP Status: %{http_code}\n" \
  2>&1 | tee /tmp/fcc-test-output.log

echo ""
echo "====================================="
echo "✅ Test complete!"
echo ""
echo "💡 Check server console for '[FCC API]' logs"
echo "💡 Full output saved to: /tmp/fcc-test-output.log"

