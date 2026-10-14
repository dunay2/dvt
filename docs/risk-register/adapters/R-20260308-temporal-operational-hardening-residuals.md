---
id: R-20260308-TEMPORAL-OPERATIONS-01
title: Temporal runtime hardening is closed, but sustained-load behavior still depends on production telemetry
status: Mitigating
date: 2026-03-08
owners:
  - adapter-temporal
  - observability
severity: Medium
probability: Low
---

# R-20260308-TEMPORAL-OPERATIONS-01 - Temporal runtime hardening is closed, but sustained-load behavior still depends on production telemetry

## Context

`@dvt/adapter-temporal` now enforces client connect and request timeouts, emits
structured worker lifecycle diagnostics, and records observability signals for
`lookupRunRef()` and `ping()`.

Connection hardening now uses the Temporal SDK native `connectTimeout` path,
and health checks plus runtime `lookupRunRef()` probes are cancelled with
`AbortSignal` instead of relying on a caller-only promise race.

The package also has expanded unit coverage plus a time-skipping integration
lane that exercises start, cancel, retry, failure, gateway, and restart
behavior.

## Risk

The remaining operational risk is no longer missing implementation. It is
evidence depth: worker defaults and client timeout behavior can still drift
under sustained load or production-like network conditions that are not fully
represented by unit and time-skipping integration tests.

If that happens, the adapter could remain functionally correct while still
degrading through slow liveness checks, noisy failure signals, or incomplete
operational telemetry during incidents.

## Mitigation

- Enforce `connectTimeoutMs` through the Temporal SDK native connect deadline.
- Enforce `requestTimeoutMs` through abortable health checks and runtime
  lookup probes so timed-out client RPCs do not continue orphaned.
- Emit structured logs, counters, and duration histograms for worker start,
  stop, ping, and `lookupRunRef()` paths.
- Keep the time-skipping integration suite green for cancellation, failure,
  gateway, and crash-recovery behavior.
- Collect production-like telemetry evidence in a follow-up pass before
  treating Temporal worker defaults as fully validated under load.

## Evidence

- `docs/evidence/critical/ED-20260308-temporal-operational-close-out.md`
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `packages/@dvt/adapter-temporal/src/TemporalClient.ts`
- `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
- `packages/@dvt/adapter-temporal/src/temporalObservability.ts`
- `packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`

<a id="risk-r-20260306-g4-t3-01"></a>

## Independent risk R-20260306-G4-T3-01

```risk-record-v1
---
id: R-20260306-G4-T3-01
title: Temporal adapter lint gate drift on workspace aliases
status: Mitigated
date: 2026-03-06
owners:
  - adapter-temporal
severity: Medium
probability: Medium
---

# R-20260306-G4-T3-01 - Temporal adapter lint gate drift on workspace aliases

## Context

The changed-file CI lint job resolves imports from the root TypeScript configuration.
When `@dvt/plan-interpreter` was missing from root `tsconfig.json` paths, lint results
depended on whether workspace package `dist` artifacts had been built before lint.

## Risk

PRs touching Temporal workflow files can fail in CI for configuration reasons unrelated
to source correctness, increasing merge latency and hiding real regressions.

## Mitigation

- Added root path aliases for `@dvt/plan-interpreter` and `@dvt/plan-interpreter/*`.
- Verified resolver output maps to `packages/@dvt/plan-interpreter/src/index.ts`.
- Verified `@dvt/adapter-temporal` test suite passes after the configuration fix.

## Evidence

- `tsconfig.json`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- GitHub Actions run `22770527589` (`ESLint + Prettier (changed files)`)

## Closure

Mitigated and closed on 2026-03-07 after validation with adapter-temporal package tests.
```

<a id="risk-r-20260306-g4-t4-01"></a>

## Independent risk R-20260306-G4-T4-01

```risk-record-v1
---
id: R-20260306-G4-T4-01
title: StepStarted compiledCodeRef propagation drift
status: Mitigated
date: 2026-03-06
owners:
  - adapter-temporal
severity: Medium
probability: Medium
---

# R-20260306-G4-T4-01 - StepStarted compiledCodeRef propagation drift

## Context

T4-3 introduces extraction and type-guard validation for `compiledCodeRef` in the
Temporal adapter execution path and propagates it into `StepStarted` when valid.

## Risk

If extraction logic or guards drift from event contract expectations, `StepStarted`
events can lose lineage metadata or emit invalid references. That can break
traceability joins and downstream compiled-code attribution.

## Mitigation

- Centralized extraction and guard logic for `compiledCodeRef` in adapter flow.
- Added workflow and activity tests that assert propagation only when valid.
- Preserved existing behavior when `compiledCodeRef` is absent or invalid.

## Evidence

- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`

## Closure

Mitigated and closed on 2026-03-07 with package-level validation across contracts, planner, adapter-temporal, and traceability-service.
```

<a id="risk-r-20260306-g4-t4-02"></a>

## Independent risk R-20260306-G4-T4-02

```risk-record-v1
---
id: R-20260306-G4-T4-02
title: Step activity behavior drift after complexity refactor
status: Mitigated
date: 2026-03-06
owners:
  - adapter-temporal
severity: Medium
probability: Low
---

# R-20260306-G4-T4-02 - Step activity behavior drift after complexity refactor

## Context

`@dvt/adapter-temporal` refactors `stepActivities.executeStep` and
`isExecutionPlan` into smaller helper methods to reduce cyclomatic complexity
and static-analysis noise.

## Risk

Behavior can drift during method extraction, especially around:

- simulated transient/permanent step failures,
- gateway DSL evaluation and error wrapping,
- execution plan shape validation and metadata guards.

A drift in any of these paths can produce incorrect event flow or mismatched
error semantics.

## Mitigation

- Kept error types/messages unchanged while extracting helpers.
- Preserved gateway evaluation boundary and non-retryable failure semantics.
- Verified package tests pass after refactor (`pnpm --filter @dvt/adapter-temporal test`).

## Evidence

- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`

## Closure

Mitigated and closed on 2026-03-07 after regression validation in adapter-temporal test suites.
```

<a id="risk-r-20260307-artifact-store-01"></a>

## Independent risk R-20260307-ARTIFACT-STORE-01

```risk-record-v1
---
id: R-20260307-ARTIFACT-STORE-01
title: Contract compatibility drift during artifact-store migration
status: Mitigating
date: 2026-03-07
owners:
  - contracts
  - planner
severity: Medium
probability: Medium
---

# R-20260307-ARTIFACT-STORE-01 - Contract compatibility drift during artifact-store migration

## Context

The branch introduces the artifact-store port and typed compiled-code references
across `@dvt/contracts`, planner storage adapters, and traceability resolver flow.

## Risk

If public validation exports drift from current CLI and golden-contract checks,
CI contract validation can fail even when planner/runtime behavior is correct.

## Mitigation

- Restored backward-compatible `parseCanonicalEngineEvent` validation API in
  `@dvt/contracts` while keeping `parseRunEventWrite` as the forward contract.
- Kept adapter-facing artifacts typed through the new `artifact-store` port.
- Preserved deterministic contract validation gates in CI.

## Evidence

- `packages/@dvt/contracts/src/validation.ts`
- `packages/@dvt/contracts/src/ports/artifact-store.ts`
- `packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts`
- GitHub Actions run for PR #384 (`PR Quality Checks`, `Validate Golden JSON Fixtures`)
```

<a id="risk-r-20260307-g4-t3-01"></a>

## Independent risk R-20260307-G4-T3-01

```risk-record-v1
---
id: R-20260307-G4-T3-01
title: Gateway context fallback behavior drift in workflow guard hardening
status: Mitigating
date: 2026-03-07
owners:
  - adapter-temporal
severity: Low
probability: Low
---

# R-20260307-G4-T3-01 - Gateway context fallback behavior drift in workflow guard hardening

## Context

`@dvt/adapter-temporal` updates `RunPlanWorkflow.buildGatewayContext` to guard
the first dependency key lookup explicitly before reading
`completedStepResults`.

## Risk

The guard change can accidentally alter fallback semantics for gateway context
resolution when dependency data is absent, which may affect deterministic
gateway decisions in edge cases.

## Mitigation

- Kept fallback behavior as empty object when no dependency context exists.
- Scoped change to a single workflow helper.
- Re-ran adapter-temporal checks:
  - `pnpm eslint packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts --max-warnings 0`
  - `pnpm --filter @dvt/adapter-temporal test`

## Evidence

- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
```

<a id="risk-r-20260307-step-executor-registry-01"></a>

## Independent risk R-20260307-STEP-EXECUTOR-REGISTRY-01

```risk-record-v1
---
id: R-20260307-STEP-EXECUTOR-REGISTRY-01
title: Step executor injection can drift from production activity behavior
status: Mitigating
date: 2026-03-07
owners:
  - adapter-temporal
severity: Medium
probability: Medium
---

# R-20260307-STEP-EXECUTOR-REGISTRY-01 - Step executor injection can drift from production activity behavior

## Context

`createActivities` now supports an injected step executor registry so tests can simulate
retryable and non-retryable step failures without mutating execution plan fixtures through
the `simulateError` field.

## Risk

If test-only executors diverge from the default registry semantics, integration coverage can
report green while production activity dispatch follows a different failure path.

## Mitigation

- Keep the default executor registry explicit and exported from the production module.
- Compose test executors in front of the production defaults instead of replacing the full chain.
- Wire the executor override through `TemporalWorkerHost` so integration tests exercise the same activity factory path used in production worker startup.

