/**
 * Llama 3.1 70B Client via Groq API
 * Free tier available - requires GROQ_API_KEY
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// Try multiple Groq models in order of preference
const GROQ_MODELS = [
  "llama-3.1-8b-instant",        // Fastest, most reliable
  "llama-3.1-70b-versatile",     // More capable fallback
  "mixtral-8x7b-32768",          // Alternative if Llama unavailable
];

export async function callLlama(
  input: string,
  systemPrompt?: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set. Get your free key from https://console.groq.com/keys");
  }

  const messages = [];
  
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }
  
  messages.push({
    role: "user",
    content: input,
  });

  // Try each model in order until one works
  let lastError: Error | null = null;
  
  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle common Groq errors
        if (response.status === 429) {
          // Rate limit - try next model
          console.warn(`Rate limited on ${model}, trying next model...`);
          continue;
        } else if (response.status === 401) {
          // Invalid API key - don't try other models
          throw new Error(`Invalid API key. Please check your GROQ_API_KEY in .env.local`);
        } else if (response.status === 400) {
          // Bad request - might be model-specific, try next
          console.warn(`Invalid request for ${model}, trying next model...`);
          lastError = new Error(`Invalid request: ${errorText}`);
          continue;
        }
        
        // Other errors - try next model
        lastError = new Error(`Groq API error (${response.status}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        // Unexpected format - try next model
        lastError = new Error(`Unexpected response format from Groq API`);
        continue;
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      // Network or other errors - try next model (unless it's auth error)
      if (error instanceof Error && error.message.includes("Invalid API key")) {
        throw error; // Don't try other models if API key is wrong
      }
      lastError = error instanceof Error ? error : new Error("Unknown error");
      continue;
    }
  }
  
  // If all models failed, throw the last error
  if (lastError) {
    throw new Error(`Llama client error: All models failed. Last error: ${lastError.message}`);
  }
  
  throw new Error("Llama client error: No models available");
}

