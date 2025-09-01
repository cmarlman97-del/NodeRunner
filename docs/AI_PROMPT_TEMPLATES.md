# AI Prompt Templates (Cascade)

## Plan-First Change
Goal: <what you want>
Constraints:
- Minimal diffs; TS strict; don't alter public API/DB/types unless proposed.
- Follow @docs/CONVENTIONS.md guardrails.

Context: @<file1> @<file2> @<file3>

Plan first (no code):
1) Files to modify and why
2) Prop/type changes (old → new)
3) Data flow trace; name mismatches
4) 3–5 step implementation plan + risks/backout
After I say "Proceed", produce unified diffs ONLY for those files.

## New Module Proposal (ask before creating)
Provide:
1) Path & purpose
2) Public interface (types/functions)
3) Dependencies & rationale
4) Alternatives considered (brief)
5) Tests/docs plan (locations)
6) Tiny file tree (2–6 lines)

## Fix TypeScript Errors (strict)
- Do NOT change tsconfig.
- Models: required `string|null`; Inputs: `field?: string`; map `undefined→null` at boundaries.
- Minimal fixes per file; show file:line; plan → diffs.
