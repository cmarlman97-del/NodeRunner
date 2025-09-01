---
description: 
auto_execution_mode: 1
---

Plan first (no code yet):

1) Files to modify (exact paths) and why
2) Prop/type changes (old → new)
3) Data flow trace; call out any name/shape mismatches
4) 3–5 step implementation plan + backout/rollback

Constraints:
- Minimal diffs; TS strict; do not alter public API/DB/types unless proposed.
- Follow the workspace guardrails.

After I say “Proceed”, produce unified diffs ONLY for those files.
