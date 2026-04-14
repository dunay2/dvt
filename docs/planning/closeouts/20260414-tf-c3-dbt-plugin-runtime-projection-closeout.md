---
title: Closeout - TF-C3 dbt plugin runtime projection slice
status: Review
owner: Runtime / Adapters / Docs
last_reviewed: 2026-04-14
planning_type: closeout
slice: TF-C3-dbt-plugin-runtime-projection
---

# Closeout: TF-C3 dbt plugin runtime projection slice

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
truth with a real provider-boundary handoff.

## Pre-Implementation Brief

- Mode: Narrow implementation slice
- Scope:
  - `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
  - `packages/@dvt/adapter-temporal/src/index.ts`
  - `packages/@dvt/adapter-temporal/package.json`
  - `packages/@dvt/adapter-temporal/tsconfig.json`
  - `packages/@dvt/adapter-temporal/test/activities.test.ts`
  - `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`
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
- Updated unit and transformation integration tests to inject deterministic
  fake readers and plugin-backed runners instead of relying on the older DBT
  no-op truth.
- Added the `@dvt/artifacts` workspace dependency and local TS path mapping so
  the adapter build can compile the reader seam without depending on ambient
  workspace state.

## Validation Run

- `pnpm exec eslint --max-warnings 0 packages/@dvt/adapter-temporal/src/activities/stepActivities.ts packages/@dvt/adapter-temporal/src/index.ts packages/@dvt/adapter-temporal/test/activities.test.ts packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts`
- `pnpm --filter @dvt/adapter-temporal build`
- `pnpm --filter @dvt/adapter-temporal test`
- `pnpm --filter @dvt/adapter-temporal test:integration:transformation`
- `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs > arc.json`
- `$env:ARC_JSON='arc.json'; node tools/ci/doc-check.mjs`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm docs:gov:links:changed`
- `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260414-tf-c3-dbt-plugin-runtime-projection-closeout.md" "docs/planning/state/domain-status-board.md" "docs/planning/domains/api-and-admission.md" "docs/planning/roadmap/roadmap-by-domain.md" "docs/architecture/system-delivery-status.md" "docs/evidence/ED-20260414-tf-c3-dbt-plugin-runtime-projection.md" --config .markdownlint-cli2.jsonc`
- `pnpm verify:prepush`

## Residuals

- `TF-C3` remains open. The Temporal adapter can now project immutable DBT
  plugin context into an adapter-owned runner, but production composition of a
  real plugin host still remains to be wired.
- This slice keeps DBT out of kernel semantics, but it does not yet implement
  a marketplace, sandbox lifecycle, or rollout controls for a production DBT
  plugin runtime.
- The residual quality risk is now runtime composition drift between the tested
  adapter seam and whichever production plugin host wires it next.
