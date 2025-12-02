/**
 * Qwen 2.5 Client via HuggingFace Inference API
 * Free tier available - requires HF_TOKEN
 */

// Try multiple Qwen models in order of preference
const HF_MODEL_PATHS = [
  "Qwen/Qwen2.5-7B-Instruct",      // Fastest, most reliable
  "Qwen/Qwen2.5-14B-Instruct",     // Fallback 1
  "Qwen/Qwen2.5-32B-Instruct",     // Fallback 2
];

function getHFModelUrl(modelPath: string): string {
  return `https://api-inference.huggingface.co/models/${modelPath}`;
}

export async function callQwen(
  input: string,
  systemPrompt?: string
): Promise<string> {
  const apiKey = process.env.HF_TOKEN;
  
  if (!apiKey) {
    throw new Error("HF_TOKEN environment variable is not set. Get your free token from https://huggingface.co/settings/tokens");
  }

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\nUser: ${input}\nAssistant:`
    : `User: ${input}\nAssistant:`;

  // Try each model in order until one works
  let lastError: Error | null = null;
  
  for (const modelPath of HF_MODEL_PATHS) {
    try {
      const response = await fetch(getHFModelUrl(modelPath), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.7,
            top_p: 0.95,
            return_full_text: false,
          },
          options: {
            wait_for_model: true, // Wait if model is loading
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HuggingFace API error (${response.status}): ${errorText}`;
        
        // Handle common HuggingFace errors
        if (response.status === 503) {
          // Model is loading - try next model
          console.warn(`Model ${modelPath} is loading, trying next model...`);
          continue;
        } else if (response.status === 429) {
          // Rate limit - try next model
          console.warn(`Rate limited on ${modelPath}, trying next model...`);
          continue;
        }
        
        // For other errors, save and try next model
        lastError = new Error(errorMessage);
        continue;
      }

      const data = await response.json();
      
      // Handle different HuggingFace response formats
      if (Array.isArray(data)) {
        // Format: [{generated_text: "..."}]
        if (data[0]?.generated_text) {
          return data[0].generated_text.trim();
        }
        // Format: ["text"]
        if (typeof data[0] === "string") {
          return data[0].trim();
        }
      }
      
      // Format: {generated_text: "..."}
      if (data.generated_text) {
        return data.generated_text.trim();
      }

      // Format: direct string
      if (typeof data === "string") {
        return data.trim();
      }

      // Unexpected format - try next model
      lastError = new Error(`Unexpected response format from HuggingFace API`);
      continue;
    } catch (error) {
      // Network or other errors - try next model
      lastError = error instanceof Error ? error : new Error("Unknown error");
      continue;
    }
  }
  
  // If all models failed, throw the last error
  if (lastError) {
    throw new Error(`Qwen client error: All models failed. Last error: ${lastError.message}`);
  }
  
  throw new Error("Qwen client error: No models available");
}
