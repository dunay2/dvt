---
title: Agent Lane C - Runtime Safety And Admission
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-01
planning_type: status
---

Eres Charie, ingeniero de runtime safety y operabilidad. Trabajas para que el sistema falle de forma explicita, diagnosticable y segura.

## Principios obligatorios

- Fail fast con contexto: errores claros y accionables
- Operabilidad MVP primero: bootstrap, diagnose, daily operate
- Admission y auth antes de profundidad funcional
- Freshness visible al caller: sin suposiciones implicitas
- Concurrencia segura: leases, idempotencia, invariantes estables

## Forma de trabajo

- Definir contrato operativo minimo por endpoint critico
- Agregar cobertura negativa para paths de error reales
- Validar que estado/health expongan degradacion real

## Restricciones

- No esconder degradacion bajo "ok" superficial
- No mezclar concerns de seguridad con concerns de UI
- No introducir retries ambiguos sin ownership definido

# Agent Lane C - Runtime Safety And Admission

Generated from the verified lane registry `agent-lane-c.yaml`. Use this file when assigning Agent C.

## Goal

Harden runtime behavior, admission checks, and caller-visible freshness.

## Verification Summary

- Status model: `evidence-backed lane registry`
- Done rule: `done only with accepted evidence or equivalent verifiable closure`
- Verified on: `2026-04-01`
- Total tasks: `21`
- Total effort points: `83`
- Completed weighted points: `45.5`
- Lane progress: `55%`
- Notes: Weighted progress uses effort_points. `RC-C2` currently contributes 33% execution evidence while parent umbrella tasks with subtasks carry coordination-only effort.

## Tasks

> Verified registry source: `agent-lane-c.yaml`. Edit the YAML and run `pnpm docs:planning:lanes:generate` plus `pnpm docs:workboard:generate`.

- [x] `P0` `MVP-C1` `done` `M` `5pt` `100%`: produce the minimum backend operations runbook for the existing MVP control-plane (bootstrap, diagnose, daily operate) without adding feature depth.
- [x] `P0` `S09` `done` `S` `3pt` `100%`: decide retry ownership across planner, engine, and adapters.
- [x] `P1` `S16` `done` `M` `5pt` `100%`: enforce governed planVersion validation at start-run admission to reject unsupported or stale plan references.
- [x] `P0` `RC-D2` `done` `S` `3pt` `100%`: make the outbox claim timeout configurable.
- [x] `P0` `RC-D3` `done` `S` `2pt` `100%`: normalize Temporal not-found error code comparison.
- [x] `P1` `RC-D1` `done` `M` `3pt` `100%`: surface reconciler degradation in API health.
- [x] `P1` `RC-D1A` `done` `M` `3pt` `100%`: add health compatibility and watchdog integration tests.
- [x] `P1` `RBAC at operation level` `done` `M` `5pt` `100%`: enforce tenant-aware start/signal/cancel rules.
- [x] `P1` `snapshot staleness in API` `done` `M` `5pt` `100%`: expose freshness to callers.
- [x] `P2` `read-your-writes contract` `done` `M` `5pt` `100%`: set a measurable staleness SLO.
- [x] `P2` `granular RBAC` `done` `M` `5pt` `100%`: split CANCEL and PAUSE privileges.
- [x] `P1` `RC-C1` `done` `L` `8pt` `100%`: normalize caller-visible HTTP error contracts across apps/api and separate semantic validation outcomes from transport serialization, including typed maintenance-boundary not-found handling and removal of remaining parser legacy.
- [x] `P1` `manifestRef production path` `done` `M` `5pt` `100%`: restore manifestRef as the real protected-runtime planner path by composing a concrete artifact resolver at the API boundary and mapping predictable resolution failures to the existing plan_rejected result.
- [ ] `P0` `AR-C1` `queued` `S` `3pt` `0%`: add explicit RBAC check to admin routes (/admin/runs/:runId/rebuild-snapshot and any future admin endpoints) so that authentication alone is not sufficient — an admin-level role grant is required regardless of feature flag state.
- [ ] `P0` `AR-C2` `queued` `S` `3pt` `0%`: define and document formal SLA targets for event delivery latency, snapshot freshness, plan compilation time, run start latency, and outbox drain rate with measurable thresholds and monitoring signals.
- [ ] `P1` `AR-C3` `queued` `M` `5pt` `0%`: add end-to-end backpressure from Temporal task queue saturation back to StartRunAdmissionGuard so the system stops accepting runs it cannot execute when Temporal workers are saturated.
- [ ] `P1` `AR-C4` `queued` `M` `5pt` `0%`: add circuit breaker between Temporal activities and IRunStateStore to prevent state store unavailability from blocking all step execution with no fallback or degradation signal.
- [ ] `P0` `MW-C1` `queued` `L` `8pt` `0%`: abstract step execution in Temporal adapter by separating DbtStepActivity from a StepActivityDispatcher that routes by StepKind to the correct activity implementation, enabling non-dbt step types (PYTHON_SCRIPT, SPARK_JOB, API_CALL).
- [ ] `P2` `RC-C2` `review` `S` `3pt` `67%`: institutionalize shared preflight (`hygiene.ps1`), log-first CI triage, and structured AI efficiency measurement for Lane C before scaling the workflow repo-wide.
- [x] `P1` `RC-E1` `done` `S` `3pt` `100%`: harden PlanRefPolicy.isLinkLocalHost against RFC1918, full 127.0.0.0/8, IPv6 ULA, and dangerous schemes (data:, javascript:, mailto:).
- [x] `P1` `RC-E2` `done` `S` `2pt` `100%`: move assertTenantAccess before validatePlanRef in validateStartRunPreconditions to prevent plan-URI information leakage to unauthorized callers.

## Dependencies

- `MVP-C1` is now closed because its accepted runbook artifact no longer carries an open dependency on `MVP-A1` or `MVP-B1`.
- `S09` is closed via accepted ADR-0040.
- `S16` is verified from runtime code and tests despite older review surfaces that still showed it open.
- `RC-D1` and `RC-D1A` are code-grounded by health route and watchdog coverage.
- `read-your-writes contract` is now unblocked by the accepted snapshot staleness caller surface.
- `RC-C1` is closed by the canonical HTTP envelope, route/mapper migration, and typed `rebuildSnapshot` not-found maintenance boundary.
- `RC-E1` and `RC-E2` are verified from code and tests on the start-run validation/security path.
- `RC-C2` moved to in-progress with cycle-1 preflight evidence captured; completion still requires two additional consecutive PR cycles under the same protocol.
- `AR-C1` and `AR-C2` are P0 tasks from the 2026-04-02 deep review: admin route RBAC and formal SLA definitions.
- `AR-C3` and `AR-C4` are P1 tasks: end-to-end adapter backpressure and activity-to-state-store circuit breaker.
- `MW-C1` is the P0 multi-workflow execution-layer blocker: abstract step execution in Temporal to support non-dbt step kinds via StepActivityDispatcher.

## Expected Outcome

- runtime failures are explicit
- claim semantics are safe under concurrency
- API consumers can reason about freshness
