/**
 * FCC Model Invoker
 * 
 * Real API implementations for all four providers:
 * - Moonshot / Kimi K2 Thinking
 * - DeepSeek V3.2
 * - Gemini 2.0 Flash
 * - Perplexity Sonar
 */

import type { ModelConfig } from './types';

/**
 * Input for model invocation
 */
export interface ModelInvokerInput {
  model: ModelConfig;
  prompt: string;
  systemPrompt?: string;
}

/**
 * Output from model invocation
 */
export interface ModelInvokerOutput {
  rawText: string;
  metadata?: {
    tokensUsed?: number;
    modelUsed?: string;
    latencyMs?: number;
  };
}

/**
 * Model invoker interface
 */
export interface ModelInvoker {
  invoke(input: ModelInvokerInput): Promise<ModelInvokerOutput>;
}

/**
 * Main model invoker - routes to appropriate provider
 */
export const modelInvoker: ModelInvoker = {
  async invoke({ model, prompt, systemPrompt }) {
    switch (model.provider) {
      case 'moonshot':
        return invokeMoonshotKimi(model, prompt, systemPrompt);
      case 'deepseek':
        return invokeDeepSeek(model, prompt, systemPrompt);
      case 'gemini':
        return invokeGemini(model, prompt, systemPrompt);
      case 'perplexity':
        return invokePerplexity(model, prompt, systemPrompt);
      default:
        // Fallback – should almost never be used
        return {
          rawText: `[MODEL INVOKER ERROR] Unknown provider: ${model.provider}\nModel ID: ${model.id}\nPrompt length: ${prompt.length} chars`,
        };
    }
  },
};

/**
 * 🧠 Moonshot / Kimi K2 Thinking
 * API: https://api.moonshot.cn/v1/chat/completions
 * Model: kimi-k2-thinking (Long-term thinking Kimi K2 version, 256k context)
 */
