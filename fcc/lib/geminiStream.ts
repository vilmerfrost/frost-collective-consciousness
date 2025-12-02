/**
 * FCC v4.4 - Gemini Streaming Wrapper
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ModelConfig } from '../core/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Invoke Gemini with streaming support
 */
export async function invokeGeminiStream(
  model: ModelConfig,
  prompt: string,
  systemPrompt?: string,
  timeoutMs: number = 90000
): Promise<{ rawText: string; metadata: any }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const genModel = genAI.getGenerativeModel({ 
    model: model.providerModelName || 'gemini-2.0-flash-exp',
  });

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      genModel.generateContentStream(fullPrompt),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Gemini stream timed out after ${timeoutMs}ms`));
        });
      }),
    ]);

    clearTimeout(timeoutId);

    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
    }

    return {
      rawText: fullText,
      metadata: {
        modelUsed: model.id,
        streaming: true,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new Error(`Gemini stream timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function invokeGeminiWithRetry(
  model: ModelConfig,
  prompt: string,
  systemPrompt?: string,
  maxRetries: number = 2,
  timeoutMs: number = 90000
): Promise<{ rawText: string; metadata: any }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const backoffMs = attempt === 0 ? 0 : Math.min(200 * Math.pow(2, attempt - 1), 1600);
      if (backoffMs > 0) {
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
      
      return await invokeGeminiStream(model, prompt, systemPrompt, timeoutMs);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  throw lastError || new Error('Gemini invocation failed after retries');
}

