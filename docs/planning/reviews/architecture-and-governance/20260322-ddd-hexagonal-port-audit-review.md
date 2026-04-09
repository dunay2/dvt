---
title: 20260322 DDD and Hexagonal Port Audit
status: Approved
owner: Architecture
last_reviewed: 2026-03-22
planning_type: review
---

# 20260322 DDD and Hexagonal Port Audit

## Scope

Full-repository structural audit focused on DDD and Hexagonal Architecture (Ports and
Adapters) compliance. This review extends the findings from the 2026-03-14 domain
cohesion review to cover the full package graph following Phase 1 gap closure (G1–G10).

Files examined:

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/core/SnapshotProjector.ts`
- `packages/@dvt/engine/src/security/RunAccessPolicy.ts`
- `packages/@dvt/engine/src/ports/IRunStateStore.ts`
- `packages/@dvt/engine/src/application/providerSelection.ts`
- `packages/@dvt/contracts/src/index.ts`
- `packages/@dvt/contracts/src/contracts/engine/IRunStateStore.v1.ts`
- `packages/@dvt/run-domain/src/applyRunEvent.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/state-store/src/lifecycle/DeliveryBufferPurger.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `apps/api/src/application/services/engineStartRunUseCase.ts`
- `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`

Reference ADRs: ADR-0009, ADR-0018, ADR-0028, ADR-0031, ADR-0034.

---

## Overall Verdict

The repository has a strong hexagonal skeleton: ports are declared in contracts,
adapters implement them, domain logic is isolated in `@dvt/run-domain` and
`@dvt/planner/domain`, and composition roots wire everything without peer-domain
coupling. Phase 1 delivered this correctly.

What remains are **five structural gaps** that violate specific SOLID or DDD
principles. Each is actionable independently; none requires a big-bang rewrite.

---

## Findings

### F1 — RunAccessPolicy is a concrete class injected without a port (DIP violation)

**Principle violated**: Dependency Inversion Principle (SOLID-D).

**Evidence**

`WorkflowEngine` receives `RunAccessPolicy` as a concrete constructor parameter:

```typescript
// packages/@dvt/engine/src/core/WorkflowEngine.ts
constructor(
  private readonly stateStore: IRunStateStore,
  private readonly providerAdapter: IProviderAdapter,
  private readonly policy: RunAccessPolicy,          // concrete class
  private readonly observability: IObservability,
  ...
)
```

`RunAccessPolicy` implements rate-limiting, tenant isolation, and plan-ref
validation. It has no declared interface. Tests must construct a real
`RunAccessPolicy` instance or reach into the class internals to simulate
authorization failures.

**DDD classification**: Authorization policy is a Domain Policy (Evans §14).
Domain policies belong in the domain layer and must be expressed as ports when
the execution environment can substitute them (e.g., test, multi-tenant
override, permission-scope variant).

**Impact**

- Engine cannot be tested in isolation with an alternative authorization model.
- Rate-limit implementation (infrastructure: `TokenBucketRateLimiter`) is
  co-located with domain authorization checks, mixing domain and infrastructure
  concerns inside a single class.
- Adding a new authorization model (e.g., RBAC, attribute-based) requires
  changing `WorkflowEngine` constructor, which violates OCP.

**Proposed design**: Extract `IAuthorizationPolicy` as a port. See ADR-0039, §2.1.

---

### F2 — WorkflowEngine violates SRP: it is use case, domain service, and orchestrator simultaneously

**Principle violated**: Single Responsibility Principle (SOLID-S).

**Evidence**

`WorkflowEngine.startRun()` at a glance performs:

1. Pre-flight checks (rate limit, tenant access, plan-ref validation)
2. Intent log persistence (`IStartRunIntentStore.save`)
3. Idempotency key computation (`generateEventId`)
4. Provider adapter delegation (`IProviderAdapter.startRun`)
5. Provider run-id reconciliation (bootstrap `providerExecutionRunId`)
6. Event emission (`RunQueued`, `RunStarted`, or `RunFailed`)
7. Compensation on partial failure (rollback intent, emit `RunFailed`)
8. Signal proxying (`signal()`)
9. Status projection (`getRunStatus()`)

That is at minimum three distinct responsibilities:

| Responsibility                                    | DDD classification                 | SRP unit                     |
| ------------------------------------------------- | ---------------------------------- | ---------------------------- |
| Pre-flight authorization + rate-limit             | Domain Policy application          | `StartRunPolicy`             |
| Intent log + bootstrap + compensation             | Application use case orchestration | `StartRunApplicationService` |
| Run lifecycle state machine + provider delegation | Core domain service                | `WorkflowEngine` (thin)      |

