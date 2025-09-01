# ClearStack Guardrails v1 (Conventions)

**Why:** Keep changes small, safe, and reversible; surface bugs at build time, not in prod.

## Hard Rules (ask before doing)
- Don't change public API, DB schema, or exported types without a proposal (smallest change + migration/backout).
- New top-level folders/modules require a proposal before creation.
- Don't introduce/replace core libraries without approval.
- No secrets in code; use `.env` and a typed config loader.

## Soft Preferences (defaults)
- Feature-first structure (`contacts/`, `calls/`, `tasks/`).
- TypeScript strict; avoid `any`. Validate external payloads at boundaries.
- Use the existing data layer; don't silently swap libraries.
- Centralize integrations under `integrations/*` with retries + typed errors.
- Treat `components/ui/*` as design-system primitives; compose them, don't modify.

## Scoped Autonomy (safe without asking)
- Small local refactors; extract tiny components in the same folder.
- Strengthen types; fix ESLint/TS warnings.
- Styling tweaks within a component; co-located unit tests.
- Improve null/error handling that doesn't change contracts.

## "Ask First" Triggers
- Schema/API shape changes.
- New top-level folders or cross-cutting utilities.
- New libraries, build tools, or global config.
- Auth/global state/logging framework changes.
- Anything requiring a data migration or user action.

## Models vs Inputs (null vs undefined)
- **Models (stored/returned):** required keys `string | null` (no `?`).
- **Inputs/DTOs:** `field?: string`; convert `undefined → null` at boundaries.
- For forms, normalize empty string to `null` when building models.

## Definition of Done (DoD)
- Types compile (`npm run typecheck`), tests pass, no new lints.
- No unintended API/schema drift.
- Updated docs/tests where behavior or public types changed.
- Short change summary listing affected files.
