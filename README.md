<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Frost Collective Consciousness (FCC)

Multi-agent consensus system using free AI models.

## Architecture

FCC uses three AI nodes with weighted consensus:

- **ALPHA (40% weight)** - Architect node using Qwen 2.5 72B via HuggingFace
- **BETA (35% weight)** - Visionary node using Gemini 2.5 Flash via Google AI Studio  
- **OMEGA (25% weight)** - Warden node using Llama 3.1 70B via Groq

## Setup

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure API keys in `.env.local`:
   ```bash
   # HuggingFace - Qwen 2.5 72B (ALPHA)
   HF_TOKEN=your_huggingface_token_here
   # Get from: https://huggingface.co/settings/tokens

   # Google AI Studio - Gemini 2.5 Flash (BETA)
   GEMINI_API_KEY=your_gemini_api_key_here
   # Get from: https://aistudio.google.com/app/apikey

   # Groq - Llama 3.1 70B (OMEGA)
   GROQ_API_KEY=your_groq_api_key_here
   # Get from: https://console.groq.com/keys
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000/fcc](http://localhost:3000/fcc) to use the FCC interface.

## API Routes

- `POST /api/fcc/run` - Run FCC consensus on input
- `GET /api/fcc/nodes` - Get node metadata
- `GET /api/fcc/health` - Check API key configuration

## Features

- ✅ Parallel execution of all three nodes
- ✅ Weighted consensus building
- ✅ Hallucination checking via OMEGA critique
- ✅ Error handling and graceful degradation
- ✅ 100% free API usage (no paid tiers required)
