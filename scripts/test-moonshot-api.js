#!/usr/bin/env node
/**
 * Test script to verify Moonshot API key
 * Usage: node scripts/test-moonshot-api.js
 */

const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
let MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;

// Allow passing API key as first argument for testing
if (process.argv[2] && process.argv[2].startsWith('sk-')) {
  MOONSHOT_API_KEY = process.argv[2];
  console.log('🔑 Using API key from command line argument\n');
} else if (!MOONSHOT_API_KEY && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MOONSHOT_API_KEY=(.+)$/m);
  if (match) {
    MOONSHOT_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
  }
}
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

async function testMoonshotAPI() {
  console.log('🧪 Testing Moonshot API Key...\n');

  // Check if API key exists
  if (!MOONSHOT_API_KEY) {
    console.error('❌ MOONSHOT_API_KEY is not set in .env.local');
    process.exit(1);
  }

  // Validate key format
  if (!MOONSHOT_API_KEY.startsWith('sk-')) {
    console.error('❌ API key should start with "sk-"');
    console.error(`   Current key starts with: "${MOONSHOT_API_KEY.substring(0, 5)}"`);
    process.exit(1);
  }

  if (MOONSHOT_API_KEY.length < 30) {
    console.error('❌ API key seems too short');
    console.error(`   Key length: ${MOONSHOT_API_KEY.length} chars`);
    process.exit(1);
  }

  console.log('✅ API key format looks correct');
  console.log(`   Length: ${MOONSHOT_API_KEY.length} chars`);
  console.log(`   Preview: ${MOONSHOT_API_KEY.substring(0, 6)}...${MOONSHOT_API_KEY.substring(MOONSHOT_API_KEY.length - 4)}\n`);

  // Test with models endpoint first (simpler check)
  console.log('📡 Testing models endpoint...');
  try {
    const modelsRes = await fetch('https://api.moonshot.cn/v1/models', {
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
      },
    });

    const modelsText = await modelsRes.text();
    if (!modelsRes.ok) {
      console.error(`❌ Models endpoint failed: ${modelsRes.status}`);
      console.error(`   Response: ${modelsText}`);
      process.exit(1);
    }

    const models = JSON.parse(modelsText);
    console.log(`✅ Models endpoint works! Found ${models.data?.length || 0} models\n`);
  } catch (error) {
    console.error(`❌ Models endpoint error: ${error.message}`);
    process.exit(1);
  }

  // Test chat completions
  console.log('💬 Testing chat completions with kimi-k2-thinking...');
  try {
    const response = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'kimi-k2-thinking',
        messages: [
          {
            role: 'user',
            content: 'Say hello in one word',
          },
        ],
        temperature: 0.2,
      }),
    });

    const text = await response.text();
    
    if (!response.ok) {
      console.error(`❌ Chat completions failed: ${response.status}`);
      console.error(`   Response: ${text}`);
      
      if (response.status === 401) {
        console.error('\n🔍 Troubleshooting 401 error:');
        console.error('   1. Verify the API key is correct on https://platform.moonshot.cn/');
        console.error('   2. Check that billing is enabled and has credits');
        console.error('   3. Ensure the key has not expired');
        console.error('   4. Try creating a NEW API key and update .env.local');
        console.error('   5. Restart your dev server after updating .env.local');
      }
      
      process.exit(1);
    }

    const json = JSON.parse(text);
    const content = json.choices?.[0]?.message?.content || 'No content';
    
    console.log(`✅ Chat completions works!`);
    console.log(`   Response: "${content.trim()}"`);
    console.log(`   Model: ${json.model || 'N/A'}`);
    console.log(`   Tokens used: ${json.usage?.total_tokens || 'N/A'}\n`);
    
    console.log('🎉 All tests passed! Your Moonshot API key is working correctly.');
    
  } catch (error) {
    console.error(`❌ Chat completions error: ${error.message}`);
    process.exit(1);
  }
}

testMoonshotAPI().catch(console.error);
