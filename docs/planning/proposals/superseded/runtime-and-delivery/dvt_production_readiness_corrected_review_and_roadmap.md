---
title: DVT Production Readiness Review - Corrected Top 3 Gaps and Roadmap
status: Draft
owner: Architecture
last_reviewed: 2026-04-02
planning_type: proposal
---

# DVT Production Readiness Review - Corrected Top 3 Gaps and Roadmap

## What this revision corrects

This version corrects five problems in the prior plan.

1. It stops treating the third gap as a vague **"observability problem"** and replaces it with a more concrete repo-backed area: **runtime admission, state ownership, and event-contract seams**.
2. It corrects the frontend statement from **"web has no tests"** to the more accurate claim: **the tree contains test files, but the workspace has no `test` script and the repo status document still says automated coverage is absent**.
3. It removes or downgrades claims that were not sufficiently verified from repository sources.
4. It replaces informal scoring with an explicit weighted model.
5. It ties the roadmap directly to the repo's named open slices, instead of relying on generic production advice.

---

## Source base

### Repository sources

- [`docs/architecture/system-delivery-status.md`](../../architecture/system-delivery-status.md)
- [`docs/planning/status/generated-code-state.md`](../status/generated-code-state.md)
- [`apps/web/package.json`](../../../apps/web/package.json)
- [`package.json`](../../../package.json)
- [`docs/planning/status/planner-current-state-assessment.md`](../status/planner-current-state-assessment.md)

### External references used as design benchmarks

- Martin Fowler, **Event Sourcing**: <https://martinfowler.com/eaaDev/EventSourcing.html>
- Martin Fowler, **Presentation Domain Data Layering**: <https://martinfowler.com/bliki/PresentationDomainDataLayering.html>
- Temporal docs: <https://docs.temporal.io/>
- Backstage frontend testing docs: <https://backstage.io/docs/frontend-system/building-plugins/testing/>
- OpenTelemetry Collector docs: <https://opentelemetry.io/docs/collector/>

---

## Scoring model

Each candidate gap is scored from **1 to 5** on five dimensions.

| Dimension                        | Weight | Meaning                                                           |
| -------------------------------- | -----: | ----------------------------------------------------------------- |
| Production criticality           |    30% | How directly this gap blocks safe production use                  |
| Architecture/runtime closure gap |    25% | How far current runtime behavior is from intended operating model |
| Blast radius                     |    20% | How many packages, flows, or operating capabilities depend on it  |
| Verifiability deficit            |    15% | How weak current automated verification or runtime truth is       |
| Cost of postponement             |    10% | How expensive it becomes if deferred further                      |

### Ranking formula

`weighted score = sum(score * weight)`

This is not a vanity score. It is only used to rank what should be attacked first.

---

## Corrected ranking

| Rank | Area                                                         | Prod criticality | Closure gap | Blast radius | Verifiability deficit | Postponement cost | Weighted score / 5 |
| ---- | ------------------------------------------------------------ | ---------------: | ----------: | -----------: | --------------------: | ----------------: | -----------------: |
| 1    | Planner lifecycle, plan storage, and admissible execution    |                5 |           5 |            5 |                     4 |                 5 |           **4.85** |
| 2    | Runtime admission, state ownership, and event-contract seams |                5 |           4 |            5 |                     4 |                 5 |           **4.55** |
| 3    | Web operator surface (`apps/web`)                            |                4 |           4 |            4 |                     5 |                 4 |           **4.15** |

### Why "observability" is not top-3 as a standalone item anymore

Observability is still important, but the repo's own Phase 2 debt list names more concrete open slices first:

- `S02 IRunStateStore Split`
- `S03 StartRunCoordinator Extraction`
- `S05 EventEnvelope.payloadVersion`
- `S04 ProviderRefUpdated Event`
- `S08 plan record and plan store model`

Those are more direct production blockers than treating observability as a single generic bucket.

`ADR-0040` is closed baseline context, not an open blocker.

Observability is therefore included in this plan as a **cross-cutting enabling stream**, not as the main third-ranked blocker.

---

# 1. Planner lifecycle, plan storage, and admissible execution

## Why this is the worst current production gap