## Evidence

- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
- `packages/@dvt/adapter-temporal/test/helpers/testExecutors.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
```

<a id="risk-r-20260307-temporal-workflow-helpers-01"></a>

## Independent risk R-20260307-TEMPORAL-WORKFLOW-HELPERS-01

```risk-record-v1
---
id: R-20260307-TEMPORAL-WORKFLOW-HELPERS-01
title: Temporal workflow helper drift can emit invalid StepStarted payloads
status: Mitigating
date: 2026-03-07
owners:
  - adapter-temporal
  - plan-interpreter
severity: Medium
probability: Medium
---

# R-20260307-TEMPORAL-WORKFLOW-HELPERS-01 - Temporal workflow helper drift can emit invalid StepStarted payloads

## Context

`RunPlanWorkflow` now delegates DAG traversal, continue-as-new state building, and
`StepStarted` payload construction to deterministic helper seams with explicit owned
concerns instead of one mixed helper module.

## Risk

If helper logic drifts from the current workflow step contract, the Temporal adapter can
either lose `compiledCodeRef` metadata or emit invalid payloads into `StepStarted`
events, breaking downstream traceability and replay assumptions.

## Mitigation

- Extracted helper logic into a focused deterministic module with direct unit coverage.
- Hardened compiled-code extraction against malformed payload shapes.
- Made continue-as-new helper output explicit and preserved skipped-step state across
  rollover.
- Reused plan-interpreter downstream traversal instead of duplicating graph traversal
  inside the workflow.

## Evidence

- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers.ts`
- `packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
- `packages/@dvt/plan-interpreter/src/dagAnalyzer.ts`
```

<a id="risk-r-20260308-g5-outbox-worker-01"></a>

## Independent risk R-20260308-G5-OUTBOX-WORKER-01

```risk-record-v1
---
id: R-20260308-G5-OUTBOX-WORKER-01
title: State-store extraction guidance can drift from the eventual independent outbox worker implementation
status: Open
date: 2026-03-08
owners:
  - engine
  - adapter-postgres
  - platform
severity: Medium
probability: Medium
---

# R-20260308-G5-OUTBOX-WORKER-01 - State-store extraction guidance can drift from the eventual independent outbox worker implementation

## Context

This branch curates historical material into a current working description of
the state-store boundary and a G5 guide for an independent outbox worker.

It now also ships the first standalone worker slice in `apps/outbox-worker`
with a bounded HTTP publisher, explicit runtime states, `/healthz`,
`/readyz`, `/metrics`, and a baseline operator runbook.

The new documents intentionally remain non-canonical. They consolidate useful
invariants, delivery semantics, and runtime separation guidance, but they do
not by themselves establish implemented contracts.

That split is correct, but it introduces a residual delivery risk: future
implementation work can selectively follow the narrative docs while missing the
hard requirements already enforced by current state-store contracts and
Postgres-backed behavior.

The risk is no longer theoretical design drift only. The repository now has an
implemented worker baseline, so drift can show up as operational mismatch
between the shipped runtime, the runbook, and the eventual concurrent-worker or
downstream-delivery hardening slices.

## Risk

The eventual outbox worker and related state-store extraction work can drift in
three ways:

- worker runtime code can adopt the guide's shape without preserving atomic
  append-plus-enqueue guarantees;
- delivery retry or dead-letter behavior can be introduced without contract
  tests that pin state-store invariants;
- working documents can age faster than the canonical ADR and contract set,
  causing reviewers to approve design changes against stale narrative text.

If that happens, the program can ship a clean architectural story while still
regressing correctness around ordering, idempotency, or ownership boundaries.

## Mitigation

- Keep the new extracted documents explicitly marked as non-canonical working
  material.
- Promote only verified parts of the G5 guidance into ADRs, TypeScript ports,
  and adapter contract docs.
- Require future outbox worker delivery code to prove atomic append and enqueue
  behavior, retry classification, and replay semantics through contract tests.
- Review worker rollout changes against the state-store overview and current
  Postgres adapter design, not against narrative docs alone.
- Keep canary, downstream contract hardening, and ADR-0009 multi-worker work
  tracked explicitly as residual risk until they land in code and evidence.

## Evidence

- `docs/archive/working-notes/state-store-extraction.md`
- `docs/planning/gaps/g5-outbox-worker-guide.md`
- `docs/planning/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md`
- `docs/guides/outbox-worker-technical-manual-20260404.md`
- `docs/architecture/engine/contracts/state-store/overview.md`
- `packages/@dvt/adapter-postgres/DESIGN.md`
- `apps/outbox-worker/src/server.ts`
- `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`
- `docs/planning/proposals/g5-outbox-worker-development-proposal-20260308.md`
```
