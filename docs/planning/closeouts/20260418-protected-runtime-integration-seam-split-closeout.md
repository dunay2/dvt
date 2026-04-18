---
title: Closeout - Protected runtime integration seam split
status: Review
owner: API / Runtime / Docs
last_reviewed: 2026-04-18
planning_type: closeout
slice: protected-runtime-integration-seam-split
---

# Closeout: Protected runtime integration seam split

## Think-First Analysis

### Problem summary

`apps/api/test/integration/protectedRuntime.integration.test.ts` had become a
hybrid executable spec, bootstrap harness, auth issuer, SQL helper, and
workspace-draft scenario owner at the same time.

That created three concrete risks:

- scenario intent was harder to read than the behavior under test
- maintenance fixes leaked across auth/bootstrap/persistence concerns
- Sonar and ESLint findings were pointing at structural drift rather than
  product defects

### Root cause

The protected runtime lane kept accumulating real coverage as the API surface
grew, but its support seams were not split as the bounded concerns became
stable.

### Constraints and invariants

- keep a single executable protected-runtime integration entrypoint
- preserve the real JWKS + PostgreSQL posture; no fake harnesses
- preserve environment-gated skip semantics when `DATABASE_URL` or `DVT_PG_URL`
  is absent
- keep admin/runtime/workspace-draft scenarios in the same contractual lane
  while separating their setup and assertion responsibilities

### Selected option

Split the lane into SRP seams around:

- shared constants and route guard
- HTTP payload helpers
- JWKS/token issuance
- runtime bootstrap and teardown
- SQL persistence helpers
- scenario execution helpers
- assertion helpers
- thin composition harness

Keep `protectedRuntime.integration.test.ts` as the executable entrypoint so the
validation command and evidence chain stay stable.

## Implementation Summary

- Added seam modules under `apps/api/test/integration/`:
  - `protectedRuntime.integration.shared.ts`
  - `protectedRuntime.integration.http.ts`
  - `protectedRuntime.integration.auth.ts`
  - `protectedRuntime.integration.bootstrap.ts`
  - `protectedRuntime.integration.persistence.ts`
  - `protectedRuntime.integration.runtime.scenarios.ts`
  - `protectedRuntime.integration.workspaceDraft.scenarios.ts`
  - `protectedRuntime.integration.assertions.ts`
- Reduced `protectedRuntime.integration.harness.ts` to a thin composition root
  over bootstrap, auth, and persistence helpers.
- Reduced `protectedRuntime.integration.test.ts` to scenario declarations and
  contract assertions instead of embedded lifecycle/setup logic.
- Converted the repeated forbidden-action checks into a table-driven lane.
- Hardened workspace-draft payload narrowing with explicit `TypeError` for
  malformed response shape checks.
- Regenerated `generated-code-state.md` to reflect the new source files.

## Validation Run

- `pnpm exec eslint apps/api/test/integration/protectedRuntime.integration.test.ts apps/api/test/integration/protectedRuntime.integration.harness.ts apps/api/test/integration/protectedRuntime.integration.bootstrap.ts apps/api/test/integration/protectedRuntime.integration.persistence.ts apps/api/test/integration/protectedRuntime.integration.auth.ts apps/api/test/integration/protectedRuntime.integration.shared.ts apps/api/test/integration/protectedRuntime.integration.http.ts apps/api/test/integration/protectedRuntime.integration.runtime.scenarios.ts apps/api/test/integration/protectedRuntime.integration.workspaceDraft.scenarios.ts apps/api/test/integration/protectedRuntime.integration.assertions.ts --max-warnings 0`
- `pnpm --filter dvt-api typecheck`
- `pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/protectedRuntime.integration.test.ts`
- `pnpm verify:prepush`

## Residuals

- The protected runtime lane is still a single executable spec by design. A
  future split into separate spec files (`runs`, `workspace-draft`, `admin`)
  would require an explicit decision about integration-file parallelism and
  shared environment mutation.
- The executable command remains stable:
  `pnpm --filter dvt-api test:integration`.
- The workspace-draft protected boundary now depends on a seam-split
  integration lane rather than a monolithic spec file, but the behavioral
  evidence and command surface remain unchanged.
