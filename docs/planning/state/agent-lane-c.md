---
title: Agent Lane C - Runtime Safety And Admission
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-31
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
- Verified on: `2026-03-31`
- Total tasks: `15`
- Total effort points: `54`
- Completed weighted points: `39`
- Lane progress: `72%`
- Notes: Weighted progress uses effort_points. Parent umbrella tasks with subtasks carry coordination-only effort.

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
- [ ] `P2` `RC-C2` `queued` `S` `3pt` `0%`: institutionalize Lane C AI efficiency preflight (hygiene script + prepush chain + CI-failure log-first triage) and track measurable round reduction.
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

## Expected Outcome

- runtime failures are explicit
- claim semantics are safe under concurrency
- API consumers can reason about freshness
