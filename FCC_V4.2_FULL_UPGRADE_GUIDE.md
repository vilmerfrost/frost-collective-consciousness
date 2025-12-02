# FCC v4.2 Full Upgrade Guide

## Overview

FCC v4.2 removes all personalization and psychology references, replacing them with neutral engineering constraints.

## Critical Changes Needed

### 1. Replace All Personalization References

**OLD:**
- "Founder is 16"
- "Focus time: 2–4h/day"
- "ADHD/bipolar energy swings"
- "Solo-founder stress load"
- "School hours"
- "founderFeasibilityScore"
- "emotionalLoadImpact"
- "requiredFocusMinutes"

**NEW:**
- "Resource constraints"
- "Developer bandwidth"
- "Operational overhead"
- "Complexity management"
- "architecturalSeverity"
- "reliabilitySeverity"
- "operationalOverhead"
- "complexity"

### 2. Files Requiring Updates

1. ✅ `fcc/prompts/system/fcc_system_prompt.md` - PARTIALLY DONE (needs complete pass)
2. ✅ `fcc/core/types.ts` - DONE
3. ⏳ `fcc/core/fccEngine.ts` - NEEDS MAJOR UPDATE
   - buildLeadPrompt() - lines 679-687
   - buildReviewerPrompt() - needs check
   - buildSynthesizerPrompt() - lines 905-926
   - runCollaborativePipelineDiagnosis() - lines 1088-1096, 1497-1518
4. ⏳ `fcc/prompts/agents/feasibility_analyst.md` - needs complete rewrite
5. ✅ `fcc/core/repoScanner.ts` - verifyPathExists() added

### 3. Replacement Pattern

**In all prompts, replace:**
```
=== FOUNDER CONSTRAINTS ===
Account for:
- Founder is 16
- Focus time: 2–4h/day
...
```

**With:**
```
=== ENGINEERING CONSTRAINTS ===
Account for:
- Resource constraints (limited developer bandwidth)
- Operational overhead (context-switching costs)
- Budget constraints
- Complexity management
...
```

## Implementation Status

- [x] System prompt header updated to v4.2
- [x] Types updated (founder-specific fields removed)
- [x] verifyPathExists() added to repoScanner
- [ ] All prompt builders updated
- [ ] All recommendation fields updated in prompts
- [ ] normalizeParsedReport updated for new fields
- [ ] Agent prompts updated

