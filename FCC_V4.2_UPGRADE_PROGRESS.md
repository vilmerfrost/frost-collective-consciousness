# FCC v4.2 Upgrade Progress

## Status: IN PROGRESS

### Completed ✅
1. System prompt header updated to v4.2
2. Added v4.2 rules section (no personalization, repo verification)
3. Replaced "Founder Constraints" with "Engineering Constraints"
4. Updated types.ts to remove founder-specific fields:
   - Removed: `founderFeasibilityScore`, `requiredFocusMinutes`, `emotionalLoadImpact`, `contextSwitchingImpact`
   - Added: `architecturalSeverity`, `reliabilitySeverity`, `complexity`, `operationalOverhead`, `technicalAlignmentScore`
5. Added `verifyPathExists()` function to repoScanner.ts

### Still Needed ⏳
1. Update all prompt builders in fccEngine.ts to remove personalization references
2. Update all references to founder constraints in prompts
3. Update normalizeParsedReport to use new fields
4. Update agent prompts (feasibility_analyst.md) to remove personalization
5. Update all evidence verification to use new repo verification
6. Remove visionAlignmentScore references, replace with technicalAlignmentScore

### Key Changes Required

**In fccEngine.ts:**
- Replace all "Founder is 16", "2-4h/day", "ADHD/bipolar" references
- Replace with "resource constraints", "developer bandwidth", "operational overhead"
- Update all prompt builders (buildLeadPrompt, buildReviewerPrompt, buildSynthesizerPrompt)
- Update runCollaborativePipelineDiagnosis prompts

**In prompts/agents/feasibility_analyst.md:**
- Remove all founder constraint references
- Focus on technical feasibility only

**In types.ts:**
- Already updated ✅

**In repoScanner.ts:**
- Already added verifyPathExists ✅