async function invokeMoonshotKimi(
  model: ModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<ModelInvokerOutput> {
  // ALWAYS use MOONSHOT_API_KEY - never KIMI_API_KEY
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey || apiKey === 'sk-...' || apiKey.trim().length === 0) {
    throw new Error('Missing API key: MOONSHOT_API_KEY. Please set it in your .env.local file. See ENV_SETUP.md for instructions.');
  }

  // Debug: Log API key presence and details (first 10 chars only for security)
  console.log(`[Moonshot Invoker] Using environment variable: MOONSHOT_API_KEY (NOT KIMI_API_KEY)`);
  console.log(`[Moonshot Invoker] API key present: ${apiKey ? 'YES' : 'NO'}`);
  console.log(`[Moonshot Invoker] API key preview: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING'}`);
  console.log(`[Moonshot Invoker] API key length: ${apiKey ? apiKey.length : 0} chars`);
  console.log(`[Moonshot Invoker] API key starts with 'sk-': ${apiKey.startsWith('sk-')}`);
  console.log(`[Moonshot Invoker] Using model: ${model.providerModelName}`);
  console.log(`[Moonshot Invoker] Provider: ${model.provider}`);

  const startTime = Date.now();

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

  try {
    const requestBody = {
        model: model.providerModelName ?? 'kimi-k2-thinking',
      messages: [
        {
          role: 'system',
          content: systemPrompt ?? 'You are the Frost Collective Consciousness (FCC). Always respond with a valid JSON FCCReport object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    };

    console.log(`[Moonshot Invoker] Calling ${MOONSHOT_API_URL} with model: ${requestBody.model}`);

    const res = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      let errorMessage = `Moonshot API error (${res.status}): ${text}`;
      
      // Provide helpful guidance for authentication errors
      if (res.status === 401) {
        const apiKeyPreview = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET';
        errorMessage = `Moonshot API authentication failed (401): Invalid API key.\n\n` +
          `DEBUG INFO:\n` +
          `- API Key variable used: MOONSHOT_API_KEY ✓ (correct, not KIMI_API_KEY)\n` +
          `- API Key present: ${apiKey ? 'YES' : 'NO'}\n` +
          `- API Key preview: ${apiKeyPreview}\n` +
          `- API Key length: ${apiKey ? apiKey.length : 0} chars\n` +
          `- API Key starts with 'sk-': ${apiKey.startsWith('sk-') ? 'YES' : 'NO'}\n` +
          `- API endpoint: ${MOONSHOT_API_URL}\n` +
          `- Model name: ${requestBody.model}\n\n` +
          `TROUBLESHOOTING:\n` +
          `1. Go to https://platform.moonshot.cn/ and verify:\n` +
          `   - Your API key is active and not expired\n` +
          `   - Billing is enabled and has credits\n` +
          `   - You have access to Kimi K2 Thinking model\n\n` +
          `2. Try creating a NEW API key:\n` +
          `   - Go to https://platform.moonshot.cn/\n` +
          `   - Create a fresh API key\n` +
          `   - Copy it EXACTLY (no spaces, no quotes)\n` +
          `   - Update .env.local: MOONSHOT_API_KEY=sk-...\n` +
          `   - Restart dev server completely\n\n` +
          `3. Verify the key works:\n` +
          `   curl https://api.moonshot.cn/v1/chat/completions \\\n` +
          `     -H "Authorization: Bearer YOUR_KEY" \\\n` +
          `     -H "Content-Type: application/json" \\\n` +
          `     -d '{"model":"kimi-k2-thinking","messages":[{"role":"user","content":"test"}]}'\n\n` +
          `Raw error: ${text}`;
      }
      
      throw new Error(errorMessage);
    }

    const json: any = await res.json();
    const rawText: string = json.choices?.[0]?.message?.content ?? JSON.stringify(json);

    return {
      rawText,
      metadata: {
        tokensUsed: json.usage?.total_tokens,
        modelUsed: json.model,
        latencyMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Moonshot API request timed out after 30 seconds');
    }
    throw error;
  }
}

/**
 * 🤖 DeepSeek V3.2
 * API: https://api.deepseek.com/chat/completions (OpenAI-compatible)
 * Model: deepseek-chat (model version: DeepSeek-V3.2)
 */
async function invokeDeepSeek(
  model: ModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<ModelInvokerOutput> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'sk-...' || apiKey.trim().length === 0) {
    throw new Error('Missing API key: DEEPSEEK_API_KEY. Please set it in your .env.local file. See ENV_SETUP.md for instructions.');
  }

  const startTime = Date.now();

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.providerModelName ?? 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt ?? 'You are the Frost Collective Consciousness (FCC). Always respond with a valid JSON FCCReport object.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek API error (${res.status}): ${text}`);
    }

    const json: any = await res.json();
    const rawText: string = json.choices?.[0]?.message?.content ?? JSON.stringify(json);

    return {
      rawText,
      metadata: {
        tokensUsed: json.usage?.total_tokens,
        modelUsed: json.model,
        latencyMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('DeepSeek API request timed out after 30 seconds');
    }
    throw error;
  }
}

/**
 * ⚡ Gemini 2.0 Flash via Gemini API
 * API: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
 */
async function invokeGemini(
  model: ModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<ModelInvokerOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Missing API key: GEMINI_API_KEY. Please set it in your .env.local file. See ENV_SETUP.md for instructions.');
  }

  const startTime = Date.now();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${
    model.providerModelName ?? 'gemini-2.0-flash'
  }:generateContent?key=${apiKey}`;

  // Combine system prompt and user prompt for Gemini
  const fullPrompt = systemPrompt 
    ? `${systemPrompt}\n\n${prompt}`
    : prompt;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${text}`);
    }

    const json: any = await res.json();
    const candidate = json.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const rawText =
      parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join('\n') || JSON.stringify(json);

    return {
      rawText,
      metadata: {
        tokensUsed: json.usageMetadata?.totalTokenCount,
        modelUsed: model.providerModelName,
        latencyMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini API request timed out after 30 seconds');
    }
    throw error;
  }
}

/**
 * 🌐 Perplexity Sonar – reasoning / search
 * API: https://api.perplexity.ai/chat/completions (OpenAI-compatible)
 */
async function invokePerplexity(
  model: ModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<ModelInvokerOutput> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('Missing API key: PERPLEXITY_API_KEY. Set it in environment variables.');
  }

  const startTime = Date.now();

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.providerModelName ?? 'sonar-reasoning',
        messages: [
          {
            role: 'system',
            content: systemPrompt ?? 'You are the Frost Collective Consciousness (FCC). Always respond with a valid JSON FCCReport object.',
          },
          { role: 'user', content: prompt },
        ],
        // Web search mode can be controlled via extra params,
        // but we keep it basic here.
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Perplexity API error (${res.status}): ${text}`);
    }

    const json: any = await res.json();
    const rawText: string = json.choices?.[0]?.message?.content ?? JSON.stringify(json);

    return {
      rawText,
      metadata: {
        tokensUsed: json.usage?.total_tokens,
        modelUsed: json.model,
        latencyMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Perplexity API request timed out after 30 seconds');
    }
    throw error;
  }
}