This matches the S03 Phase 2 slice. This finding documents the structural rationale.

**Impact**

- Any change to intent log semantics, authorization rules, or compensation
  behavior touches the same class.
- The compensation path (`emit RunFailed on bootstrap failure`) is buried inside
  the orchestration method, making it invisible to callers and hard to test
  without end-to-end setup.
- `WorkflowEngine` grows in proportion to every new execution-adjacent concern.

**Proposed design**: Extract `StartRunApplicationService` as the use case.
`WorkflowEngine` becomes a thin domain service: it owns lifecycle invariants and
provider delegation only. Authorization and orchestration move up.
See ADR-0039, §2.2.

---

### F3 — IRunStateStore violates ISP: single interface aggregates write, read, and maintenance roles

**Principle violated**: Interface Segregation Principle (SOLID-I).

**Evidence**

`IRunStateStore.v1.ts` exposes 20+ methods across three semantic groups:

| Group           | Methods                                                                      | Consumers                                    |
| --------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| Write (command) | `bootstrapRunTx`, `appendEvent`, `updateRunMetadata`, `saveProviderRef`      | engine write path                            |
| Read (query)    | `getRunEvents`, `getRunSnapshot`, `getRunsByTenant`, `listStaleSnapshotRuns` | engine query path, projector                 |
| Maintenance     | `rebuildSnapshot`, `markDelivered`, `countPendingByRunId`                    | projector-worker, outbox-worker, admin tools |

The engine read path (`getRunStatus`) imports `IRunStateStore` for query methods
while the write path imports it for command methods. The projector-worker imports
it for maintenance methods. Every adapter must implement the full interface even
when only a sub-role is needed.

**DDD classification**: This is a CQRS-adjacent concern. Commanding and querying
a `Run` aggregate are distinct responsibilities with different consistency
requirements.

**Impact**

- `PostgresStateStoreAdapter` implements all 20+ methods in one class, mixing
  `run_events`, `run_metadata`, `run_snapshots`, and `outbox` in one surface.
- Test doubles must stub 20+ methods even for unit tests that exercise only 2.
- Adding a read-only replica adapter requires implementing the full write contract.

**Proposed design**: Split into `IRunWriteStore`, `IRunReadStore`, and
`IRunMaintenanceStore`. Adapters implement only the sub-interfaces they cover.
This is S02. See ADR-0039, §2.3.

---

### F4 — WorkflowSnapshot role is ambiguous: aggregate projection or CQRS read model

**Principle violated**: DDD aggregate root clarity; CQRS separation.

**Evidence**

`WorkflowSnapshot` is produced by `applyRunEvent` in `@dvt/run-domain`:

```typescript
export function applyRunEvent(
  snapshot: WorkflowSnapshot,
  event: RunEventPayload
): WorkflowSnapshot { ... }
```

It is also used as the return type of `IRunStateStore.getRunSnapshot()` and as
the input to `SnapshotProjector.snapshotToStatus()`. The same shape is used for:

- in-memory event replay (domain computation)
- materialized read-model persistence (`run_snapshots` table)
- API status response construction

`WorkflowSnapshot` is therefore simultaneously the domain aggregate state and a
persisted read DTO. These two roles have different evolution rules: domain state
must satisfy invariants; persisted DTOs must satisfy schema stability.

**Impact**

- Changing a domain invariant (e.g., adding a new terminal status) forces a
  migration on the `run_snapshots` table, coupling domain evolution to storage
  evolution.
- There is no documented answer to "is `WorkflowSnapshot` the write-side
  aggregate state or the read-side DTO?" — reviewers and adapters fill in
  different assumptions.

**Proposed design**: Formally declare `WorkflowSnapshot` as a CQRS **read model**
(materialized projection). The write-side aggregate state is the ordered sequence
of `RunEventPayload` entries. `applyRunEvent` reduces that sequence into the read
model on demand; the stored snapshot is a cache of that reduction, not the source
of truth. This requires no code change — only an explicit documented decision and
an invariant that read-model shape changes must version the snapshot.
See ADR-0039, §2.4.

---

### F5 — Provider selection and env-var resolution live inside the domain boundary

**Principle violated**: Hexagonal Architecture — application-layer composition
responsibility; DIP.

