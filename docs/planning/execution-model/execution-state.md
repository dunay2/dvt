---
title: Execution State
status: Draft
owner: docs
last_reviewed: 2026-03-07
planning_type: status
---

# Execution State Assessment

This note summarizes how closely the current engine implementation matches the execution spec. The executable core is strong: engine, state, Temporal, and observability sit in the 80-95% range, while the full spec lands around 62-65% once productization layers are included.

## Completed And Aligned

| Spec section | Component               | State    | Notes                                                                                      |
| ------------ | ----------------------- | -------- | ------------------------------------------------------------------------------------------ |
| Section 2    | Architectural stance    | Complete | Hexagonal, DDD, CQRS, and event-sourced boundaries are implemented.                        |
| Section 4    | Core principles         | Complete | The key execution invariants are present in the runtime.                                   |
| Sections 5-6 | Hexagonal and C4 model  | Complete | The main ports and adapters exist.                                                         |
| Section 7    | Domain model            | Complete | `ExecutionPlan`, `RunMetadata`, `RunEvent`, and value objects are implemented.             |
| Section 8.1  | `IWorkflowEngine`       | Complete | `startRun`, `cancelRun`, `getRunStatus`, `enrichRunStatus`, and `signal` exist.            |
| Section 8.2  | `IRunStateStore`        | Complete | `bootstrapRunTx`, `appendAndEnqueueTx`, `listEvents`, `listRuns`, and `getSnapshot` exist. |
| Section 8.3  | `IProviderAdapter`      | Complete | Adapter lifecycle methods exist; `lookupRunRef` is an ADR-0030 extension.                  |
| Section 9    | `ExecutionPlan` shape   | Complete | v1.1.0 adds `contractVersion`, `plannerVersion`, and `plannerGitSha`.                      |
| Section 10   | Run identity            | Complete | `tenantId`, `projectId`, `environmentId`, `runId`, and `logicalAttemptId` are implemented. |
| Section 11   | Start-run lifecycle     | Complete | Intent persistence, adapter dispatch, bootstrap, and resolution are aligned.               |
| Section 12   | Run event model         | Complete | Eight run events, four step events, and the envelope are implemented.                      |
| Section 13   | State machine           | Complete | `QUEUED -> RUNNING -> PAUSED/CANCEL_REQUESTED -> terminal` is implemented.                 |
| Section 14   | Ordering                | Complete | `runSeq` is monotonic and authoritative.                                                   |
| Section 15   | Idempotency             | Complete | `runId` and `idempotencyKey` boundaries are implemented.                                   |
| Section 16   | Retry semantics         | Complete | Business retry and Temporal retry are separated through `logicalAttemptId`.                |
| Section 17   | Status read model       | Complete | `getRunStatus` stays local; `enrichRunStatus` is opt-in.                                   |
| Section 18   | Snapshot model          | Complete | `SnapshotProjector` and replay fallback are implemented.                                   |
| Section 19   | Outbox model            | Complete | Atomic append, DLQ, rate limiting, and `OutboxWorker` exist.                               |
| Section 20   | `IAuthorizer` contract  | Partial  | The interface exists, but only `AllowAllAuthorizer` is implemented.                        |
| Section 22   | Testing, Sprint 1 scope | Strong   | Engine, state store, idempotency, intent, and outbox coverage are in place.                |

## Partial Coverage

| Spec section | Component        | Status | Gap                                                                            |
| ------------ | ---------------- | ------ | ------------------------------------------------------------------------------ |
| Section 20   | Production authz | 20%    | Only `AllowAllAuthorizer` exists; no real OIDC or JWT tenancy enforcement.     |
| Section 22   | Adapter tests    | 60%    | Smoke tests exist, but failure injection and crash recovery are still missing. |
| Section 23   | dbt runner       | 40%    | `stepActivities.ts` exists, but result and failure mapping remain incomplete.  |
| Section 23   | Audit hook       | 30%    | Placeholder exists, but no formal audit envelope exists yet.                   |

