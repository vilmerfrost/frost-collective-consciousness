# FCC Knowledge Base

This directory contains knowledge files that FCC can reference for framework-specific or domain-specific information.

## Purpose

FCC uses these files to:
- Verify framework version details (e.g., Next.js 16 features)
- Reference domain-specific patterns
- Avoid hallucinating about framework capabilities
- Provide accurate, evidence-based analysis

## Structure

- `nextjs-16-notes.md` - Notes about Next.js 16 features and changes
- Add more knowledge files as needed for other frameworks/domains

## Usage

When FCC needs to reference framework details, it will:
1. Check this directory first
2. Use information from these files as evidence
3. If information is missing, explicitly state: "Knowledge incomplete for [topic]"

## Adding Knowledge

To add knowledge:

1. Create a new markdown file (e.g., `react-19-notes.md`)
2. Document key features, changes, patterns
3. Include version numbers and dates
4. Keep it factual and evidence-based

## Example

```markdown
# Next.js 16 Notes

## Key Changes
- App Router is now stable
- Server Components by default
- New caching behavior

## Breaking Changes
- [List breaking changes]

## Migration Notes
- [Migration guidance]
```

