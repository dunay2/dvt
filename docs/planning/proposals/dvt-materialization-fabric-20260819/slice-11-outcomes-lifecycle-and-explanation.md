---
title: S11 - Reused outcomes, explanation, retention and quarantine
status: Conditional GO; outcome contract is early critical-path work
owner: Contracts / Engine / State Store / Web / Observability
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2516, 2517, 2518]
existing_owners: [2161, 2473]
---

# S11 — Reused outcomes, explanation, retention and quarantine

## Decision

**Conditional GO.** The canonical reused-outcome/evidence contract is an early dependency for S05 and S07. Quarantine, retention/garbage collection and UI/observability evolve after S02–S04 establish result/index/pin semantics.

Reuse must be represented as successful result satisfaction, never as `StepSkipped`. Product and operators must see why a result was accepted, missed, bypassed, rejected or quarantined without the Web reconstructing semantics or querying the materialization index directly.

## Need

A materialization system is unsafe and unmanageable when it reports only `cached`:

- downstream state cannot distinguish omission from successful reuse;
- users cannot understand why one step ran and another did not;
- operators cannot identify corruption, stale evidence or lease contention;
- high hit ratio can hide false-hit risk;
- immutable outputs accumulate without reference-aware lifecycle policy;
- a corrupt result may continue serving while asynchronous cleanup runs.

S11 provides the canonical outcome vocabulary, lifecycle transitions and projections required to operate the Fabric as a product rather than a hidden optimization.

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

### Runtime contracts

`packages/@dvt/contracts/src/schema-packs/run-events.ts` and related common schemas currently represent completed, failed and skipped steps. `StepSkipped` has an empty payload and means that work was omitted by plan/gateway semantics. It cannot carry a verified result descriptor or satisfy a materialized output correctly.

Current `StepResultEvidenceSchema` includes bounded sink/acquisition evidence, not a canonical result-reuse outcome.

### Planner/UI

`PlanExecutionDecision.v1.ts` and `apps/web/src/app/components/PlanExecutionDecisionView.tsx` present `RUN/SKIP/PARTIAL` selection closure. They must remain separate from materialization disposition.

`apps/web/src/app/services/runs/runEventPresentationModel.ts` is a current projection seam for run events. Web should consume shared codes/read models, not infer cache semantics.

### Existing authorities

- #2161 owns the user-facing safe-partial-execution explanation experiment.
- #2473 owns broader runtime diagnostic evidence.
- existing event/read-model, i18n, accessibility and retention infrastructure must be extended rather than replaced.

No current source owns `REUSED_PLANNED`, `REUSED_ACTION_CACHE`, materialization quarantine lifecycle or reference-aware output collection.

## Architectural fit

```text
canonical engine/run event
  -> state/read-model projection
  -> existing API
  -> Plan Preview / Runs / Console

materialization index + verifier
  -> quarantine/retire transitions
  -> existing lifecycle jobs evaluate references/pins

OpenTelemetry projection
  -> bounded-cardinality operational metrics/spans
```

Canonical business truth remains in versioned DVT contracts/events. Metrics/traces and UI are projections, not decision authorities.

## Outcome model

Preferred event evolution:

- preserve terminal step status `SUCCESS`;
- add a completion mode/evidence to `StepCompleted`, unless migration analysis proves a new `StepReused` event cleaner;
- keep selection `SKIP` unchanged.

Required runtime outcomes:

```text
EXECUTED
REUSED_PLANNED
REUSED_ACTION_CACHE
WAITED_FOR_SINGLE_FLIGHT
CACHE_MISS
CACHE_BYPASSED
CANDIDATE_REJECTED
CACHE_ENTRY_QUARANTINED
```

A reused evidence payload binds safe references to:

- `InvocationDigest`;
- `ResultManifest` descriptor;
- verification/profile/policy versions;
- planned versus opportunistic source;
- producer run reference only when authorized;
- stable reason/outcome code;
- measured saved work observations.

Events never carry raw recipes, secrets, protected URIs, full payloads or arbitrary unbounded reason text.

## Lifecycle model

```text
VERIFYING
  -> ELIGIBLE
  -> QUARANTINED(reason/evidence)
  -> RETIRED
  -> COLLECTIBLE only when no active reference/pin/hold remains
```

Quarantine removes eligibility atomically before asynchronous investigation or cleanup. Immutable manifests/outputs are not edited or repaired in place. A corrected result is a new immutable manifest and eligible association.

Collection is reference-aware:

