# FCC v4.3 Adaptive Layout Mode — Implementation Plan

## Overview

FCC v4.3 adds "Adaptive Layout Mode" where FCC outputs natural, LLM-style text instead of rigid JSON reports, while maintaining evidence verification and multi-agent reasoning.

## Key Changes

### 1. System Prompt Updates ✅
- Added v4.3 Adaptive Layout Mode section
- Updated output specification to support flexible formats
- Kept evidence verification requirements

### 2. Type System Updates ✅
- Added `adaptiveLayout?: boolean` to `FCCQuestionContext`
- Added `adaptiveText?: string` to `FCCReport`
- Added `adaptiveLayout?: boolean` to metadata

### 3. Prompt Builder Updates (In Progress)
- Lead Thinker: Add adaptive layout instructions
- Reviewer: Remove structure enforcement when adaptive
- Synthesizer: Output natural text when adaptive mode

### 4. Engine Logic (Needed)
- Check `ctx.adaptiveLayout` flag
- When true, allow natural text output
- When false, maintain JSON structure (backward compatibility)

## Implementation Strategy

**Option A: Dual Mode (Recommended)**
- Keep JSON structure for backward compatibility
- When `adaptiveLayout=true`, store natural text in `adaptiveText` field
- Summary field can also contain natural text
- API contract remains intact

**Option B: Complete Replacement**
- Break backward compatibility
- Always output natural text
- Requires API route changes

**Recommendation:** Use Option A for gradual migration.

## Status

- ✅ System prompt updated
- ✅ Types updated
- ⏳ Prompt builders need conditional logic
- ⏳ Engine needs to handle adaptive output

