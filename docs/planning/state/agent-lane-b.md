---
title: Agent Lane B - Event Contract And Traceability
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-26
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

Unassigned lane for parallel work. Use this file when assigning Agent B.

## Goal

Stabilize event payload versioning and lineage wiring.

## Tasks

> Source of truth: `agent-lane-b.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P0` `MVP-B1`: build a claim-to-evidence traceability matrix for backend MVP operability assertions (capability, proof source, and executable validation command).
- [ ] `P0` `S05`: S05-part-1 envelope boundary hardening: enforce payloadVersion and envelope-level write-boundary schema gating.
- [x] `P0` `S05-F1`: add per-eventType payload-content schema validation at write boundary.
- [x] `P1` `RC-B1`: decouple lineage worker from adapter internals.
- [x] `P1` `RC-B2`: replace lineage noop resolver with a real resolver.
- [x] `P1` `RC-B5`: add exponential retry scheduling (next_attempt_at) to lineage outbox to pace retries and harden DLQ.
- [x] `P1` `RC-B5-F2`: add real-Postgres integration tests for lineage claim-timeout and stale-claimer race semantics.
- [ ] `P1` `DLQ alerting + automated replay`: surface and reduce lineage backlogs.
- [ ] `P2` `manifest S3 fetch cache`: reduce planner egress and build latency.
- [ ] `P2` `ADP-LINT-ORDER-01`: upgrade eslint import-order toolchain and remove workaround-only inline type alias patterns in adapter-postgres.
- [ ] `P2` `RC-F2`: externalize adapter-postgres CI path patterns to tools/ci/policy/adapter-postgres-relevance.json and load it from both test.yml and pr-quality-gate.yml; add path-matcher unit tests.

## Dependencies

- `MVP-B1` depends on `MVP-A1` to avoid traceability drift from an unstable capability inventory.
- `S05` is explicitly tracked as `S05-part-1` (envelope boundary closure).
- `S05-F1` is closed after runtime boundary validation in contracts, adapter-postgres, and engine focused suites, plus negative write-boundary coverage.
- `RC-B1` and `RC-B2` are closed in mainline.
- `RC-B5` is complete; `RC-B5-F2` tracks the remaining integration-depth gap.
- `RC-B5` remains a prerequisite to DLQ alerting plus automated replay.
- `ADP-LINT-ORDER-01` tracks deferred tooling hardening for import-order crash behavior.
- `RC-F2` is independent and CI-only with no runtime risk.
- Improvement: normalize `payloadVersion` explicitly in more test helpers to harden the type boundary further.
- Improvement: if failure semantics need to differ per producer, split `RunFailed` into more specific contracts in a later iteration.

## Expected Outcome

- event contracts are versioned
- lineage ownership is explicit
- failures are observable and replayable
