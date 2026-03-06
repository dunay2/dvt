# DVT+ Roadmap (Code-Driven) - 2026 Q2

Date: 2026-03-06
Baseline completion: 57% (see `../status/code_completion_assessment_2026-03-06.md`)

## Navigation

- [Pack Home](../README.md)
- [Pack Index](../index.md)
- [Completion Assessment](../status/code_completion_assessment_2026-03-06.md)
- [Parallel Task List](parallel_task_list.md)
- [Architecture Atlas](../architecture/architecture_atlas.md)

## Target

Reach a production-capable core (without plugin marketplace) by June 12, 2026,
with real run APIs, temporal wiring, outbox delivery runtime, and web/API integration.

## Wave 0 - Composition Baseline (March 9-20, 2026)

Goals:

- Compose `WorkflowEngine` runtime in `apps/api`.
- Register provider adapters from config (mock + temporal).
- Define first run-domain API contracts.

Exit criteria:

- API process can instantiate engine dependencies.
- Provider map is no longer hardcoded to mock-only reconciliation.
- OpenAPI or route schema exists for `POST /runs`, `GET /runs/:id`, `POST /runs/:id/signals`.

Estimated effort: 5-6 pw

## Wave 1 - Execution Path End-to-End (March 23-April 17, 2026)

Goals:

- Implement run-domain API handlers.
- Wire `@dvt/adapter-temporal` in API runtime.
- Add outbox delivery runtime process (tick loop + retry/backoff metrics).

Exit criteria:

- Create run -> execute via temporal -> query status path works end-to-end.
- Outbox pending queue drains under normal load.
- Tenant-scoped access control is enforced in run API handlers.

Estimated effort: 8-10 pw

## Wave 2 - Frontend Integration + Observability (April 20-May 15, 2026)

Goals:

- Replace mock data path in runs/canvas/plugins views with API queries.
- Implement real OTel exporter wiring (not scaffold-only noop).
- Add SLO metrics and alerts for outbox lag and run failure rates.

Exit criteria:

- Main web views use backend data by default.
- Trace + metric correlation includes `tenantId`, `runId`, `provider`.
- CI has API/web integration tests for key run flows.

Estimated effort: 7-9 pw

## Wave 3 - Hardening + Release Gate (May 18-June 12, 2026)

Goals:

- Failover and replay tests for outbox and temporal retries.
- Security and tenancy negative tests at API boundary.
- Performance budget validation for state store and run APIs.

Exit criteria:

- No P0 regression in run lifecycle tests.
- Documented runbook for incident triage (outbox stuck, temporal unavailable, db degraded).
- Release checklist passed for core stack.

Estimated effort: 6-8 pw

## Deferred (Post-Core) - Plugin Runtime

Window: after core release gate

Scope:

- Introduce `@dvt/plugin-runtime` package.
- Enforce capability contract + sandbox policy.
- Add signed plugin artifact verification.

Estimated effort: 6-8 pw additional

## Parallel Workstreams

- Stream A: Backend runtime composition + APIs
- Stream B: Persistence/outbox + reliability
- Stream C: Frontend integration
- Stream D: Observability/security hardening

Detailed tasks and dependencies: `./parallel_task_list.md`

## Next

- Continue with [Parallel Task List](parallel_task_list.md)