The planner is already strong as a deterministic compiler, but the remaining gap
is not "make planning work at all". The real gap is to close the planner output
as a governed operational artifact that admission, recovery, and operator truth
can all depend on safely.

That matters because DVT is not only a compiler. It is a workflow execution
system that claims traceability, determinism, and controlled execution. That
claim is not fully closed until a plan is a first-class runtime artifact with:

- persistent canonical identity
- explicit adapter-scoped executability
- admissible execution rules
- explicit lineage, supersession, and archival posture
- recovery semantics that do not blur plan identity and run identity

## Repo evidence

From the current repository:

- the planning layer remains **Partial**
- the planner baseline is **71% overall**
- compile core is **94%**
- validation/storage is **50%**
- recovery is **17%**
- `PlannerBackedStartRunUseCase`, `StoredPlanExecutabilityValidator`, and
  `PostgresPlanStore` already exist
- `ADR-0040` already closed retry ownership, so `S08` is no longer blocked by
  `S09`

That is a strong signal that the main weakness is not plan generation. The
remaining weakness is the **operational model around the generated plan**.

## The architectural decision that appears to have been taken

The repo appears to have prioritized the right early move:

> build the planner as a deterministic, typed, contract-backed compiler first.

That was a sensible decision because it reduces the most dangerous class of early failures:

- non-deterministic planning,
- unstable IDs,
- step-type drift,
- ad hoc compatibility behavior.

## Why that decision was rational earlier

Earlier, the highest leverage work was to make the planner **semantically correct** and **reproducible**.

That paid off:

- typed graph-source boundary
- planner/verifier/interpreter/DSL package split
- deterministic compile core
- explicit plan-version surfaces
- contract-driven step typing

## Why the same decision is now wrong to keep extending

The system has crossed the point where "good compiler core" is enough.

At this stage the open problem is no longer _how to build a plan_.  
It is _how to govern the plan as an admissible production artifact_.

Without that closure:

- admission remains indirect,
- recovery remains fuzzy,
- auditability is incomplete,
- planner-to-engine integration keeps patch-like seams,
- operator truth remains weaker than the architecture suggests.

## Trade-offs of the current posture

### What the repo gained

- strong deterministic core
- explicit contracts
- reduced semantic chaos early

### What the repo deferred

- persisted lifecycle
- admissibility rules
- recovery and replanning model
- operator-facing plan state

### Why that trade-off now hurts

Because DVT's value is not just compilation. It is **governed execution**.

A deterministic compiler without a governed lifecycle is still only part of the product.

## Corrected mature improvement proposal

The earlier "mega PlanRecord" sketch is too broad and now needs to be retired.
The corrected S08 model should follow four explicit filters:

- Fowler-style operational artifact truth
- Hexagonal DDD ownership boundaries
- SRP and ISP
- CQRS write/read separation

### A. Keep serializable records in planner contracts, not behavior ports

Planner-domain serializable records should remain physically published from
`@dvt/contracts/src/contracts/planner`, because they are cross-package
serializable contracts.

That does **not** mean behavior ports belong in the shared kernel.

`IPlanStore` behavior must live in `@dvt/artifacts`, because `ADR-0034` already
assigns artifact behavior to the Artifacts bounded context.

### B. Persist one canonical plan artifact in S08-v1

`ADR-0042` already closed the drift where canonical and engine-visible plan
shapes diverged. S08-v1 must not reopen that problem.

That means:

- `PlanRecord` persists one canonical plan artifact
- S08-v1 does **not** model `canonicalPlanJson` and `executablePlanJson` as
  first-class sibling payloads
- any derived executable artifact is a later optional slice with its own
  lifecycle, not a default second payload

### C. Split the model into three records, not one overloaded lifecycle

The clean S08-v1 model is:

- `PlanRecord`
  - one canonical persisted plan artifact
  - lineage fields only
  - archival posture only
- `PlanExecutabilityRecord`
  - one row per `planId + adapterId`
  - `PENDING | VALID | INVALID`
- `PlanAdmissionLink`
  - one row per admitted `runId + planId + adapterId`

This matters because admission is a relation, not a plan state. `ADMITTED`
should not become part of the `PlanRecord` lifecycle vocabulary.

### D. Make CQRS explicit

The plan store should not become a single broad repository.

Recommended split:

