---
title: 20260322 DVT Code Grounded Corrective Task List Review
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-22
planning_type: review
---

# DVT+ Corrective Task List (Code Grounded)

This review integrates a code-grounded corrective task list with explicit
dependencies and execution order.

## Scope

- runtime correctness defects
- architecture debt with operational impact
- ADR-0039 accepted items still pending implementation
- observability and operational hardening

## Block A: Critical correctness

### A1: `simulateError` accepted in production plan path

- Location: `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- Current behavior: `ALLOWED_STEP_FIELDS` accepts `simulateError`, and
  `applySimulateErrorIfPresent` can force transient/permanent failures.
- Risk: injected plan content can force step failures in production.
- Corrective action:
  1. prevent simulation in production via runtime guard, or
  2. remove `simulateError` from accepted runtime fields and keep it test-only.

### A2: deterministic intent invariant violation (`INV-INTENT-011`)

- Location: `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- Current behavior: `_createStartRunIntent` uses random `eventId()` for
  `intentId`.
- Contract: `IStartRunIntentStore.v1.ts` requires deterministic `(tenantId, runId)` derivation.
- Risk: crash-recovery path can leave orphan pending intents and lose idempotent
  re-entry semantics.
- Corrective action: add deterministic `intentId(tenantId, runId)` builder and
  use it in start intent creation.

### A3: runtime `planVersion` enforcement missing (`assertSupportedPlanVersion` dead code)

- Locations:
  - `packages/@dvt/engine/src/contracts/PlanVersionPolicy.ts`
  - `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- Current behavior: only `schemaVersion` is validated in preconditions.
- Risk: unsupported `planVersion` can pass runtime start path.
- Corrective action: call `assertSupportedPlanVersion(planRef.planVersion)`
  from `validateStartRunPreconditions`.

### A4: `PlanAssembler` hardcodes `'2.3'`

- Location: `packages/@dvt/planner/src/domain/PlanAssembler.ts`
- Current behavior: inline literal instead of registry constant.
- Risk: split source of truth with runtime policy.
- Corrective action: use `CURRENT_EXECUTION_PLAN_VERSION` from
  contracts registry and share between planner/runtime enforcement.

### A5: `markResolved` error swallowed without signal

- Location: `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- Current behavior: `markResolved(...).catch(() => {})`.
- Risk: unresolved dispatched intents rely on eventual reconciler cleanup with
  no immediate observability.
- Corrective action: replace silent catch with warning/metric emission.

### A6: `IOutboxStorage` signature drift from concrete implementation

- Locations:
  - contract: `packages/@dvt/contracts/src/contracts/engine/IOutboxStorage.v1.ts`
  - implementation: `packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts`
- Current behavior: concrete API requires tenant scope in dead-letter methods
  but contract does not carry equivalent parameters.
- Risk: interface consumers cannot safely express tenant-scoped calls.
- Corrective action: align contract signature with concrete tenant-scoped
  behavior.

## Block B: Architecture debt with operational impact

### B1: lineage worker coupled to adapter internals

- Location: `apps/lineage-worker/src/server.ts`
- Current behavior: accesses `stateStore.lineageOutboxStore`.
- Risk: worker depends on concrete adapter internals, not an explicit port.
- Corrective action: construct lineage outbox store as explicit dependency in
  composition root and remove public internal access pattern.

### B2: lineage worker uses noop compiled code resolver

- Location: `apps/lineage-worker/src/server.ts`
- Current behavior: resolver always throws; mapper fail-open omits SQL facets.
- Risk: compiled code reference feature produces no production lineage facet.
- Corrective action: wire real resolver (`S3` in prod, filesystem in dev).

### B3: `IRunStateStore` remains monolithic with multiple definitions

- Locations:
  - canonical contracts interface
  - engine-local divergent interface
  - deprecated engine state re-export
- Risk: type drift and unclear responsibility boundaries.
- Corrective action:
  1. remove deprecated interface surface,
  2. align event types with canonical contracts,
  3. split write/read/maintenance roles with transitional compatibility.

### B4: token bucket rate limiter is process-local

- Location: `packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts`
- Current behavior: in-memory map per process.
- Risk: tenant throttle scales with number of API instances.
- Corrective action: keep interface, replace implementation with distributed
  backing (for example Redis adapter) and move infra concern out of engine core.

### B5: lineage outbox has no exponential backoff schedule

- Location: `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts`
- Current behavior: retries at poll cadence, no `next_attempt_at`.
- Risk: rapid failure exhaustion and premature dead-lettering.
- Corrective action: add scheduled retry column and filter semantics.

## Block C: ADR-0039 backlog

### C1: F2 implementation (`StartRunApplicationService` extraction)

- Depends on: B3
- Goal: move start-run orchestration out of `WorkflowEngine`.

### C2: F1 implementation (`IAuthorizationPolicy` port extraction)

- Depends on: C1
- Goal: policy as port in contracts, injected at application layer.

### C3: F5 implementation (provider selection in composition root)

- Independent
- Goal: remove/relocate engine-side provider selection helper from domain package.

## Block D: Observability and operations

### D1: intent reconciler startup degradation is not surfaced in health

- Location: `apps/api/src/server.ts`
- Current behavior: startup errors are logged; service remains up with no health
  degradation signal.
- Corrective action: expose reconciler status as `degraded` in health endpoint.

### D2: outbox claim timeout hardcoded

- Location: `packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts`
- Current behavior: fixed 5-minute claim timeout in SQL.
- Corrective action: make claim timeout configurable with safe default.

### D3: temporal not-found detection is type fragile

- Location: `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- Current behavior: strict numeric code comparison only.
- Risk: SDK value-shape differences can break not-found handling.
- Corrective action: normalize/coerce code before comparison.

## Dependency graph

```text
A4 -> A3
A6 -> B3 -> C1 -> C2
B1 is an independent prerequisite for clean B3 decoupling
A1, A2, A5, B2, B4, B5, C3, D1, D2, D3 are independent
```

## Recommended execution order

1. A1
2. A2
3. A4 then A3
4. A6
5. B1
6. B3
7. B2
8. B5
9. A5, B4, C3, D1, D2, D3
10. C1 then C2
