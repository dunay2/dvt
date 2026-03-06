# Parallel Task List (Code-Driven)

Date: 2026-03-06

## Navigation

- [Pack Home](../README.md)
- [Pack Index](../index.md)
- [Roadmap](roadmap_2026Q2.md)
- [Completion Assessment](../status/code_completion_assessment_2026-03-06.md)
- [Architecture Atlas](../architecture/architecture_atlas.md)

## Assumptions

- Team model: 4 streams in parallel (Backend, Storage, Frontend, Platform).
- Task effort is person-weeks (pw).
- Dependencies are strict only where data contracts must exist first.

## Task Backlog

| ID  | Stream   | Task                                                                          | Depends On | Parallel With | Effort |
| --- | -------- | ----------------------------------------------------------------------------- | ---------- | ------------- | -----: |
| A1  | Backend  | Add engine composition module in `apps/api` (instantiate WorkflowEngine deps) | none       | B1, D1        |    1.0 |
| A2  | Backend  | Provider registry from env (mock + temporal)                                  | A1         | B1, D1        |    0.8 |
| A3  | Backend  | Implement `POST /runs` route (validate planRef + context)                     | A1         | B2, C1        |    1.2 |
| A4  | Backend  | Implement `GET /runs/:runId` route (status from snapshot/events)              | A1         | B2, C1        |    1.0 |
| A5  | Backend  | Implement `POST /runs/:runId/signals` route                                   | A1         | B2, C2        |    1.0 |
| A6  | Backend  | Implement `GET /runs` list endpoint (tenant-scoped)                           | A1         | B2, C1        |    0.8 |
| A7  | Backend  | Add route-level authz middleware with tenant assertions                       | A3         | D2, D3        |    1.2 |
| A8  | Backend  | API integration tests for run lifecycle routes                                | A3, A4, A5 | B3, C3        |    1.5 |
| B1  | Storage  | Add outbox runtime loop bootstrap in `apps/api` using `OutboxWorker`          | none       | A1, D1        |    1.2 |
| B2  | Storage  | Add repository/service layer for run queries + event pages                    | none       | A3, A4, A6    |    1.0 |
| B3  | Storage  | Add outbox lag metrics + DLQ counters and health endpoint                     | B1         | A8, D1        |    1.0 |
| B4  | Storage  | Add retry/replay admin route for dead letters (tenant-scoped)                 | B2         | D2, C4        |    1.0 |
| B5  | Storage  | Add load test scenario for outbox drain and retry storm                       | B1         | D4            |    1.2 |
| C1  | Frontend | Build API client + query hooks for runs/status/list/signal                    | none       | A3, A4, A5    |    1.2 |
| C2  | Frontend | Replace `RunsView` mock data with API state                                   | C1, A4     | A5, D1        |    1.0 |
| C3  | Frontend | Replace canvas run execution state from mock to API poll/SSE                  | C1, A8     | B3, D1        |    1.5 |
| C4  | Frontend | Replace plugins/admin run data path with backend endpoints                    | C1, B4     | D2            |    1.0 |
| C5  | Frontend | Remove dead mock datasets from main runtime path                              | C2, C3     | D4            |    0.8 |
| D1  | Platform | Replace OTel scaffold with real SDK exporter wiring                           | none       | A1, B1, C2    |    1.5 |
| D2  | Platform | Add tenant-isolation negative tests (cross-tenant route attempts)             | A7         | B4, C4        |    1.2 |
| D3  | Platform | Add security tests for signal authorization and run ownership                 | A7, A5     | C2            |    1.2 |
| D4  | Platform | Add CI gates for api+web integration suite and reliability tests              | A8, B5, C5 | none          |    1.0 |
| D5  | Platform | Document runbooks: outbox stuck, temporal unavailable, db degraded            | B3, D1     | C5            |    0.8 |

## Suggested Parallel Execution Plan

1. Week 1-2 (foundation): A1, A2, B1, B2, C1, D1
2. Week 3-4 (core APIs): A3, A4, A5, A6, B3, C2, D2
3. Week 5-6 (integration): A7, A8, B4, C3, C4, D3
4. Week 7-8 (hardening): B5, C5, D4, D5

## Critical Path

A1 -> A3/A4/A5 -> A8 -> D4

If this path slips, release date slips.

## Fast-Track Option

If schedule pressure increases, defer these to post-core:

- C4 (plugins/admin UI backend integration)
- B4 (DLQ admin route)
- D5 (extended runbook depth)

## Back

- Return to [Roadmap](roadmap_2026Q2.md)