- `IPlanStoreWriter`
  - `createPlanRecord`
  - `recordExecutability`
  - `markAdmitted`
  - `markSuperseded`
  - `archivePlan`
- `IPlanStoreReader`
  - `getPlanRecord`
  - `listExecutabilityByAdapter`
  - `getAdmissionHistory`
  - `getSupersession`

This keeps write truth and operator/query truth separate.

### E. Keep S08-v1 Postgres-backed and migration-friendly

The repo already has `PostgresPlanStore`, tests, and planner-backed admission
wiring. The mature next step is therefore not to invent a new storage backend.

S08-v1 should:

- keep PostgreSQL as the first system of record
- evolve `PostgresPlanStore` to the explicit three-part model
- keep `IPlanValidationLifecycleStore` as a compatibility facade during
  migration

### F. Defer speculative `bindingState`

The current code does not have a first-class persisted binding aggregate.
Adding `bindingState` now would be speculative. It should be excluded from
S08-v1.

## Why this is grounded, not decorative

The repo's own open debt points in exactly this direction:

- `S08` remains open
- the runtime already has a partial persisted-plan bridge
- active status docs are stale about that bridge

This proposal is therefore not adding a new theme. It is correcting the shape
of the remaining S08 work so the repo does not harden new ownership drift or a
fake lifecycle model.

The authoritative package for this correction is now:

- [ADR-0043 - Plan record, plan store, and artifacts ownership](../../adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md)
- [S08 plan record and plan store gap review](../reviews/20260402-s08-plan-record-plan-store-gap-review.md)
- [S08 plan record and plan store execution plan](s08-plan-record-plan-store-execution-plan-20260402.md)

## Examples and rationale from mature references

### Martin Fowler - Event Sourcing

Fowler's point is not that every system must become event sourced. The relevant lesson is that systems requiring historical truth and reconstruction should store state changes in a way that preserves how they got there, not only where they are now.

For DVT, the relevant lesson is that operational artifacts need explicit truth
and explicit transitions. In S08 that supports:

- explicit persisted plan records
- explicit executability records
- explicit admission relations
- reconstructable plan history without overloading one lifecycle object

### Temporal

Temporal's value is not merely workflow execution. It is explicit runtime semantics under crash, replay, and recovery. DVT should take the same lesson at the planner boundary: critical execution artifacts must be explicit, versioned, and admissible by rule.

## Acceptance criteria

- `S08` is no longer described as blocked by `S09`
- no active doc still says there is no `PostgresPlanStore`
- `PlanRecord` is modeled as one canonical persisted plan artifact
- executability is modeled per adapter
- admission is modeled as a relation, not as a plan state
- plan-storage behavior is owned by `@dvt/artifacts`, not `@dvt/contracts`
- new S08 serializable records ship with schema, parser, docs, and tests

---

# 2. Runtime admission, state ownership, and event-contract seams

## Why this is the second-worst production gap

The repo explicitly lists these open Phase 2 slices:

- `S02 IRunStateStore Split`
- `S03 StartRunCoordinator Extraction`
- `S05 EventEnvelope.payloadVersion`
- `S04 ProviderRefUpdated Event` (blocked by `S02 + S05`)

That is a strong signal that a central production weakness is still concentrated in the runtime control plane: **who owns start-run orchestration, where state responsibilities sit, and how event contracts evolve safely**.

This is more specific and more actionable than the prior generic "observability" bucket.

## Repo evidence

The current status page says:

- `apps/api` is closed for Phase 1 and already exposes protected runtime surfaces
- `startRun` admission already includes resilient backpressure logic
- but the open slice debt still includes store split, coordinator extraction, payload versioning, and the blocked provider reference update event

That means the product is already using these paths, while some of the core seams under them remain unfinished.

## The architectural decision that appears to have been taken

The repo seems to have accepted a very common and often valid temporary compromise:

> deliver the `startRun` path end-to-end first, then extract orchestration boundaries later.

That made sense because it brought the system to a usable vertical slice quickly.

## Why that decision made sense earlier

It enabled:

- end-to-end run start
- auth and policy closure in API
- backpressure handling
- query surface delivery
- integration tests against real OIDC and Postgres

That is real product value.

## Why it is now becoming expensive

