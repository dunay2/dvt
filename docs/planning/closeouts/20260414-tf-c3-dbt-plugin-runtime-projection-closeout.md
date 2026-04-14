---
title: Closeout - TF-C3 dbt adapter seam and fixture hardening slice
status: Review
owner: Runtime / Adapters / Docs
last_reviewed: 2026-04-14
planning_type: closeout
slice: TF-C3-dbt-plugin-runtime-projection
---

# Closeout: TF-C3 dbt adapter seam and fixture hardening slice

## Think-First Analysis

### Problem summary

The previous `TF-C3` slice closed the protected-runtime admission blocker by
wiring a concrete `runExecutionContextResolver` in `apps/api`.

That was necessary but not sufficient. The runtime still does not consume the
resolved plugin payload. `@dvt/engine` validates `runExecutionContextRef`, but
the provider adapter only receives the ref and the Temporal worker still routes
DBT step kinds through `DbtStepActivity`, which currently has no plugin-backed
execution path.

If left unchanged, the product keeps the right admission contract while
preserving the wrong runtime truth: dbt is still either a no-op or a
provider-local special case, instead of a plugin-backed path at the adapter
boundary.

### Current-state diagram

```mermaid
flowchart LR
  Caller["POST /runs/start"] --> API["apps/api protected runtime"]
  API --> Engine["WorkflowEngine admission"]
  Engine --> Adapter["TemporalAdapter.startRun(ctx with runExecutionContextRef)"]
  Adapter --> Workflow["RunPlanWorkflow"]
  Workflow --> DbtActivity["DbtStepActivity"]
  DbtActivity --> Stub["no plugin-backed runtime consumption"]
```

### Target slice for this change

```mermaid
flowchart LR
  Caller["POST /runs/start"] --> API["apps/api protected runtime"]
  API --> Engine["WorkflowEngine admission"]
  Engine --> Adapter["TemporalAdapter.startRun(ctx with runExecutionContextRef)"]
  Adapter --> Workflow["RunPlanWorkflow"]
  Workflow --> DbtActivity["DbtStepActivity"]
  DbtActivity --> Reader["IRunExecutionContextReader"]
  Reader --> RunCtx["resolved RunExecutionContext"]
  RunCtx --> PluginRunner["dbt plugin-backed runner"]
  PluginRunner --> Result["StepResult / resultEvidence"]
```

### Root cause

The repo already has the right separation at the contract level:

- `RunExecutionContext` carries `pluginContexts`;
- `IRunExecutionContextReader` exists in `@dvt/artifacts`; and
- the Temporal adapter owns step-kind execution dispatch.

But those seams are not connected. The engine boundary stops at validation, and
the Temporal adapter still treats DBT step execution as an internal activity
detail instead of an adapter-owned plugin-runtime handoff.

The same slice also accumulated two local monoliths that hid that boundary in
practice:

- `stepActivities.ts` mixed activity contracts, validation, gateway behavior,
  DBT runtime projection, dispatch, and factory composition.
- `integration.time-skipping.shared.ts` mixed workflow artifact lookups, fake
  state-store wiring, plan builders, activity harnesses, and wait utilities.

That violated SRP and made the new DBT path harder to verify without smearing
runtime concerns back into shared helpers.

### Constraints and invariants

- `AGENTS.md`: inventory first, no hidden debt, no fake completeness, and no
  new stubs.
- `docs/guides/ai-work-protocol.md`: design rationale must exist before
  implementation for a behavioral boundary slice.
- `docs/planning/execution-model/dvt-execution-model.md`: extension behavior
  must remain behind explicit runtime or plugin boundaries, not kernel
  semantics.
- `docs/architecture/components/engine/contracts/extensions/PluginSandbox.v1.md`:
  plugin inputs must be explicit invocation payloads and stay under isolated
  runtime policy.
- `docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md`:
  provider adapters own provider-runtime execution mechanics.
- `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-product-decisions-20260405.md`:
  phase 2 adds dbt behind the same outer loop, but not as a second product path
  and not as kernel-owned logic.
