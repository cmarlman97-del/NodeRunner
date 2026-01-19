---
description: Planning gate that generates a structured implementation plan before any code. Ensures minimal diffs, rule compliance, and explicit approval before diffs are produced.
auto_execution_mode: 1
---

Workflow: /plan-first-gate

Auto-triggers when messages suggest code changes (add, edit, refactor, etc.), unless skipped or marked as hotfix.

Responds with a Plan Template (no code yet):

Files to modify (exact paths) and why

Prop/type changes (old → new)

Data flow trace (name/shape mismatches)

Acceptance criteria (testable)

Verification plan (typecheck/tests/lint)

3–5 step implementation plan + backout/rollback

Telemetry/logging (requestId, errors, retries)

Constraints:

Minimal diffs.

Must comply with all 6 rules.

No API/DB/exported type changes without prior proposal.

Risky changes behind feature flags; document rollback path.

Approval:
Code diffs are only produced after explicit approval:
👉 Proceed with diffs

Notes:

Versioning: All rules/workflows are versioned (-v1, -v1.1, etc.).

Reference: Each rule starts with Follow @docs/CONVENTIONS.md.

Deletions: To remove a rule/workflow, delete the file itself (not just contents).

Future additions: Keep rules <12 lines, one concern per file. Add workflows only for repeat, multi-step dev processes.