When `startRun` remains the place where policy, coordination, event semantics, state writes, and provider reconciliation all meet, three problems emerge:

1. runtime ownership becomes harder to reason about,
2. contract evolution becomes risky,
3. testing becomes broader and more brittle than it should be.

The open slices named by the repo are exactly the symptoms of that pressure.

## Trade-offs of the current posture

### What the repo gained

- a working end-to-end entry path
- fast product closure on the first operational slice

### What the repo deferred

- role-specific stores
- coordinator extraction
- event version governance
- provider reference updates as a formal event

### Why that matters now

These are not aesthetic refactors.  
They determine whether the control plane stays explainable as complexity rises.

## Deep improvement proposal

### A. Split `IRunStateStore` by responsibility

The name itself suggests over-concentration.

Recommended target shape:

```md
IRunWriteStore
IRunReadStore
IRunSnapshotStore
IRunMetadataStore
IRunArchiveStore
IRunIntentStore
```

The exact names can differ, but the point is the same:

- separate write path from read path
- separate snapshot/projector concerns from run metadata
- separate archival concerns from hot-state concerns

This makes both runtime ownership and testing narrower.

### B. Extract `StartRunCoordinator` as an application service

`StartRunCoordinator` should become the place where the following are orchestrated deliberately:

- authz outcome already computed by the entry layer
- plan admissibility check
- tenant policy enforcement
- backpressure admission
- intent creation
- initial bootstrap write
- provider start
- provider reference reconciliation
- event emission

That keeps API thin and engine focused.

### C. Version the event envelope explicitly

`S05 EventEnvelope.payloadVersion` should be treated as a production gate, not a cleanup task.

Recommended envelope shape:

```md
EventEnvelope

- eventId
- eventType
- payloadVersion
- runId
- occurredAt
- causationId
- correlationId
- actor
- payload
```

Without explicit payload versioning:

- replay safety gets weaker
- migration becomes riskier
- downstream consumers carry hidden assumptions

### D. Emit `ProviderRefUpdated` as a formal event

If provider references can be reconciled after pre-bootstrap behavior, that reconciliation should not remain an implicit detail. It should become a formal, versioned state transition.

This is exactly why `S04 ProviderRefUpdated Event` matters.

### E. Make state ownership visible in tests

Once the seams are split, test strategy should follow them:

- coordinator tests
- store contract tests
- event evolution tests
- provider reconciliation tests
- API integration tests only for boundary behavior

That reduces the current risk of relying too much on broad integration coverage for what should be narrower seam-level guarantees.

## Examples and rationale from mature references

### Martin Fowler - layering and module seams

Fowler's layering guidance matters here for one reason: modular seams improve substitutability and testability. Once responsibilities are narrower, changes become easier to localize and verify.

### Temporal

Temporal's operational model is explicit about start, state transitions, worker behavior, and durable execution semantics. DVT does not need to copy Temporal's implementation, but it should follow the same discipline: orchestration-critical seams should be explicit, durable, and versioned.

## Acceptance criteria

- `IRunStateStore` responsibilities are split into narrower ports
- `StartRunCoordinator` exists as an explicit application service
- `EventEnvelope.payloadVersion` is implemented and tested
- `ProviderRefUpdated` exists as a formal event
- integration tests become thinner because seam-level tests absorb more of the burden

---

# 3. Web operator surface (`apps/web`)

## Why this is still a top-3 gap

The previous version was directionally correct but over-stated one part.

The right statement is:

> the repo contains frontend code and even test files, but `apps/web` still has no `test` script, the workspace matrix marks its test lane as `no`, and the system status document still says automated test coverage is absent.

That is enough to make web a top-3 production blocker.

## Repo evidence

The generated workspace matrix says:

- `@dvt/web` has **138 source files**
- `@dvt/web` has **9 test files**
- `build = yes`
- `test = no`
- `typecheck = yes`

The web workspace package file defines:

- `build`
- `dev`
- `typecheck`

but no `test` script.

The root package also contains:

- `type-check:apps`
- `build:apps`

but no dedicated app-level test lane that includes `@dvt/web`.

The system status page still classifies web UI as partial and says automated coverage is absent.

## Why this is a production problem

DVT's frontend is not just presentation chrome. It is becoming the operator surface for:

