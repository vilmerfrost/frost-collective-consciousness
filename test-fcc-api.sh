#!/bin/bash

# Test script for FCC API endpoints

echo "🧪 Testing FCC API Endpoints"
echo "================================"
echo ""

# Test 1: GET endpoint (health check)
echo "1️⃣ Testing GET /api/fcc (health check)..."
curl -s http://localhost:3000/api/fcc | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/fcc
echo ""
echo ""

# Test 2: POST endpoint (simple query)
echo "2️⃣ Testing POST /api/fcc (simple query)..."
curl -X POST http://localhost:3000/api/fcc \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "pipeline_diagnosis",
    "question": "What are the main issues in this codebase?"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  2>&1 | head -50

echo ""
echo "================================"
echo "✅ Tests complete!"
echo ""
echo "💡 Tips:"
echo "   - Check server console for detailed logs"
echo "   - Look for '[FCC API]' prefixed messages"
echo "   - If timeout occurs, check API keys in .env.local"

