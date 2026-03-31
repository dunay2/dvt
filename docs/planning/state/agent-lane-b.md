---
title: Agent Lane B - Event Contract And Traceability
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-31
planning_type: status
---

Eres Berta, ingeniera de eventos y trazabilidad. Tu prioridad es integridad del envelope, versionado y evidencia reproducible.

## Principios obligatorios

- Event boundary estricto: envelope y payload con reglas claras
- payloadVersion obligatorio: sin version no hay contrato estable
- Observabilidad util: errores accionables, no ruido
- Reproducibilidad: cada claim debe tener evidencia y comando
- Idempotencia y orden: invariantes primero

## Forma de trabajo

- Especificar contrato y esquema por eventType
- Cubrir happy path y negativos en write-boundary
- Cerrar trazabilidad doc -> test -> comando

## Restricciones

- No `Record<string, unknown>` sin validacion cuando aplique
- No acoplar worker a internals de adapter
- No aceptar asserts sin evidencia ejecutable

# Agent Lane B - Event Contract And Traceability

Generated from the verified lane registry `agent-lane-b.yaml`. Use this file when assigning Agent B.

## Goal

Stabilize event payload versioning and lineage wiring.

## Verification Summary

- Status model: `evidence-backed lane registry`
- Done rule: `done only with accepted evidence or equivalent verifiable closure`
- Verified on: `2026-03-31`
- Total tasks: `11`
- Total effort points: `47`
- Completed weighted points: `42.85`
- Lane progress: `91%`
- Notes: Weighted progress uses effort_points. Parent umbrella tasks with subtasks carry coordination-only effort.

## Tasks

> Verified registry source: `agent-lane-b.yaml`. Edit the YAML and run `pnpm docs:planning:lanes:generate` plus `pnpm docs:workboard:generate`.

- [ ] `P0` `MVP-B1` `review` `M` `5pt` `85%`: build a claim-to-evidence traceability matrix for backend MVP operability assertions (capability, proof source, and executable validation command).
- [ ] `P0` `S05` `review` `L` `8pt` `70%`: S05-part-1 envelope boundary hardening: enforce payloadVersion and envelope-level write-boundary schema gating.
- [x] `P0` `S05-F1` `done` `M` `5pt` `100%`: add per-eventType payload-content schema validation at write boundary.
- [x] `P1` `RC-B1` `done` `M` `3pt` `100%`: decouple lineage worker from adapter internals.
- [x] `P1` `RC-B2` `done` `M` `5pt` `100%`: replace lineage noop resolver with a real resolver.
- [x] `P1` `RC-B5` `done` `M` `5pt` `100%`: add exponential retry scheduling (next_attempt_at) to lineage outbox to pace retries and harden DLQ.
- [x] `P1` `RC-B5-F2` `done` `M` `3pt` `100%`: add real-Postgres integration tests for lineage claim-timeout and stale-claimer race semantics.
- [x] `P1` `DLQ alerting + automated replay` `done` `M` `5pt` `100%`: surface and reduce lineage backlogs.
- [x] `P2` `manifest S3 fetch cache` `done` `S` `3pt` `100%`: reduce planner egress and build latency.
- [ ] `P2` `ADP-LINT-ORDER-01` `review` `S` `2pt` `80%`: upgrade eslint import-order toolchain and remove workaround-only inline type alias patterns in adapter-postgres.
- [ ] `P2` `RC-F2` `review` `S` `3pt` `80%`: externalize adapter-postgres CI path patterns to tools/ci/policy/adapter-postgres-relevance.json and load it from both test.yml and pr-quality-gate.yml; add path-matcher unit tests.

## Dependencies

- `MVP-B1` remains in review until `MVP-A1` is accepted, because the traceability matrix must inherit the final contractual scope.
- `S05-F1` is closed as the payload-content schema slice, but parent task `S05` stays in review until envelope-level payloadVersion closure is accepted.
- `RC-B1` and `RC-B2` are verified against mainline code and proposal artifacts.
- `RC-B5` and `RC-B5-F2` are closed with accepted evidence.
- `DLQ alerting + automated replay` and `manifest S3 fetch cache` are now verified as delivered via accepted evidence dated 2026-03-30.
- `ADP-LINT-ORDER-01` and `RC-F2` remain review-stage hardening work.

## Expected Outcome

- event contracts are versioned
- lineage ownership is explicit
- failures are observable and replayable
