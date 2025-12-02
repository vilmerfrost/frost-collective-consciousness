/**
 * Gemini 2.5 Flash Client via Google AI Studio
 * Free tier available - requires GEMINI_API_KEY
 * 
 * Using GoogleGenAI (not GoogleGenerativeAI) from @google/genai package
 */

import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Get your free key from https://aistudio.google.com/app/apikey");
    }

    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

export async function callGemini(
  input: string,
  systemPrompt?: string
): Promise<string> {
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ parts: [{ text: input }] }],
      config: { 
        systemInstruction: systemPrompt || "You are a helpful AI assistant."
      }
    });

    const text = response.text || "";

    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    return text.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini client error: ${error.message}`);
    }
    throw new Error("Unknown error in Gemini client");
  }
}
