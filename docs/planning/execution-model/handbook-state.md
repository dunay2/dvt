---
title: Handbook State
status: Draft
owner: docs
last_reviewed: 2026-03-07
planning_type: status
---

# Handbook Alignment Report

This report compares the current codebase with the corrected architecture handbook. The handbook now matches the code far better than earlier drafts, but a few platform and productization layers are still incomplete.

Overall handbook alignment is about 58%. The executable core remains much stronger than the full platform surface: engine, Temporal, Postgres, and OTel sit in the 80-95% range, while artifacts, production authz, API, UI, and plugin layers still carry most of the gap.

## Completed And Aligned

| Section    | Component                 | Code state | Notes                                                                                       |
| ---------- | ------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| Section 2  | Hexagonal architecture    | Complete   | `WorkflowEngine`, `IRunStateStore`, and `IProviderAdapter` match the handbook boundary.     |
| Section 3  | Execution bounded context | Complete   | Workflow lifecycle and engine core are aligned.                                             |
| Section 3  | State bounded context     | Complete   | Postgres and in-memory state stores match the documented model.                             |
| Section 3  | Aggregate root (`Run`)    | Complete   | Event log, `RunMetadata`, and snapshot handling are aligned.                                |
| Section 3  | Value objects             | Complete   | `PlanRef`, `EngineRunRef`, `RunContext`, `SignalRequest`, and `RunStatusSnapshot` exist.    |
| Section 5  | Component diagram         | Complete   | The documented ports are implemented in code.                                               |
| Section 6  | Execution lifecycle       | Complete   | `startRun(planRef, context)` plus intent -> adapter -> bootstrap flow is aligned.           |
| Section 7  | State model               | Complete   | Twelve run events, four step events, and the envelope are aligned.                          |
| Section 7  | State machine             | Complete   | `QUEUED -> RUNNING -> PAUSED/CANCEL_REQUESTED -> terminal` exists in code.                  |
| Section 8  | Observability             | Complete   | `OtelObservability` exists, with `NoopObservability` available in test paths.               |
| Section 10 | Storage tenant isolation  | Complete   | Postgres is tenant-scoped under ADR-0031.                                                   |
| Section 11 | Domain testing            | Strong     | Domain test coverage is in place and healthy.                                               |
| Section 12 | Failure handling          | Complete   | Temporal retry, `OutboxWorker`, run cancellation, and ADR-0030 intent reconciliation exist. |
| Section 14 | Sprint 1 roadmap          | Complete   | Engine, state, intent log, and OTel work are aligned with the handbook.                     |
| Section 15 | Key ADR set               | Complete   | ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0030, and ADR-0031 are present.                 |

## Partial Coverage

| Section    | Component                    | Status | Gap                                                                                                |
| ---------- | ---------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Section 3  | Planner bounded context      | 30%    | `IExecutionPlanner.v2` exists, but the planner implementation is still incomplete.                 |
| Section 3  | Platform bounded context     | 60%    | Observability is strong; authz still relies on `AllowAllAuthorizer`.                               |
| Section 6  | dbt runner                   | 40%    | `stepActivities.ts` exists, but result and failure mapping are incomplete.                         |
| Section 8  | Metrics                      | 50%    | Core metrics exist, but `warehouse_cost` and `queue_latency` are missing.                          |
| Section 10 | `IAuthorizer` implementation | 25%    | The interface exists, but there is no real production implementation.                              |
| Section 11 | Adapter testing              | 60%    | Smoke tests exist; failure injection, crash recovery, and duplicate-event retry tests are missing. |
| Section 14 | Sprint 2 roadmap             | 15%    | dbt runner work is partial and `IArtifactStore` does not exist.                                    |
| Section 17 | dbt execution                | 40%    | Execution exists, but the step mapping layer is still incomplete.                                  |
| Section 17 | Multi-tenant isolation       | 50%    | Storage is scoped; real authz is still missing.                                                    |

## Not Implemented

