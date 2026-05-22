---
title: F-19 Marquez Public-Data Visual System Closeout
status: Accepted
owner: Frontend / Architecture
last_reviewed: 2026-05-22
planning_type: closeout
task_ids:
  - F-19
---

# F-19 Marquez Public-Data Visual System Closeout

## Result

F-19 is closed by formalizing Marquez as a scoped public-data visual system.
The accepted boundary is documentation and architecture-test governed: Marquez
applies to public or explanatory open-data surfaces and must not be applied to
operator workbench routes.

## Work Performed

- Added a public-data component directory under `docs/architecture/components/web/public-data/`.
- Added a Marquez component guide with public API, visual tokens, invariants,
  transitions, consumers, topology, and drift signals.
- Added user stories for route classification, provenance, primitive reuse, and
  drift prevention.
- Updated the web UX guide, reference stack, and web component index.
- Added `publicDataVisualSystem.architecture.test.ts` to guard the accepted
  semantics.
- Marked F-19 done in Lane E.

## Validation

- `pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts`
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:feature-mechanization -- --feature F19-MARQUEZ-PUBLIC-DATA-VISUAL-SYSTEM-20260522`
- `pnpm docs:feature-mechanization:implementation -- --feature F19-MARQUEZ-PUBLIC-DATA-VISUAL-SYSTEM-20260522`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm planning:db:import -- --planning-only`
- `pnpm planning:db:export:check`
- `pnpm verify:prepush`

## Debt And Stub Evidence

No debt entry was created. No quality rule was relaxed. No hooks were
bypassed. No stub route, placeholder implementation, fake adapter, or unfinished
runtime branch was introduced.