- Keep the slice out of `@dvt/engine` and `@dvt/contracts` unless the existing
  `runExecutionContextRef` boundary proves insufficient.

### Selected option and rationale

Implement the projection in `@dvt/adapter-temporal`, not in the engine:

1. `DbtStepActivity` resolves the immutable `RunExecutionContext` through
   `IRunExecutionContextReader` when a DBT step executes.
2. The resolved `pluginContexts.dbt` payload is handed to a dedicated
   plugin-backed runner owned by the Temporal adapter boundary.
3. Missing reader, missing ref, or missing dbt plugin context fail closed with
   explicit non-retryable step failure instead of fake success.

This keeps dbt semantics out of kernel code while replacing the current no-op
truth with a fail-closed adapter seam and testable handoff contract.
Production host composition remains a follow-on.

## Pre-Implementation Brief

- Mode: Narrow implementation slice
- Scope:
  - `packages/@dvt/adapter-temporal/src/activities/*.ts`
  - `packages/@dvt/adapter-temporal/src/index.ts`
  - `packages/@dvt/adapter-temporal/package.json`
  - `packages/@dvt/adapter-temporal/tsconfig.json`
  - `packages/@dvt/adapter-temporal/vitest.config.ts`
  - `packages/@dvt/adapter-temporal/test/activities.test.ts`
  - `packages/@dvt/adapter-temporal/test/helpers/integration/*.ts`
  - `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`
  - `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
  - `packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts`
  - planning and ARC evidence docs for `TF-C3`
- Expected outcome:
  - DBT step execution no longer succeeds through a no-op activity
  - the Temporal adapter can resolve `RunExecutionContext` and pass the dbt
    plugin payload to an adapter-owned runner
  - the default posture is fail-closed when plugin runtime wiring is absent
- Risks and mitigations:
  - Risk: move dbt semantics into shared engine contracts
  - Mitigation: keep projection local to adapter-temporal and reuse
    `IRunExecutionContextReader`
  - Risk: preserve fake-success behavior behind a renamed abstraction
  - Mitigation: missing plugin runtime wiring throws explicit non-retryable
    errors
  - Risk: break existing transformation tests that implicitly relied on the
    no-op activity
  - Mitigation: update the tests to inject a fake plugin-backed runner and a
    deterministic execution-context reader
- Out of scope:
  - a production plugin marketplace or sandbox implementation
  - extending preview profiles or outer start-run API shape
  - changing engine contracts to carry resolved plugin payloads

## Implementation Summary

- Extended `@dvt/adapter-temporal` activity dependencies with an optional
  `IRunExecutionContextReader` and adapter-owned `DbtPluginRunner` so DBT step
  execution can resolve immutable runtime context without pushing plugin
  semantics into `@dvt/engine`.
- Reworked `DbtStepActivity` to require `runExecutionContextRef` for DBT step
  kinds, resolve the immutable `RunExecutionContext`, project
  `pluginContexts.dbt` into the adapter-owned runner, and fail closed with
  explicit non-retryable failures when the ref, runtime wiring, or DBT payload
  is missing.
- Added a result-integrity guard so a plugin runner cannot claim success for a
  different `stepId` than the one being executed.
- Split the old `stepActivities.ts` monolith into focused modules for failure
  mapping, shared activity types, gateway evaluation, DBT runtime projection,
  dispatch, validation, and activity factory composition while preserving the
  public import path through a barrel.
- Split the old `integration.time-skipping.shared.ts` monolith into targeted
  integration helpers for workflow artifacts, runtime state, test plans,
  test activities, DBT runtime fixtures, and wait utilities while preserving
  the shared import path through a barrel.
- Updated unit and integration tests to inject deterministic fake readers and
  plugin-backed runners explicitly. The baseline time-skipping lane now
  provisions DBT runtime context through dedicated fixtures instead of leaning
  on the older implicit no-op truth.
- Hardened those DBT test fixtures so the synthetic `runExecutionContextRef`
  is now run-scoped and hashed from canonical `RunExecutionContext` bytes, and
  the fake reader resolves only explicitly registered refs instead of returning
  one ambient context for every run on the same worker.
- Hardened the same fixture seam so plan fetches are keyed by the registered
  `PlanRef` instead of one worker-global blob, and bindings now fail closed if
  a precomputed `runExecutionContextRef` no longer matches the plan registered
  for that run.
- Tightened the fixture identity rules so optional `PlanRef.sizeBytes` no
  longer participates in the lookup key, and synthetic DBT
  `runExecutionContextRef.sha256` values are derived from RFC-8785/JCS
  canonical bytes instead of property-order-sensitive `JSON.stringify(...)`.
- Replaced the old overloaded multi-run fixture entry point with an explicit
  multi-run helper that requires per-binding `planBytes`, so same-worker tests
  cannot silently fall back to a shared blob when registering multiple plans.
- Wired DBT fixture canonicalization through the public `@dvt/crypto` package
  boundary and local Vitest alias instead of importing sibling package source
  files directly.
- Added a focused TDD regression test for the fixture seam and updated the
  local cancellation integration lane to prove two runs on the same worker
  resolve distinct DBT project-bundle refs.
- Tightened `DbtStepActivity` error translation so engine-side
  `RunExecutionContextRejectedError` preserves the underlying rejection reason
  instead of collapsing to the engine message key.
- Added the `@dvt/artifacts` workspace dependency and local TS path mapping so
  the adapter build can compile the reader seam without depending on ambient
  workspace state.
- Added the `@dvt/crypto` workspace dependency plus aligned TS/Vitest package
  resolution so DBT fixture hashing uses the public package boundary instead of
  reaching into sibling source files.
- Rebuilt the DBT fixture `RunExecutionContext` through the governed contract
  parser and added `typecheck:test` to the package so branded contract drift in
  test helpers is caught by package-level validation instead of surfacing only
  as editor noise.
- This slice stops at the adapter-owned seam and its tests. It does not add an
  in-repo production Temporal worker bootstrap or a composed production DBT
  plugin host.

## Validation Run

- `pnpm exec eslint --max-warnings 0 packages/@dvt/adapter-temporal/src/activities/*.ts packages/@dvt/adapter-temporal/src/index.ts packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts packages/@dvt/adapter-temporal/test/helpers/integration/*.ts packages/@dvt/adapter-temporal/test/helpers/testExecutors.ts packages/@dvt/adapter-temporal/test/activities.test.ts packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts`
- `pnpm --filter @dvt/adapter-temporal exec vitest run test/dbtRuntimeFixtures.test.ts`
- `pnpm --filter @dvt/adapter-temporal exec vitest run test/activities.test.ts --testNamePattern "dbt step|runExecutionContext"`
- `pnpm --filter @dvt/adapter-temporal build`
- `pnpm --filter @dvt/adapter-temporal test`
- `pnpm --filter @dvt/adapter-temporal test:integration:local`
- `pnpm --filter @dvt/adapter-temporal test:integration:transformation`
- `pnpm docs:status:generate`
- `pnpm docs:workboard:generate`
- `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; $json = node tools/ci/arc-check.mjs; $enc = New-Object System.Text.UTF8Encoding($false); [System.IO.File]::WriteAllLines((Join-Path (Get-Location) 'arc.json'), $json, $enc)`
- `$env:ARC_JSON='arc.json'; node tools/ci/doc-check.mjs`
- `pnpm docs:gov:links:changed`
- `pnpm lint:md:changed`
- `pnpm verify:prepush`

## Residuals

- `TF-C3` remains open. The Temporal adapter now exposes a fail-closed DBT
  projection seam and hardened fixtures, but this repo still does not wire an
  in-repo production Temporal worker/bootstrap that supplies the real plugin
  host runtime.
- This slice keeps DBT out of kernel semantics, but it does not yet implement
  a marketplace, sandbox lifecycle, or rollout controls for a production DBT
  plugin runtime.
- The residual quality risk is now runtime composition drift between the tested
  adapter seam and whichever production plugin host wires it next.
