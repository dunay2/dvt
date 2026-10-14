---
id: R-20260326-ENGINE-RUN-MAINTENANCE-01
title: RunMaintenance refactor can drift in observability and dry-run operator semantics
status: Open
date: 2026-03-26
owners:
  - engine
  - runtime
  - ops
severity: Medium
probability: Low
---

# R-20260326-ENGINE-RUN-MAINTENANCE-01 - RunMaintenance refactor can drift in observability and dry-run operator semantics

## Context

`RunMaintenanceService` was split into focused services and policies to align
with SRP/DDD boundaries (`RunMaintenanceStuckRunService`,
`RunMaintenanceOrphanedIntentService`, per-status reconciliation policies, and
`RunMaintenanceObservabilityFacade`).

The slice also introduced explicit `deferred` output for orphaned-intent
reconciliation and dry-run reporting.

## Risk

Even after the refactor, residual risk remains:

- observability behavior can diverge between maintenance services if new sinks
  or telemetry rules are added in only one code path;
- operators can misread dry-run output semantics if deferred-only outcomes are
  not documented and validated over time;
- future edits can reintroduce local literals/counters and bypass the canonical
  maintenance constants/facade.

## Implemented Mitigations

- centralized maintenance domain literals/metrics in
  `RunMaintenanceDomainConstants`;
- centralized fail-soft metrics/logging in `RunMaintenanceObservabilityFacade`;
- coordinator warns and increments metric on unexpected intent statuses;
- dry-run behavior now reports inspected intents as `deferred` explicitly;
- regression tests assert unexpected-status signaling and deferred semantics.

## Remaining Actions

1. Keep `RunMaintenanceStuckRunService` and orphaned-intent policies aligned on
   the same observability facade when new telemetry sinks are added.
2. Preserve explicit dry-run semantics in contracts/docs when maintenance
   outputs evolve.
3. Track coverage and fixture coupling as the canonical maintenance test suite
   grows.

## Evidence

