---
trigger: always_on
---

Follow these project guardrails in this workspace:

- Keep tsconfig strict; do not edit or relax strictness without explicit approval.
- Models: required keys with string|null (no ?). Inputs/DTOs: field?: string; map undefined→null at boundaries.
- Minimal diffs; PLAN FIRST, then diffs. Do not refactor widely unless asked.
- Compose from @/components/ui/*; treat those primitives as read-only unless I say to change the design system.
- Don’t change public API/DB schema/exported types without a proposal (smallest change + migration/backout plan).
- Centralize external integrations under integrations/* with typed errors and retries.
- Logging via logger.ts with requestId (when present).
- Allowed without approval: small local refactors, type hardening, lint fixes, styling tweaks, co-located unit tests.
- Definition of Done: typecheck passes, tests pass, no new lints, behavior/docs updated, short change summary.
