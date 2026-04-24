# 2026-04-24 Fowler review: AR-C3 admission observability analysis and remediation

## Scope

This review covers the `AR-C3` branch after the three runtime slices were
already in place:

- abstract execution-capacity admission seam
- Temporal `readyz` binding in protected-runtime composition
- operator-facing telemetry and runbook closure

The Fowler-style question was not whether the branch worked. It was whether the
branch had reached semantic closure as a component inside `apps/api`.

## Executive read

The branch had improved the runtime boundary in the right place, but it still
carried one maturity gap:

- admission telemetry existed as real code and real tests
- its semantic ownership was still implicit
- the seam guide was carrying observability truth that actually belonged to a
  different local component

The remediation in this pass was therefore not a new feature. It was a
component-boundary hardening pass.

## What improved before this remediation

### 1. Better boundary placement

`AR-C3` moved capacity admission into a proper application seam instead of
leaking scheduler vocabulary into routes or controllers.

That is the right move.

### 2. Better composition ownership

The concrete Temporal binding now lives in protected-runtime composition rather
than inside `BackpressureAwareStartRunUseCase`.

That matches mature systems where provider truth is composed at the edge, not
hard-coded inside orchestration.

### 3. Better published language

Caller-visible denial stayed inside canonical `system_backpressure`, while the
specific reason moved into governed `code` values.

That is a stable public language.

### 4. Better fail-closed posture

Missing or malformed capacity signal does not silently degrade into accept.

That is operationally mature.

## What was still weak

### Missing semantic encapsulation

The branch still had a real subcomponent hiding in plain sight:

- `AdmissionTelemetry.ts`
- `IBackpressureCapacityTelemetry.ts`
- `startRunAdmissionDecisions.ts`
- `ObservabilityAdmissionTelemetry.ts`
- `ObservabilityBackpressureCapacityTelemetry.ts`
- `admissionTelemetryMetrics.ts`

Those files already formed a coherent cluster, but the repo did not describe
them as one owned component.

### Hidden ownership drift

The execution-capacity guide had absorbed telemetry truth because that was the
nearest documentation surface at the time. That made the guide useful, but
architecturally muddy.

### Fitness-function gap

The existing tests proved behavior, but there was no semantic architecture test
freezing:

- one decision family for execution-capacity denial
- bounded label policy
- shared metric namespace ownership
- required owned-concern docblocks across the telemetry cluster

## Comparison with mature systems

Compared with mature control planes, the branch is now closer to the healthy
shape:

- like Kubernetes admission chains, policy and diagnostics are distinct layers;
  admission decides, observability reports
- like Prometheus-oriented production systems, labels stay bounded and do not
  use request or tenant identity as metric dimensions
- like mature job-control systems, readiness loss is fail-closed and diagnosed
  through operator signals rather than exposed as a new public API dialect

The branch is still intentionally smaller than those systems, but the pattern
direction is now aligned.

## Antipatterns detected

- seam guide owning telemetry truth that belonged to a different component
- missing owned-concern docblocks in live telemetry modules
- shared metric catalog without explicit documented ownership
- local architectural semantics carried by unit tests only

## Patterns reinforced by the remediation

- `Separated Interface`: application ports and observability adapters now read
  as different concerns, not one blended concern
- `Published Language`: execution-capacity denial stays in canonical
  `reject_system` / `would_reject_system`
- `Explicit Boundary`: admission observability is now a named local component
- `Semantic Fitness Function`: the new architecture test freezes business
  semantics, not just import shape

## Components that now group cleanly

### Start-run execution-capacity admission

Owns:

- admission seam
- fail-closed default binding
- concrete provider binding route

### Start-run admission observability

Owns:

- canonical admission telemetry vocabulary
- backlog-snapshot telemetry vocabulary
- decision-to-metrics/log translation
- shared `dvt.admission.*` metric names
- bounded label policy

## Repetitions fixed

- telemetry ownership repeated across seam guide, runbook references, and code
  comments is now consolidated into one local component guide
- the architecture artifact map no longer redefines the telemetry cluster ad
  hoc inside the test; it is grouped in shared component support

## Drift fixed

- code now states owned concern at the top of every live telemetry module in
  the subcomponent
- the API local-guide index now lists the admission observability component
- the API current-to-target architecture page now points to the local
  observability guide
- the execution-capacity guide now links to the observability guide instead of
  quietly owning that truth by itself
- the canonical doc-code matrix now includes the new local guide in the active
  start-run guide family

## Lessons for future slices

1. Extracting a seam is not enough. If telemetry, runbook truth, or audit truth
   grows around it, those supporting concerns need explicit local components.
2. Unit tests are not an architectural fitness function. Once a cluster becomes
   a named component, add a semantic architecture test.
3. Shared metric catalogs are real ownership surfaces. Document them or they
   drift into “nobody owns it”.
4. Bounded-label policy should be frozen in architecture tests early; otherwise
   high-cardinality leakage arrives through innocent edits.

## Opportunities still open

- unify `AdmissionTelemetry` and `IBackpressureCapacityTelemetry` under a
  higher-level local observability package or folder when more admission paths
  reuse them
- add a metrics schema lint or helper if more observability components adopt
  the same bounded-label rules
- externalize dashboard truth when the repo starts carrying governed alert
  definitions rather than only runbook references

## ADR judgment

No new ADR is needed for this pass.

Reason:

- no public contract changed
- no new bounded context was introduced
- no ownership decision changed at the architectural layer

This was semantic hardening inside an already-accepted route.
