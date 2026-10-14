---
id: R-20260322-API-HEALTH-01
title: API health can report healthy status when the reconciler fails after startup
status: Open
date: 2026-03-22
owners:
  - api
  - runtime
  - ops
severity: Medium
probability: Medium
---

# R-20260322-API-HEALTH-01 - API health can report healthy status when the reconciler fails after startup

## Context

Workstream `RC-D1` added intent-reconciler status to `/healthz`, and now
reports degraded status both for failed bootstrap and runtime sweep failure.

## Residual Risk

Although `/healthz` now transitions `healthy/degraded` with runtime signal,
residual risk remains: degradation scenarios that do not trigger a sweep callback
(for example, silent blocking or stalling) may not be visible immediately.

## Impact

- possible partial false negatives in platform health checks;
- delayed detection of failures not covered by current callbacks;
- risk of intent accumulation in stalling scenarios.

## Implemented Mitigations

- `/healthz` exposes per-component status (`intentReconciler`);
- bootstrap degradation reported with `reasonCode: bootstrap_failed`;
- runtime degradation reported with `reasonCode: runtime_unavailable`;
- runtime stalling watchdog integrated with health polling and sweep markers;
- public payload sanitized (no `err.message`);
- contract tests cover `disabled`, `starting`, `degraded`, no exposure of
  `reason`, and `reasonCode` fallback;
- integration test covers stalling degradation and recovery via
  `markSweepSignal` (`apps/api/test/server.test.ts`).

## Recommended Additional Remediation

1. Add a dedicated metric for reconciler runtime availability.
2. Add timeout/heartbeat detection for stalling without exceptions.
3. Add an integration test for controlled `healthy -> degraded` transition
   with real runtime behavior.

## Evidence

- `apps/api/src/routes/health.ts`
- `apps/api/src/server.ts`
- `apps/api/src/runtime/intentReconcilerRuntime.ts`
- `apps/api/test/app.test.ts`
- `docs/planning/qa-architecture-findings-and-risks.md`

## Update 2026-03-25

Additional error-governance controls were added in engine to reduce semantic
drift risk in operational error signaling:

- typed `code -> messageKey -> messageParams` contract in engine errors;
- removal of hardcoded human-readable text from error constructors;
- dedicated i18n contract tests (`errorI18n.contract.test.ts`) to prevent
  silent regressions.

Effect on this risk: improves traceability and consistency of observable error
signals, but does not change the reconciler runtime residual-risk status.

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