| Section    | Component                            | Notes                                                            |
| ---------- | ------------------------------------ | ---------------------------------------------------------------- |
| Section 3  | Artifacts bounded context            | Only `types/artifacts.ts` exists today.                          |
| Section 3  | UX bounded context                   | Graph and lineage representation remain outside engine scope.    |
| Section 9  | Artifact ingestion pipeline          | Parser -> GraphBuilder -> Planner is not implemented end-to-end. |
| Section 10 | Auth middleware and API layer        | No API tenant-validation layer exists yet.                       |
| Section 11 | API testing                          | There is no API surface to test yet.                             |
| Section 11 | End-to-end testing                   | Not implemented.                                                 |
| Section 11 | Replay and determinism certification | Planned for Sprint 4.                                            |
| Section 13 | Plugin runtime                       | No sandbox or capability model exists yet.                       |
| Section 14 | Sprint 3 roadmap                     | Lineage UI and production authz are still backlog items.         |
| Section 14 | Sprint 4 roadmap                     | Plugin runtime and replay certification remain future work.      |
| Section 17 | Lineage visualization                | Still outside engine scope.                                      |
| Section 17 | Artifact inspection                  | Depends on `IArtifactStore`.                                     |
| Section 17 | Cost tracking metric                 | Depends on Snowflake query history integration.                  |

## Completion By Handbook Area

| Area                                   | Completion                                                | Trend                                                    |
| -------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Section 2, Hexagonal architecture      | 95%                                                       | Stable                                                   |
| Section 3, Execution bounded context   | 95%                                                       | Stable                                                   |
| Section 3, State bounded context       | 85%                                                       | Snapshot rebuild tooling is still missing                |
| Section 3, Planner bounded context     | 30%                                                       | Interface-first, implementation incomplete               |
| Section 3, Artifacts bounded context   | 5%                                                        | Types only                                               |
| Section 3, Platform bounded context    | 60%                                                       | Observability is in place; authz is not                  |
| Section 5, Component diagram           | 85%                                                       | Only the artifact store remains missing                  |
| Section 6, Execution lifecycle         | 80%                                                       | dbt step mapping remains incomplete                      |
| Section 7, State model                 | 95%                                                       | Strong                                                   |
| Section 8, Observability               | 70%                                                       | Cost and queue metrics remain missing                    |
| Section 9, Artifact ingestion pipeline | 5%                                                        | `ExecutionPlan` exists, little else does                 |
| Section 10, Multi-tenant security      | 45%                                                       | Storage is ready; authz is not                           |
| Section 11, Testing                    | 60%                                                       | Domain is strong; adapters, API, and E2E remain partial  |
| Section 12, Failure handling           | 75%                                                       | Formal dbt error mapping remains open                    |
| Section 13, Plugin architecture        | 0%                                                        | Not started                                              |
| Section 14, Roadmap                    | Sprint 1: 100%; Sprint 2: 15%; Sprint 3: 0%; Sprint 4: 0% | Mixed                                                    |
| Section 17, Expected capabilities      | 3 of 7                                                    | Workflow and observability are live; dbt remains partial |

## Production Path

### Blocks Production

| Item                                         | Effort    | Sprint   |
| -------------------------------------------- | --------- | -------- |
| Real `IAuthorizer` with tenant enforcement   | 2-3 weeks | Sprint 3 |
| `IArtifactStore` plus a basic implementation | 2-3 weeks | Sprint 2 |
| Complete dbt step result and failure mapping | 1-2 weeks | Sprint 2 |
| Tenant isolation end-to-end tests            | 1 week    | Sprint 3 |

### Enables Extensibility

| Item                                | Effort    | Sprint     |
| ----------------------------------- | --------- | ---------- |
| SSE or WebSocket status updates     | 2 weeks   | Sprint 4   |
| Replay plus failure injection tests | 1 week    | Sprint 4   |
| Snapshot rebuild tooling            | 1 week    | Sprint 4   |
| API layer plus auth middleware      | 3-4 weeks | Sprint 2-3 |

### Longer-Term Roadmap

| Item                                          | Effort    | Sprint     |
| --------------------------------------------- | --------- | ---------- |
| Artifact ingestion pipeline                   | 4-6 weeks | Sprint 2-3 |
| Plugin runtime sandbox                        | 4-6 weeks | Sprint 4   |
| Lineage UI or graph representation            | 4-6 weeks | Sprint 3   |
| `warehouse_cost` from Snowflake query history | 2-3 weeks | Sprint 3-4 |
| Conductor adapter                             | 6-8 weeks | Post-MVP   |

## Executive Summary

The handbook now reflects the codebase with reasonable fidelity. The earlier conceptual mismatches around aggregate root ownership, `startRun` signature, port naming, and the event model are now corrected.

The strongest areas are the engine core, event sourcing, Temporal integration, Postgres state storage, outbox handling, OTel observability, idempotency, and ADR coverage. Those areas are already close to production-ready within their intended scope.

The production critical path is short and concrete:

- real authz
- artifact storage
- complete dbt step result mapping
- API layer

That is about 8-12 weeks of focused work before plugins, streaming, and lineage UI become the next major theme.