- reading run state,
- drilling into events,
- taking action,
- understanding failures,
- deciding what to do next.

A partially verified operator console is dangerous for two reasons:

1. it can mislead the user about system truth,
2. it slows down change because every UI change becomes higher risk.

## The architectural decision that appears to have been taken

The repo appears to have prioritized:

- shell and routing
- dependency assembly
- product exploration
- front-end surface growth

before front-end testing and operator-state rigor.

That is a common and understandable early decision.

## Why it made sense earlier

It accelerated:

- demoability
- design exploration
- fast product iteration

## Why it is no longer enough

The more this UI becomes operationally meaningful, the less acceptable it is for it to remain outside a formal test lane.

This is not a request for prettier screens.  
It is a request to treat the UI as a **production control surface**.

## Trade-offs of the current posture

### What the repo gained

- visible product surface
- faster early feedback
- more room for UX iteration

### What the repo deferred

- contract confidence
- regression confidence
- explicit state behavior
- isolated frontend seam testing

### Why that is now risky

Because an operator-facing UI that cannot be verified properly becomes one more source of production ambiguity.

## Deep improvement proposal

### A. Treat web as an operator product, not only a UI package

The frontend should model operator concerns explicitly:

- list state
- detail state
- event stream state
- permission state
- action state
- retry state
- stale data state

### B. Add an explicit frontend adapter boundary

Recommended package-level structure:

```md
apps/web/src/
app/
pages/
features/
adapters/api/
models/view/
models/transport/
state/
test/
```

The key point is separation:

- transport DTOs stay in `models/transport`
- view models stay in `models/view`
- API client logic stays in `adapters/api`

This prevents component logic from depending directly on transport shapes.

### C. Use a state matrix, not only page tests

For each critical surface, define and test:

```md
loading
empty
success
stale
unauthorized
forbidden
transient failure
retrying
terminal failure
```

This is where many internal tools stay immature: they test routes, but not operator states.

### D. Add three test layers

#### 1. Component tests

For focused rendering and interaction logic.

#### 2. Adapter/contract tests

For API client mapping and error normalization.

#### 3. Thin end-to-end smoke tests

Only for critical journeys:

- open runs list
- open run detail
- inspect events
- send signal
- handle auth or server failure

### E. Add action semantics to the UI

Operator actions need explicit behavior:

- optimistic vs pessimistic update
- duplicate click handling
- retry display
- disabled states
- stale refresh rules

### F. Add frontend telemetry

At minimum:

- route load failure
- API adapter failure
- action failure
- stale-state activation
- fallback rendering

## Examples and rationale from mature references

### Backstage

Backstage is useful here because it shows that mature frontend systems provide dedicated testing utilities to verify components and extensions in isolation. The important lesson is not the exact toolchain, but the expectation that a frontend boundary should be testable on purpose, not only by ad hoc browser checking.

### Martin Fowler - Presentation Domain Data Layering

Fowler's relevant lesson is that presentation should depend on domain/application representations, and that seams improve testability. He also points out that UI code is tricky to test, which is exactly why logic should be moved out of components wherever possible.

## Acceptance criteria

- `apps/web` gains a `test` script
- CI runs frontend tests
- critical operator journeys have smoke coverage
- UI logic depends on view models and API adapters, not raw transport payloads
- operator state matrix is implemented for core run surfaces

---

# Cross-cutting enabler: observability and trusted control signals

This is still important. It is simply not the best top-3 ranking category on its own.

## Why it still matters

The current status page still marks observability as partial because the OTel binding exists but production validation is incomplete.

That means the roadmap above should be backed by an enabling stream that gives runtime truth to:

- planner admission,
- run orchestration seams,
- operator UI behavior.

## Required minimum enabling work

### O1. Correlation model

Use one correlation model across:

- API request
- plan admission
- run creation
- event append
- projector update
- outbox delivery
- lineage emission
- UI fetch

### O2. Capability dashboards

Prefer capability dashboards over package dashboards:

- Start Run Admission
- Plan Validation / Plan Admission
- Projection Freshness
- Outbox Health
- Lineage Delivery
- UI Action Failures

### O3. Health semantics

Separate liveness from readiness.  
If a component is alive but not safe to serve or process, readiness should show that.

### O4. Release drills

