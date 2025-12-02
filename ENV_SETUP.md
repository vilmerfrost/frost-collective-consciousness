# Environment Variables Setup Guide

## Create `.env.local` file

Create a file named `.env.local` in the root directory of your project with the following API keys:

```bash
# Moonshot / Kimi K2 Thinking
MOONSHOT_API_KEY=sk-...

# DeepSeek V3.2 (deepseek-chat)
DEEPSEEK_API_KEY=sk-...

# Gemini 2.0 Flash (Google AI Studio / Gemini API)
GEMINI_API_KEY=...

# Perplexity Sonar (reasoning/search)
PERPLEXITY_API_KEY=sk-...
```

## Important Notes

- ⚠️ **Never commit `.env.local` to git** - it's already in `.gitignore`
- ✅ Next.js API routes (like `/api/fcc`) read `.env.local` when you run `npm run dev`
- ✅ After adding these keys → **restart your dev server**

## How to Get Each API Key

### 1. MOONSHOT_API_KEY - For Kimi K2 Thinking (Lead Thinker)
- **Get it from:** https://platform.moonshot.cn/
- **Steps:**
  1. Sign up/log in to Moonshot Platform
  2. Go to API Keys section
  3. Create a new API key
  4. Copy the key (starts with `sk-`) and paste it as `MOONSHOT_API_KEY`
- **Model used:** `kimi-k2-thinking` (Long-term thinking Kimi K2 version, supports 256k context)
- **Note:** Used as the primary lead thinker model for deep reasoning

### 2. DEEPSEEK_API_KEY - For DeepSeek V3.2 (Reviewer)
- **Get it from:** https://platform.deepseek.com/
- **Steps:**
  1. Sign up/log in to DeepSeek Platform
  2. Go to API Keys section
  3. Create a new API key
  4. Copy the key (starts with `sk-`) and paste it as `DEEPSEEK_API_KEY`
- **Model used:** `deepseek-chat` (model version: DeepSeek-V3.2)
- **Note:** Used as the main workhorse reviewer model

### 3. GEMINI_API_KEY - For Gemini 2.0 Flash (Speed)
- **Get it from:** https://aistudio.google.com/app/apikey
- **Steps:**
  1. Sign up/log in with your Google account
  2. Click "Get API Key"
  3. Create a new API key or use existing one
  4. Copy the key and paste it as `GEMINI_API_KEY`
- **Model used:** `gemini-2.0-flash`
- **Note:** Used for fast summarization and sanity checks. Free tier available with generous limits.

### 4. PERPLEXITY_API_KEY - For Perplexity Sonar (Research)
- **Get it from:** https://www.perplexity.ai/settings/api
- **Steps:**
  1. Sign up/log in to Perplexity
  2. Go to Settings → API Keys
  3. Create a new API key
  4. Copy the key (starts with `sk-`) and paste it as `PERPLEXITY_API_KEY`
- **Model used:** `sonar-reasoning`
- **Note:** Used for research and web-enhanced reasoning when enabled

## Example `.env.local` file

```bash
# Moonshot / Kimi K2 Thinking
MOONSHOT_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# DeepSeek V3.2 (deepseek-chat)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Gemini 2.0 Flash (Google AI Studio / Gemini API)
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Perplexity Sonar (reasoning/search)
PERPLEXITY_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Model Roles in FCC

The four models are assigned specific roles in the FCC system:

- **🧠 Lead Thinker**: Kimi K2 Thinking (Moonshot) - Deep reasoning, long context
- **🤖 Reviewer**: DeepSeek V3.2 - Main workhorse, code analysis
- **⚡ Speed**: Gemini 2.0 Flash - Fast summarization, sanity checks
- **🌐 Research**: Perplexity Sonar Reasoning - Web-enhanced research (optional)

## Verify Your Setup

After creating `.env.local`, restart your dev server and check:

```bash
# Check health endpoint
curl http://localhost:3000/api/fcc/health
```

Or visit in browser: `http://localhost:3000/api/fcc/health`

This will show which API keys are configured correctly.

## Partial Configuration

The system will work with partial keys - you'll get errors for missing providers, but enabled models will still function. You can disable models in `fcc/core/modelRouter.ts` if you don't have all API keys.
