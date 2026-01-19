---
trigger: always_on
---

Follow @docs/CONVENTIONS.md.

# Frontend Stack Conventions (Next.js + shadcn/ui + Tailwind + TanStack Query + RHF + Zod)

- Use **Next.js App Router** patterns and server/client components per Next.js docs.
- Compose UI only from `@/components/ui/*` (shadcn/ui). Treat primitives as read-only.
- Styling is **Tailwind-first**; no global CSS except design tokens/utilities.
- Data fetching/mutations use **TanStack Query**. Co-locate queries/mutations with feature code.
- Forms use **React Hook Form** with **Zod** schemas for validation; infer types from schema.
- Avoid ad-hoc fetches; wrap network calls in feature hooks or shared client utilities.
- Persisted state: prefer URL/search params or server state; avoid sprawling client stores.
- Accessibility: follow shadcn/ui a11y patterns; label interactive elements.
- Do not introduce alternative UI kits, form libs, or validators without proposal.
