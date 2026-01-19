---
trigger: always_on
---

Follow @docs/CONVENTIONS.md.

# TypeScript Conventions & Hygiene

- **tsconfig stays strict**; no relaxations without explicit approval.
- Domain models: required keys use `string | null` (no `?`). Inputs/DTOs: `field?: string`; map `undefined → null` at boundaries.
- Prefer **explicit types** and **inferred generics** over `any`/`unknown`. No implicit `any`.
- Keep functions cohesive and short; single responsibility; prefer pure utilities.
- Immutability by default; avoid mutating inputs. Use readonly types where sensible.
- Narrow types early with Zod/refinements; surface typed errors from boundaries.
- Co-locate small unit tests with touched code. Enforce minimal, plan-aligned diffs.
- Public API/DB/exported types require a proposal (smallest change + migration + rollback).
