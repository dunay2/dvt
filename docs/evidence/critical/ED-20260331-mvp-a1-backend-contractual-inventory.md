---
title: ED-20260331 MVP-A1 backend contractual inventory
status: Accepted
date: 2026-03-31
owners:
  - docs
  - dvt-api
arc_level: ARC-1
breaking: false
evidence_class: critical
code_refs:
  - docs/planning/proposals/mvp-a1-backend-contractual-inventory-20260329.md
  - docs/planning/reviews/20260331-mvp-a1-backend-contractual-inventory-review.md
  - apps/api/src/app.ts
  - apps/api/src/entrypoints/http/runtimeRoutes.constants.ts
  - apps/api/src/routes/health.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
evidence:
  tests:
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:quality:check
    - pnpm docs:doctor
    - pnpm docs:canonical:check
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api test:integration
    - pnpm verify:prepush
---

# ED-20260331 MVP-A1 backend contractual inventory

## Decision captured

`MVP-A1` is closed as the reviewed contractual inventory for the backend MVP
control-plane that already exists in `apps/api`.

## What this evidence proves

1. The MVP backend inventory is frozen against the real route surface, route
   activation posture, authorization matrix, and input/scope invariants in
   `apps/api`.
2. The inventory explicitly excludes `/version`, `/db/ready`, and admin routes
   from the MVP claim freeze.
3. `MVP-B1`, `MVP-C1`, and `MVP-D1` can close against the now-stable `MVP-A1`
   baseline, and `MVP-E1` is unblocked into queue state without inventing a
   frontend artifact.
4. The residual risk entry
   `R-20260329-MVP-BACKEND-SCOPE-DRIFT-01` remains open for longer-horizon
   anti-drift governance rather than baseline acceptance.

## Validation results

- `pnpm docs:sync`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:quality:check`
  - Passed with pre-existing non-blocking warnings about likely non-English
    content in older archive/planning surfaces and generated lane markdown.
- `pnpm docs:doctor`
  - Passed with pre-existing warnings about missing `last_reviewed` frontmatter
    in older archive and closeout documents.
- `pnpm docs:canonical:check`
  - Passed.
- `pnpm --filter dvt-api test`
  - Passed with escalated execution.
  - Result: `49` test files passed, `1` skipped; `278` tests passed, `6`
    skipped.
- `pnpm --filter dvt-api test:integration`
  - First escalated run timed out during the prebuild phase; reran with a
    longer timeout to capture the real result.
  - Passed with escalated execution.
  - Result: `1` test file passed, `1` skipped; `5` tests passed, `6` skipped.
  - `test/integration/protectedRuntime.integration.test.ts` skipped cleanly
    because `DATABASE_URL` / `DVT_PG_URL` was not configured in the current
    environment.
- `pnpm verify:prepush`
  - Passed.