- eligible index association;
- plan/run/evidence pin;
- other manifest sharing the same blob;
- investigation/legal/operational hold;
- grace and policy version;
- external-provider retention authority.

Object age alone is never sufficient.

## Open-source convergence

### Observability

Use [OpenTelemetry](https://opentelemetry.io/docs/specs/) for bounded counters, histograms and spans where useful. It does not replace canonical DVT events.

Recommended bounded attributes include outcome/reason/profile IDs and coarse component status. Full digests, tenant/project IDs, URLs/table names and arbitrary error text must not be metric labels.

### Lifecycle

Reuse PostgreSQL transactional reference accounting, existing DVT retention/archive policy and `SKIP LOCKED` batch-work patterns. S3 lifecycle/versioning/Object Lock remains an operational policy choice, not the semantic reference authority.

### Product explanation

Extend existing Plan Preview, Runs and Console surfaces owned by #2161. Do not introduce a standalone cache-management application before operational need is proven.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Event evolution | High | Historical replay and idempotency compatibility. |
| Read-model/UI | Medium–High | Conflating selection skip, miss and successful reuse. |
| Quarantine | High | Candidate must stop serving atomically. |
| Retention/GC | Very high | Shared objects, pins and collector races. |
| Observability | Medium | High-cardinality/security leakage. |
| Saved-work metrics | Medium | Reporting guesses as measured value. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| Completed/failed/skipped events | Yes | Reused-success completion evidence. |
| Run read models/UI | Yes | Shared materialization outcome/reason projection. |
| Plan selection UI | Yes | Separate planned materialization disposition. |
| Retention/jobs | Existing domains | Materialization reference/quarantine policy. |
| Diagnostics | #2473 | Materialization-specific verified reason chain. |
| Telemetry | Existing infrastructure | Bounded hit/miss/verify/lease/publication metrics. |

## Task decomposition

1. [#2516](https://github.com/dunay2/dvt/issues/2516) freezes explicit reused execution outcomes and evidence contracts.
2. [#2517](https://github.com/dunay2/dvt/issues/2517) adds quarantine, reference-based retention and garbage-collection policy.
3. [#2518](https://github.com/dunay2/dvt/issues/2518) adds shared observability and user explanation projections through #2161/#2473 authorities.

## Implementation sequence

```text
S02 manifest/verifier vocabulary
  -> #2516 canonical runtime outcome/evidence
  -> S05/S07 can emit successful reused outcomes

S03 pins + S04 index states
  -> #2517 quarantine/reference lifecycle

canonical events + baseline measurements
  -> #2518 read models, UI and bounded telemetry
```

The outcome contract must be available before the first vertical so no temporary `StepSkipped` or stringly typed “cached” semantics become persisted history.

## Verification

Event/read-model cases:

- executed success;
- planned reuse success;
- opportunistic reuse success;
- wait then reuse;
- miss/bypass then execution;
- candidate rejected for every stable reason;
- quarantine before/after lookup;
- replay of historical event streams;
- retries, duplicate events and continue-as-new/recovery;
- unknown future reason code in an older reader.

Lifecycle cases:

- concurrent verify, pin, quarantine, release and collect;
- shared blob referenced by multiple manifests;
- corrupt candidate stops serving before deletion;
- crash during collection;
- plan/run/evidence holds;
- wrong-tenant operation and disclosure.

UI/metrics cases:

- `SKIP` never displayed as reuse;
- rejected candidate never displayed as hit;
- planned versus opportunistic distinction;
- accessible/i18n rendering;
- bounded metric cardinality under random invocation digests;
- saved bytes/time equal measured observations, never estimates.

Release gates:

```text
reused output projected as SKIPPED = 0
historical event replay regression = 0
quarantined result served after transition = 0
active/shared referenced object collected = 0
high-cardinality digest/URI metric labels = 0
unauthorized candidate/producer disclosure = 0
```

## Stop and narrow conditions

Stop or narrow when:

- event evolution cannot preserve historical replay/idempotency;
- lifecycle ownership would create another scheduler/store;
- safe reason details cannot be exposed without scope leakage—show coarse authorized reasons instead;
- saved-work observations are unavailable—omit them rather than estimate;
- UI implementation duplicates #2161 surfaces;
- collection cannot be made reference-aware—retain objects until it can.

## Gate result

```text
gateDecision: conditional-go
gateScope: canonical-outcomes-lifecycle-and-projections
authorizedImplementation: false
earlyCriticalPath:
  - #2516 before S05/S07
laterDependencies:
  - #2517 after S03/S04
  - #2518 through #2161/#2473
```