**Evidence**

`packages/@dvt/engine/src/application/providerSelection.ts` resolves
`process.env.ENGINE_PROVIDER` and builds the adapter registry. This file lives
inside `@dvt/engine` and is imported by the engine at construction time.

The engine package should not read environment variables. Environment resolution
belongs at the composition root (`apps/api`, not `@dvt/engine`).

**Impact**

- Unit tests of `WorkflowEngine` cannot fully isolate from the environment
  without mocking `process.env`.
- Adding a second composition root (e.g., a test harness with a deterministic
  provider) requires overriding env vars instead of injecting a pre-built adapter.
- The engine advertises a `buildAdapterRegistry(env)` function in its exported
  surface — infrastructure coupling leaks into the public domain API.

**Proposed design**: Move `providerSelection.ts` to `apps/api/src/bootstrap/` or
a shared composition helper in `@dvt/adapter-temporal`. The engine constructor
accepts `IProviderAdapter` only; it never reads env. This is a composition root
concern.

---

## SOLID / DDD Violation Summary

| ID  | Principle                              | Location                                  | Severity |
| --- | -------------------------------------- | ----------------------------------------- | -------- |
| F1  | DIP — no port for authorization        | `engine/security/RunAccessPolicy.ts`      | High     |
| F2  | SRP — engine owns use case + domain    | `engine/core/WorkflowEngine.ts`           | High     |
| F3  | ISP — monolithic state store interface | `contracts/IRunStateStore.v1.ts`          | Medium   |
| F4  | DDD — aggregate/read-model ambiguity   | `run-domain/applyRunEvent.ts` (usage)     | Medium   |
| F5  | DIP — env resolution inside domain     | `engine/application/providerSelection.ts` | Low      |

---

## What Is Already Correct

- `IProviderAdapter`, `IOutboxStorage`, `ILineageSink`, `IStartRunIntentStore` are
  proper ports — declared in contracts, implemented in adapters, injected by
  composition roots.
- `@dvt/run-domain.applyRunEvent` is a pure function with no I/O — canonical
  domain kernel.
- `@dvt/planner/domain` is properly isolated from infrastructure (graph,
  topology, policies are pure).
- ADR-0034 correctly models bounded context rules; the package graph is acyclic
  across peer domains.
- Adapter-to-port direction is respected: `@dvt/adapter-postgres` imports
  contracts but `@dvt/engine` never imports `@dvt/adapter-postgres`.
- Tenant isolation is enforced at the SQL adapter boundary (ADR-0031), not in
  domain services — correct placement.
- `SnapshotProjector` wraps `applyRunEvent` as the single entry point for
  in-memory projection — prevents duplicate projection logic.

---

## Recommended Phase 2 Execution Order

| Priority | Finding                            | Phase 2 slice            | Rationale                                                                |
| -------- | ---------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| 1        | F3 (ISP — IRunStateStore)          | S02                      | Unblocks S04; narrowest interface reduces test surface for all adapters  |
| 2        | F2 (SRP — WorkflowEngine)          | S03                      | After S02 so the extracted service can depend on narrow write-store port |
| 3        | F1 (DIP — RunAccessPolicy)         | — (new slice candidate)  | Can start independently; small, isolated, high test-quality gain         |
| 4        | F4 (DDD — snapshot classification) | ADR-0039 decision        | No code change — documented invariant + version rule                     |
| 5        | F5 (DIP — env resolution)          | Composition root cleanup | Lowest risk, defer until a new composition root is added                 |

ADR-0039 captures the concrete decisions for F1, F3, and F4.

---

## Relationship to Prior Reviews

- **2026-03-14 Domain Cohesion Review**: identified the aggregate root fragmentation
  (no single `Run` owner) and the `SnapshotProjector`/activities dual-write path.
  F2 above is the structural root cause of that finding. S03 addresses it.
- **ADR-0034**: established the bounded context model and the port-for-infrastructure
  rule (§4.2). F1 and F5 are violations of that rule in the existing code.
- **ADR-0009**: outbox worker sharding. Not directly implicated in this review.

---

## Evidence Links

- [ADR-0034 — Bounded Context Boundaries](../../../adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0039 — Hexagonal Port Hardening](../../../adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md)
- [Phase 2 Roadmap](../../archive/proposals/phase2-arch-debt-roadmap-20260315.md)
- [2026-03-14 Domain Cohesion Review](./20260314-domain-cohesion-review.md)