## Not Implemented

| Spec section      | Component                                     | Estimated effort |
| ----------------- | --------------------------------------------- | ---------------- |
| Sections 3 and 25 | `IArtifactStore` contract plus implementation | 2-3 weeks        |
| Section 20        | Production authorizer                         | 2-3 weeks        |
| Section 21        | Plugin runtime sandbox and capability model   | 4-6 weeks        |
| Section 23        | SSE or WebSocket streaming                    | 2 weeks          |
| Section 23        | Replay certification suite                    | 1 week           |
| Section 23        | Snapshot rebuild tooling                      | 1 week           |
| Section 23        | Parser to graph pipeline and runtime overlay  | 4-6 weeks        |
| Section 24        | Recommended new ADR set                       | 1-2 weeks        |
| CLI               | Full command surface                          | 1-2 weeks        |
| Adapter           | Conductor adapter                             | 6-8 weeks        |

## Completion By Layer

| Layer                      | Completion | Notes                                                                |
| -------------------------- | ---------- | -------------------------------------------------------------------- |
| Engine core                | 95%        | Contracts, lifecycle, and event model are close to production-ready. |
| State store                | 85%        | Snapshot rebuild tooling is still missing.                           |
| Temporal adapter           | 75%        | Step result mapping remains incomplete.                              |
| Observability              | 80%        | Real OTel exists; dashboards and queue metrics are still missing.    |
| Idempotency and ordering   | 95%        | Strong alignment with the spec.                                      |
| Security and authz         | 20%        | Only the permissive authorizer exists.                               |
| Outbox                     | 80%        | Delivery path is solid; lag metrics are still missing.               |
| Artifact store             | 5%         | Types exist, but no real storage contract or implementation exists.  |
| Testing                    | 85%        | Replay and determinism certification are still pending.              |
| SSE or WebSocket streaming | 0%         | Not started.                                                         |
| Plugin runtime             | 0%         | Not started.                                                         |
| CLI                        | 10%        | Only a minimal stub exists.                                          |
| Conductor adapter          | 5%         | Only a stub exists.                                                  |

## Production Path

### High Priority

| Item                                            | Effort    | Spec sprint |
| ----------------------------------------------- | --------- | ----------- |
| Real `IAuthorizer` with OIDC or JWT enforcement | 2-3 weeks | Sprint 3    |
| `IArtifactStore` plus a basic implementation    | 2-3 weeks | Sprint 2    |
| Complete dbt step result and failure mapping    | 1-2 weeks | Sprint 2    |
| Tenant isolation end-to-end tests               | 1 week    | Sprint 3    |

### Medium Priority

| Item                                | Effort    | Spec sprint |
| ----------------------------------- | --------- | ----------- |
| SSE or WebSocket status streaming   | 2 weeks   | Sprint 4    |
| Replay plus failure injection tests | 1 week    | Sprint 4    |
| Snapshot rebuild tooling            | 1 week    | Sprint 4    |
| Recommended ADR follow-up set       | 1-2 weeks | Ongoing     |

### Lower Priority

| Item                     | Effort    | Spec sprint |
| ------------------------ | --------- | ----------- |
| Plugin runtime sandbox   | 4-6 weeks | Sprint 4    |
| Conductor adapter        | 6-8 weeks | Post-MVP    |
| Parser to graph pipeline | 4-6 weeks | Sprint 2-3  |
| Full CLI surface         | 1-2 weeks | Backlog     |

## Conclusion

The spec and the code are tightly aligned in the engine core. The execution principles, event model, state machine, idempotency rules, retry semantics, and status enrichment split are all implemented and tested.

The two material deviations are straightforward:

- AuthZ requires a real production implementation before release.
- `IArtifactStore` is referenced by the architecture, but the contract and storage backend do not exist yet.

The critical path to production is clear: real authz, then artifact storage, then dbt step mapping, then tenant-isolation end-to-end tests. That is about 6-9 weeks of focused core work before streaming and plugin runtime become the next priority.
