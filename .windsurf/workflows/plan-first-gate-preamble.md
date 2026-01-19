---
description: Applies multi-tenant MVP architecture and brand guardrails to all code changes: typed IDs, fake AuthContext, can() authorization stub, no per-tenant logic, minimal diffs, consistent UI tokens, and accessibility standards
auto_execution_mode: 1
---

Workspace: /plan-first-gate-preamble

Architecture guardrails (apply to ALL changes in this repo)
- Multi-tenant MVP: assume single DB model later. Today, add only **types and seams** (no real auth yet).
- Type safety: introduce nominal types where needed:
  - TenantId, UserId (string brand types). DTOs may include optional tenantId?: TenantId.
- Auth context (stub): provide a minimal AuthContext that exposes { userId, tenantId, role } using a hardcoded fake user for now.
- Centralized authorization: add/route UI affordances through can(user, resource, action, record?) imported from a single helper. For now it returns true, but ALL buttons/row actions must call it.
- No per-tenant branches: do NOT add code like if (tenantId === "X"). Future differences will be **data-driven** (entitlements, allowlists, table_view configs).
- Keep diffs minimal, typed, and isolated. No backend required yet. No public API/DB/exported-type changes unless explicitly requested by the task.

UI/Brand guardrails (lightweight, apply unless the task says otherwise)
- Colors: primary #2EC4B6, deep teal #046E75, border #E6EAF0, surface #FFFFFF, app bg #F5F7FA.
- Tables: clean header, per-column sort (if in scope), subtle borders/hover, accessible focus states.

Expectations for any component you touch
- Import and use AuthContext (even if values are fake).
- Gate destructive/privileged actions via can(...).
- Avoid tenant-specific logic; design for future data-driven toggles.
- Keep props typed and single-purpose; no leaking global state.

Acceptance reminders
- Typecheck/tests/lint pass.
- No regressions to existing pages unless explicitly requested.
- Short Change Summary included in PR.

(End preamble)
