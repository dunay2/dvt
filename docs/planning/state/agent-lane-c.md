---
title: Agent Lane C - Runtime Safety And Admission
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-26
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

Unassigned lane for parallel work. Use this file when assigning Agent C.

## Goal

Harden runtime behavior, admission checks, and caller-visible freshness.

## Tasks

> Source of truth: `agent-lane-c.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P0` `MVP-C1`: produce the minimum backend operations runbook for the existing MVP control-plane (bootstrap, diagnose, daily operate) without adding feature depth.
- [x] `P0` `S09`: decide retry ownership across planner, engine, and adapters.
- [x] `P1` `S16`: enforce governed planVersion validation at start-run admission to reject unsupported or stale plan references.
- [x] `P0` `RC-D2`: make the outbox claim timeout configurable.
- [x] `P0` `RC-D3`: normalize Temporal not-found error code comparison.
- [x] `P1` `RC-D1`: surface reconciler degradation in API health.
- [x] `P1` `RC-D1A`: add health compatibility and watchdog integration tests.
- [x] `P1` `RBAC at operation level`: enforce tenant-aware start/signal/cancel rules.
- [x] `P1` `snapshot staleness in API`: expose freshness to callers.
- [x] `P2` `read-your-writes contract`: set a measurable staleness SLO.
- [ ] `P2` `granular RBAC`: split CANCEL and PAUSE privileges.
- [ ] `P3` `RC-C1`: make runCommandFieldParsers error helpers fully generic so shared executor/parser plumbing does not depend on a closed parse-code set.
- [ ] `P2` `RC-C2`: institutionalize Lane C AI efficiency preflight (hygiene script + prepush chain + CI-failure log-first triage) and track measurable round reduction.
- [x] `P1` `RC-E1`: harden PlanRefPolicy.isLinkLocalHost against RFC1918, full 127.0.0.0/8, IPv6 ULA, and dangerous schemes (data:, javascript:, mailto:).
- [x] `P1` `RC-E2`: move assertTenantAccess before validatePlanRef in validateStartRunPreconditions to prevent plan-URI information leakage to unauthorized callers.

## Dependencies

- `MVP-C1` depends on `MVP-A1` and `MVP-B1` so the runbook reflects verified capabilities only.
- `RC-D1A` depends on `RC-D1`.
- `RBAC at operation level` is unblocked after `S09`.
- Route-level RBAC deny-path tests are always-on; live-DB protected runtime integration is executed in release-candidate/nightly profiles when env posture is present.
- `Read-your-writes contract` depends on `snapshot staleness in API`.
- `RC-C1` depends on `RBAC at operation level`.
- `RC-C2` is independent and may run in parallel with runtime hardening items.
- `RC-E1` and `RC-E2` depend on S16 merge.

## Expected Outcome

- runtime failures are explicit
- claim semantics are safe under concurrency
- API consumers can reason about freshness