- `packages/@dvt/engine/src/services/RunMaintenanceService.ts`
- `packages/@dvt/engine/src/services/runMaintenance/RunMaintenanceOrphanedIntentService.ts`
- `packages/@dvt/engine/src/services/runMaintenance/RunMaintenanceStuckRunService.ts`
- `packages/@dvt/engine/src/services/runMaintenance/RunMaintenanceObservabilityFacade.ts`
- `packages/@dvt/engine/test/services/RunMaintenanceService.test.ts`
- [20260326 RunMaintenanceService SRP Review](https://github.com/dunay2/dvt/blob/d3fe40beaa66bd8d98ae9397b76340ff5f895f21/docs/planning/reviews/execution-runtime/20260326-run-maintenance-service-srp-review.md)

<a id="risk-r-20260404-inmemory-state-store-invariants"></a>

## Independent risk R-20260404-INMEMORY-STATE-STORE-INVARIANTS

```risk-record-v1
---
id: R-20260404-INMEMORY-STATE-STORE-INVARIANTS
title: In-memory engine state-store invariant drift on snapshot and outbox paths
status: Open
date: 2026-04-04
owners:
  - dvt/engine
severity: Medium
probability: Low
---
Without explicit invariant hardening, in-memory state-store behavior can drift from run-event write
policy and bootstrap atomicity expectations. This risk is mitigated by strengthening guards and
tests on append invariants, outbox path integrity, and transaction-level atomic behavior.
```

<a id="risk-r-20260408-intent-reconcile-outcome-classification"></a>

## Independent risk R-20260408-INTENT-RECONCILE-OUTCOME-CLASSIFICATION

```risk-record-v1
---
id: R-20260408-INTENT-RECONCILE-OUTCOME-CLASSIFICATION
title: Intent reconciliation outcomes can overreport cancelled workflows
status: Open
date: 2026-04-08
owners:
  - packages/@dvt/engine
severity: Medium
probability: Low
context: >
  The orphaned intent reconciler previously reported bootstrapped DISPATCHED intents as cancelled
  even when the sweep only resolved the intent after detecting existing run metadata.
risk: >
  If reconciliation outcomes classify local resolution as cancellation, operational metrics and
  reports overstate provider cleanup activity and can hide whether the reconciler actually issued
  cancel requests.
mitigations:
  - 'DispatchedIntentReconciliationPolicy now returns resolved when the run is already bootstrapped.'
  - 'RunMaintenanceService and IntentReconcilerWorker regression coverage assert the bootstrapped
    DISPATCHED path is counted as resolved, not cancelled.'
  - 'RunMaintenanceService emits dvt.intent.resolved_total with provider and operation labels so
    resolved outcomes keep provider-scoped observability.'
  - 'IRunMaintenanceService, ADR-0030, and the metrics catalog now reserve cancelled for real
    provider cleanup.'
  - 'verify:prepush remains required before presenting the slice as ready.'
review_after: 2026-05-31
---
```

<a id="risk-r-20260408-signal-guard-stale-snapshot-idempotency"></a>

## Independent risk R-20260408-SIGNAL-GUARD-STALE-SNAPSHOT-IDEMPOTENCY

```risk-record-v1
---
id: R-20260408-SIGNAL-GUARD-STALE-SNAPSHOT-IDEMPOTENCY
title: Signal idempotency drift when snapshots lag pause or resume events
status: Open
date: 2026-04-08
owners:
  - packages/@dvt/engine
severity: Medium
probability: Medium
context: >
  SignalTransitionGuard validated PAUSE/RESUME idempotency using materialized snapshots. With
  asynchronous projection stores, snapshot state can lag run events and diverge from runtime-owned
  realized lifecycle facts.
risk: >
  Stale snapshots can cause duplicate PAUSE/RESUME dispatches to adapters or reject valid
  transitions despite authoritative event history, reducing determinism and operational trust.
mitigations:
  - 'SignalTransitionGuard now uses getSnapshot() as a fast path and replays events only when the
    store reports the snapshot stale or missing, except for the ambiguous fresh RUNNING RESUME case
    that still reads event history.'
  - 'SignalTransitionGuard tests cover stale snapshot drift for both PAUSE and RESUME idempotency.'
  - 'SignalTransitionGuard tests assert that fresh PAUSE paths do not call listEvents() on the hot
    path and that fresh RUNNING RESUME still rejects invalid transitions.'
  - 'ADR-0047 runtime-owned lifecycle boundary remains the governing model for RunPaused/RunResumed.'
  - 'verify:prepush remains required before marking the slice ready.'
review_after: 2026-05-31
---
```

<a id="risk-r-20260409-trace-context-adapter-type-drift"></a>

## Independent risk R-20260409-TRACE-CONTEXT-ADAPTER-TYPE-DRIFT

```risk-record-v1
---
id: R-20260409-TRACE-CONTEXT-ADAPTER-TYPE-DRIFT
title: StartRun trace context advertises an unreachable local adapter
status: Open
date: 2026-04-09
owners:
  - packages/@dvt/engine
severity: Low
probability: Medium
context: >
  WorkflowEngine and StartRunTraceContext exposed adapter?: 'temporal' | 'conductor' | 'local' even
  though the trace context builder only emitted temporal or conductor and the canonical runtime
  adapter set was already defined in coreDomainConstants.
risk: >
  Leaving the dead local adapter branch in internal engine types misleads implementers, encourages
  copy-pasted union drift, and weakens the repository's model rigor around trace context semantics.
mitigations:
  - 'StartRunTraceContext now reuses TraceableAdapter from coreDomainConstants.'
  - 'WorkflowEngine.startRun uses the shared StartRunTraceContext shape instead of an inline union.'
  - 'WorkflowEngine.buildTraceContext resolves adapter through TRACEABLE_ADAPTERS, matching runtime
    behavior.'
  - 'Focused engine tests and verify:prepush remain part of the validation baseline for the slice.'
review_after: 2026-06-01
---
```

<a id="risk-r-20260510-engine-artifacts-paths"></a>

## Independent risk R-20260510-ENGINE-ARTIFACTS-PATHS

```risk-record-v1
---
id: R-20260510-ENGINE-ARTIFACTS-PATHS
title: Engine artifact dependency path mapping can drift from workspace dependencies
status: Open
date: 2026-05-10
owners:
  - packages/@dvt/engine
severity: Low
probability: Low
---
mitigation:
  summary: >
    The engine tsconfig now maps @dvt/artifacts to the built package declaration surface, matching
    the package dependency and the pattern used by other artifact consumers.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260510-engine-artifacts-path-resolution.md
  follow_up:
    - Keep package tsconfig path mappings aligned when adding new workspace package imports.
```

<a id="risk-r-20260510-plan-integrity-traceability"></a>

## Independent risk R-20260510-PLAN-INTEGRITY-TRACEABILITY

```risk-record-v1
---
id: R-20260510-PLAN-INTEGRITY-TRACEABILITY
title: Engine plan-integrity ports can lose ADR traceability metadata
status: Open
date: 2026-05-10
owners:
  - packages/@dvt/engine
severity: Low
probability: Low
context: >
  Engine ports are validated by the ADR-0000 traceability gate, which requires baseline ADR metadata
  on governed source files.
risk: >
  Future engine port additions could omit baseline metadata and block PR integration late in the CI
  cycle.
mitigations:
  - ADR-0000 traceability gate fails closed on missing baseline metadata.
  - CI tool contract tests classify governance command surfaces before merge.
review_after: 2026-06-15
---
```

<a id="risk-r-20260512-dhm-ws4-runtime-path-decomposition"></a>

## Independent risk R-20260512-DHM-WS4-RUNTIME-PATH-DECOMPOSITION

```risk-record-v1
---
id: R-20260512-DHM-WS4-RUNTIME-PATH-DECOMPOSITION
title: Runtime control compatibility wrapper can regain cancel or signal ownership
status: Open
date: 2026-05-12
owners:
  - '@dvt/engine'
severity: Low
probability: Low
---
summary: >
  Future edits could reintroduce cancel adapter dispatch, signal adapter dispatch, signal transition
  mapping, or signal-derived event emission into WorkflowEngineCoreService instead of keeping those
  responsibilities in RunCommandService and RunSignalService. A later hardening pass found the
  wrapper also still owned hidden concrete service construction, which is now removed.
mitigation: >
  workflowEngineRuntimePathDecomposition.architecture.test.ts fails if WorkflowEngineCoreService
  regains adapter dispatch, signal transition guard ownership, signal-derived event emission, or a
  single facade run-control dependency. The same guard now fails if the wrapper imports or
  instantiates concrete runtime command/signal services.
evidence:
  - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260512-dhm-ws4-runtime-path-decomposition.md
  - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
```

<a id="risk-r-20260512-we-hx-5-provider-telemetry-seams"></a>

## Independent risk R-20260512-WE-HX-5-PROVIDER-TELEMETRY-SEAMS

```risk-record-v1
---
id: R-20260512-WE-HX-5-PROVIDER-TELEMETRY-SEAMS
title: Provider and telemetry seam extraction could diverge from existing runtime behavior
status: Open
date: 2026-05-12
owners:
  - '@dvt/engine'
severity: Low
probability: Low
---
description: >
  WE-HX-5 moves provider lookup and start-run start/success telemetry behind named internal seams.
  The main risk is accidental semantic drift in provider not-registered errors or non-blocking
  telemetry behavior while removing duplicate lookup and metric code.

mitigation: >
  Keep public contracts unchanged, preserve AdapterNotRegisteredError mapping, reuse existing
  StartRunApplicationService behavior tests, add direct resolver tests, and add a semantic
  architecture guard that rejects raw adapter map lookup and coordinator-owned start/success metric
  emission.
```

<a id="risk-r-20260512-we-hx-6-boundary-fitness"></a>

## Independent risk R-20260512-WE-HX-6-BOUNDARY-FITNESS

```risk-record-v1
---
id: R-20260512-WE-HX-6-BOUNDARY-FITNESS
title: Engine fixture boundary fitness can drift from runtime ownership rules
status: Open
date: 2026-05-12
owners:
  - '@dvt/engine'
severity: Low
probability: Low
---
description: >
  WE-HX-6 hardens engine architecture tests and fixture boundaries. The primary risk is that
  test-only helpers drift into hidden runtime authority by importing production adapters, provider
  SDKs, API composition roots, database migration code, or environment-driven provider selection.

mitigation: >
  Add owned-concern headers to fixture modules, centralize architecture-test support, add a semantic
  boundary-fitness guard for forbidden runtime imports and documentation coverage, and keep public
  runtime contracts unchanged.
```

<a id="risk-r-20260513-plan-schema-version-admission"></a>

## Independent risk R-20260513-PLAN-SCHEMA-VERSION-ADMISSION

```risk-record-v1
---
id: R-20260513-PLAN-SCHEMA-VERSION-ADMISSION
title: Future plan schema versions could bypass admission if a new path skips the policy
status: Open
date: 2026-05-13
owners:
  - packages/@dvt/engine
severity: Medium
probability: Low
description: >
  EA-20260429-01 relies on StartRun continuing to route PlanRef admission through
  PlanSchemaVersionPolicy before plan fetch, bootstrap, or provider dispatch. A future runtime
  entrypoint that dispatches adapters directly could bypass this fail-closed schema-version guard.
mitigation:
  - PlanSchemaVersionPolicy.test.ts covers current and unsupported schema-version cases.
  - planSchemaVersionAdmission.architecture.test.ts requires StartRunValidationPolicy to use the
    semantic policy facade instead of inline pair admission.
  - WorkflowEngine.test.ts proves unsupported schemas do not dispatch to adapters or persist run
    events.
  - ARC-2 remains required for packages/@dvt/engine/** changes.
---
```

<a id="risk-r-20260403-run-execution-context-boundary"></a>

## Independent risk R-20260403-RUN-EXECUTION-CONTEXT-BOUNDARY

```risk-record-v1
---
id: R-20260403-RUN-EXECUTION-CONTEXT-BOUNDARY
title: Run execution context provenance drift at start-run boundary
status: Open
date: 2026-04-03
owners:
  - '@dvt/engine'
  - 'dvt-api'
severity: Medium
probability: Medium
---
summary: >
  Start-run now accepts an optional runExecutionContextRef. If resolver wiring is missing or context
  provenance drifts from PlanRef/RunContext, execution admission must fail closed before adapter
  dispatch.

mitigations:
  - Governed shared contracts and parsers in @dvt/contracts.
  - Explicit engine admission policy checks for tenant/project/environment and plan identity/hash
    alignment.
  - API mapping to deterministic planRejected response with explicit cause.
  - Contract and runtime tests for acceptance and mismatch paths.
  - Protected runtime now wires an artifact-backed resolver for `file://` non-production and `s3://`
    production run execution context artifacts, with `sha256` verification and contract parsing
    before adapter dispatch.
  - Engine admission-policy coverage is split by owned concern (`acceptance`, `plugin-requirements`,
    `provenance`, `compatibility`) with a semantic architecture test preventing the monolithic test
    suite from returning.

monitoring:
  - Track `RUN_EXECUTION_CONTEXT_REJECTED` occurrences.
  - Audit planRejected responses with cause `run_execution_context`.

follow_up:
  - Project the resolved dbt-oriented run execution context into provider-runtime execution so
    `TF-C3` can move from admission-ready artifacts to real dbt dispatch.
  - Keep S08-5-C compatibility fingerprint work isolated from this boundary slice.
```

<a id="risk-r-20260423-runtime-boundary-hardening"></a>

## Independent risk R-20260423-RUNTIME-BOUNDARY-HARDENING

```risk-record-v1
---
id: R-20260423-RUNTIME-BOUNDARY-HARDENING
title: Runtime boundary hardening can drift across engine ownership and API authorization seams
status: Open
date: 2026-04-23
owners:
  - packages/@dvt/engine
  - apps/api
severity: Medium
probability: Medium
context: >
  The 2026-04-23 branch combines engine ownership hardening for `IWorkflowEngine`, fail-closed
  capability validation, and the API access-decision extraction to an embedded-first DVT-owned seam.
  Those changes span engine package surface, runtime validation, API composition, and governed docs.
risk: >
  If future slices reintroduce alternate `IWorkflowEngine` import paths, loosen capability
  validation back to fail-open behavior, or let `apps/api` depend on embedded-backend details
  instead of the access-decision contract, runtime behavior and governance can drift apart. That
  would weaken package ownership, create inconsistent admission outcomes, and make a later PDP swap
  more expensive.
mitigations:
  - >
    Keep `packages/@dvt/engine/test/contracts/package-surface.test.ts` as the guard for the single
    `@dvt/engine` import surface.
  - >
    Keep `packages/@dvt/engine/test/contracts/capabilities.contract.test.ts` and the API
    executability validation coverage green so undeclared adapter capabilities fail closed
    consistently.
  - >
    Preserve `IAccessDecisionService` as the only application-facing authorization seam and keep
    backend lifecycle behind the protected security runtime contract.
  - >
    Keep ADR-0051, the API architecture guide, and the 2026-04-23 review note aligned with the
    shipped runtime shape.
  - >
    Run the package test/typecheck baselines, contracts schema sync, golden validation, ARC check,
    and `pnpm verify:prepush` on future changes touching these seams.
review_after: 2026-06-30
---
```

<a id="risk-r-20260512-ar-c5-adapter-circuit-breaker"></a>

## Independent risk R-20260512-AR-C5-ADAPTER-CIRCUIT-BREAKER

```risk-record-v1
---
id: R-20260512-AR-C5-ADAPTER-CIRCUIT-BREAKER
title: Adapter breaker thresholds may need production tuning
status: Open
date: 2026-05-12
owners:
  - '@dvt/engine'
  - 'dvt-api'
severity: Low
probability: Medium
---
context: >
  AR-C5 introduces default circuit-breaker thresholds for provider adapter calls. The defaults
  prevent timeout pileups but may need adjustment after sustained production telemetry is available.
mitigation: >
  The production composition exposes optional threshold and open-state configuration. Breaker state
  metrics and health posture provide the signals required for later SLA tuning.
```

<a id="risk-r-20260512-dhm-ws2-runtime-composition-root"></a>

## Independent risk R-20260512-DHM-WS2-RUNTIME-COMPOSITION-ROOT

```risk-record-v1
---
id: R-20260512-DHM-WS2-RUNTIME-COMPOSITION-ROOT
title: Intent reconciler runtime factory can regain direct assembly ownership
status: Open
date: 2026-05-12
owners:
  - dvt-api
severity: Low
probability: Low
---
summary: >
  Future edits could reintroduce config, store, adapter, maintenance, worker, or handle assembly
  directly into createIntentReconcilerRuntime instead of keeping that sequence inside the dedicated
  intentReconcilerRuntimeComposition module and named IntentReconcilerRuntimeComposition command
  rail.
mitigation: >
  intentReconcilerRuntimeComposition.architecture.test.ts fails if the exported facade imports
  concrete adapter or engine-runtime assembly, if the dedicated composition module is removed, if
  the factory directly assembles stores, migrations, adapters, maintenance, workers, or runtime
  handles, or if the ordered composition calls are removed.
evidence:
  - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260512-dhm-ws2-runtime-composition-root.md
  - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - apps/api/src/runtime/intentReconcilerRuntimeComposition.ts
```

<a id="risk-r-20260514-we-hx-0-hardcut-canonical-map"></a>

## Independent risk R-20260514-WE-HX-0-HARDCUT-CANONICAL-MAP

```risk-record-v1
---
id: R-20260514-WE-HX-0-HARDCUT-CANONICAL-MAP
title: WorkflowEngine canonical docs can drift back to retrocompatibility posture
status: Open
date: 2026-05-14
last_reviewed: 2026-05-22
owners:
  - '@dvt/engine'
severity: Medium
probability: Low
---
summary: >
  Active WorkflowEngine architecture documentation can regress to migration or retrocompatibility
  language after the hardcut, creating two active truths for the same engine boundary.

mitigation: >
  The WE-HX-0 architecture guard rejects compatibility-first, compatibility facade, and
  compatibility adapter posture in the canonical WorkflowEngine architecture docs, active engine
  roadmap, and run-control headers.

validation:
  - pnpm --filter @dvt/engine test --
    test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
  - pnpm governance:refresh
```

<a id="risk-r-20260518-dhm-ws3-admission-seam"></a>

## Independent risk R-20260518-DHM-WS3-ADMISSION-SEAM

```risk-record-v1
---
id: R-20260518-DHM-WS3-ADMISSION-SEAM
title: Start-run admission phase can drift back into coordinator construction
status: Open
date: 2026-05-18
owners:
  - '@dvt/engine'
severity: Low
probability: Low
---
summary: >
  Future edits could reintroduce direct StartRunAdmissionService construction or plan-integrity
  dependencies inside StartRunApplicationService instead of using the injected
  IStartRunAdmissionService seam.
mitigation: >
  startRunApplicationDecomposition.architecture.test.ts now fails if the coordinator constructs the
  admission phase, and StartRunApplicationService.test.ts proves the injected admission seam is
  invoked before intent creation and provider execution.
evidence:
  - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260518-dhm-ws3-admission-seam.md
  - packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - packages/@dvt/engine/test/services/StartRunApplicationService.test.ts
```

<a id="risk-r-20260522-we-hx-parent-hardcut-closeout"></a>

## Independent risk R-20260522-WE-HX-PARENT-HARDCUT-CLOSEOUT

```risk-record-v1
---
id: R-20260522-WE-HX-PARENT-HARDCUT-CLOSEOUT
title: WE-HX parent closure can hide future engine decomposition work
status: Open
date: 2026-05-22
owners:
  - '@dvt/engine'
severity: Low
probability: Low
---
description: >
  Closing the WE-HX parent removes the umbrella task from next-work routing. The residual risk is
  that future engine decomposition work could be treated as implicitly covered by the parent instead
  of being tracked through its own command/query rail, component guide, architecture guard,
  evidence, and risk record.

mitigation: >
  The parent closeout states that future engine work must be represented by independent tasks. The
  updated architecture guard validates current Lane A hardcut posture, and the parent evidence
  points to the accepted child waves that actually implemented the architecture.
```

<a id="risk-r-20260915-transform-row-preview"></a>

## Independent risk R-20260915-TRANSFORM-ROW-PREVIEW

```risk-record-v1
---
id: R-20260915-TRANSFORM-ROW-PREVIEW
title: Transform exploration can load an expensive warehouse projection
status: Open
date: 2026-09-15
owners:
  - dvt-api
severity: Medium
probability: Low
---
description: >-
  A semantically valid Transform can still project an expensive upstream query while a user is
  exploring rows from Canvas. A selected-operation sample can also be misattributed if relation
  identity or semantic revision changes while a query is in flight.
mitigations:
  - Resolve SQL only from the protected current Canvas draft and semantic closure
  - Execute inside a read-only transaction with a three-second statement timeout
  - Enforce a default limit of 20 and a maximum limit of 50 at the contract and API boundary
  - Return stable failures without exposing SQL, credentials or connection authority to the client
  - Cover timeout, rollback, bounds and live PostgreSQL exploration with automated tests
  - Require the full semantic digest with selected RelationId and resolve both against the protected
    draft
  - Echo selected identity and clear stale or late samples instead of presenting final-Model rows
  - Block unapplied local conditions and reject unsupported selected subtrees before the database
    probe
```