Before calling the system production-ready, run drills for:

- plan invalidation
- provider reference reconciliation
- event version mismatch
- projector lag
- UI stale-state fallback
- outbox lag and replay

---

# Roadmap

## Delivery principle

Do not treat the three gaps as independent.  
They are coupled.

- planner lifecycle gives admission truth
- runtime seam extraction makes admission and replay safer
- web hardening makes that truth visible and operable
- observability makes all three diagnosable

## 16-week roadmap

### Weeks 1-2 - Decision closure and thin ADRs

#### Deliverables

- ADR for `PlanRecord` and `PlanStore`
- ADR for lifecycle states and admissibility
- ADR for `IRunStateStore` split
- ADR for `StartRunCoordinator`
- ADR for `EventEnvelope.payloadVersion`
- web test-lane decision and tool choice

#### Exit

- no more ambiguity on core shapes and ownership

---

### Weeks 3-6 - Structural implementation

#### Deliverables

- create `PlanStore` schema and interface
- persist plan drafts and validation states
- split `IRunStateStore` into narrower ports
- scaffold `StartRunCoordinator`
- add `payloadVersion` to event envelope
- add `apps/web` test script and baseline test harness
- create API adapter layer in web

#### Exit

- the repo now contains the right structural boundaries

---

### Weeks 7-10 - Runtime enforcement

#### Deliverables

- engine admits only persisted executable plans
- coordinator orchestrates plan check, intent, bootstrap, provider start
- `ProviderRefUpdated` event implemented
- compatibility tests for event versioning
- frontend view-model layer added
- frontend state matrix implemented for run list and run detail
- capability telemetry baseline added

#### Exit

- runtime behavior starts following the intended model, not only the docs

---

### Weeks 11-14 - Recovery and operator closure

#### Deliverables

- recovery policy for one supported failure class
- lineage between original plan and recovery plan
- planner-to-engine patching removed or isolated
- UI smoke journeys for critical operator flows
- readiness/liveness semantics verified
- capability dashboards operational

#### Exit

- the system becomes explainable under failure, not only under the happy path

---

### Weeks 15-16 - Production gate

#### Deliverables

- release checklist for the three workstreams
- drill results documented
- residual debt explicitly labeled as release-acceptable or release-blocking
- canary rollout criteria defined

#### Exit

- a production decision can be made against evidence, not optimism

---

# Release gate

The system should not be called production-ready until all of the following are true.

## Planner lifecycle gate

- persisted plan lifecycle exists
- admissibility is explicit
- recovery path exists for at least one class of failure

## Runtime seam gate

- coordinator extraction complete
- store split complete enough to make ownership clear
- event payload versioning implemented
- provider reference update is formalized

## Web gate

- frontend test lane exists
- core operator journeys pass
- state matrix exists for critical flows

## Enabling gate

- OTel validation is good enough for operator use
- correlation is end-to-end
- drill evidence exists

---

# Final recommendation

The corrected conclusion is this:

1. **Planner lifecycle closure** is the most important production blocker.
2. **Runtime admission and state/event seams** are the second most important blocker.
3. **The web operator surface** is the third most important blocker.
4. **Observability remains essential**, but it should be treated as the enabling stream that supports the three primary blockers, not as the main ranking category by itself.

This is a more defensible plan because it is anchored to:

- the repo's own named open slices,
- the repo's own current-status documents,
- explicit scoring criteria,
- and concrete runtime consequences.

It also avoids the previous mistake of staying too generic.

---

# Quick reference links

## Repository

- <https://github.com/dunay2/dvt>
- [docs/architecture/system-delivery-status.md](../../architecture/system-delivery-status.md)
- [docs/planning/status/generated-code-state.md](../status/generated-code-state.md)
- [docs/planning/status/planner-current-state-assessment.md](../status/planner-current-state-assessment.md)
- [apps/web/package.json](../../../apps/web/package.json)
- [package.json](../../../package.json)

## External

- <https://martinfowler.com/eaaDev/EventSourcing.html>
- <https://martinfowler.com/bliki/PresentationDomainDataLayering.html>
- <https://docs.temporal.io/>
- <https://backstage.io/docs/frontend-system/building-plugins/testing/>
- <https://opentelemetry.io/docs/collector/>
