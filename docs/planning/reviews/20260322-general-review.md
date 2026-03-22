---
title: 20260322 Review
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-22
planning_type: review
---

# 20260322 Review

Review wrapper page for 2026-03-22 findings.

Primary review artifact:

- [20260322 DDD and Hexagonal Port Audit](20260322-ddd-hexagonal-port-audit-review.md)
- [20260322 DVT Deep Architectural Review](20260322-dvt-deep-architectural-review.md)
- [20260322 DVT Corrected Code Grounded Review](20260322-dvt-corrected-code-grounded-review.md)
- [20260322 DVT Code Grounded Corrective Task List Review](20260322-dvt-code-grounded-corrective-task-list-review.md)

## Scope Summary

- full-repository DDD and Hexagonal Architecture compliance audit
- post-gap closure structural review (`G1..G10` closed baseline)
- mapping of findings to execution slices and roadmap impact

## Execution Mapping

Relevant execution items are tracked in:

- [Execution Workboard](../state/execution-workboard.md)
- [Domain Status Board](../state/domain-status-board.md)

Related findings mapped in workboard intake:

- `F1` -> authorization port extraction
- `S03` -> start-run orchestration extraction

DDD finding-to-task chain (to avoid orphan findings):

- `F1` -> `F1`
- `F2` -> `S03`
- `F3` -> `S02`
- `F4` -> `F4`
- `F5` -> `F5`

## Deep Review Claim Validation (Code-checked 2026-03-22)

The following matrix validates key claims in the deep review against current
repository code.

| Claim from deep review                                                                 | Verdict    | Evidence                                                                                                                                           | Task mapping |
| -------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `WorkflowEngine.startRun` still mixes policy/orchestration/event persistence concerns. | `True`     | `WorkflowEngine.startRun` and `_startRunCore` still execute preconditions, rate-limit, bootstrap/dispatch, and event emission in one service flow. | `S03`        |
| `IRunStateStore` is still monolithic (write/read/maintenance mixed).                   | `True`     | One interface still exposes bootstrap, append, reads, replay, and stale-snapshot scanning.                                                         | `S02`        |
| Deprecated state-store methods remain exposed (`saveRunMetadata`, `appendEventsTx`).   | `True`     | Methods still exist and are marked deprecated in Postgres/in-memory stores.                                                                        | `S12`        |
| Duplicate `estimateRunRef` declaration exists in provider adapter contract.            | `True`     | `estimateRunRef` appears twice in `IProviderAdapter`.                                                                                              | `S13`        |
| Retry ownership is still implicit between planner/runtime/configuration.               | `True`     | Workflow retry policy is runtime-configured; no per-step retry contract in plan shape.                                                             | `S09`        |
| Runtime `planVersion` closure is complete.                                             | `Partial`  | Policy helper exists but is not wired into runtime execution path; used only in tests.                                                             | `R3`         |
| `IRunAccessPolicy` is not a real port.                                                 | `Not true` | `IRunAccessPolicy` interface exists and `WorkflowEngine` depends on it.                                                                            | none         |
| Gateway DSL is unversioned and evaluated in workflow body.                             | `Not true` | Plan contract includes `gateway.dslVersion`; gateway validation/execution is in activity boundary.                                                 | none         |
| Snapshot concurrency has no control model.                                             | `Not true` | Per-run advisory locks are used in event append and snapshot rebuild paths.                                                                        | none         |
| Outbox has no claim/lease, replay, or purge lifecycle.                                 | `Not true` | Claim path sets `claimed_at` with lock semantics; dead-letter replay and purge runtimes exist.                                                     | none         |
| Backpressure strategy is missing.                                                      | `Not true` | Admission guard with cache + breaker + fallback is wired in protected runtime module.                                                              | none         |
| Realtime run-status update contract (SSE/WebSocket) is defined.                        | `Not true` | No SSE/WebSocket contract or route surface was found in API runtime.                                                                               | `A1`         |

Execution tasks for the `True` and actionable `Partial` claims are tracked in:

- [Execution Workboard](../state/execution-workboard.md)
- [Open Task Route](../state/open-task-route.md)

## Corrección del 2026-03-22 (Code-grounded)

La revisión corregida ajusta tres afirmaciones que estaban mal o incompletas en
la lectura previa:

- DSL gateway: sí está versionado y es determinista.
- Snapshot locking: sí existe en `rebuildSnapshot`; el riesgo real es la falta
  de CAS por `last_run_seq` en el upsert.
- Outbox claim/lease: sí está implementado en Postgres; el riesgo real está en
  que el contrato aún permite un path opcional sin claim.

Además agrega acciones inmediatas para:

- CAS de snapshots.
- consistencia de contexto en `continueAsNew` para gateways.
- validación runtime de `planVersion`.

## Integración adicional (task-list code grounded)

Se integró una lista correctiva extendida (`A/B/C/D`) con dependencias
explícitas y orden de ejecución. El mapeo operativo está en:

- [Execution Workboard](../state/execution-workboard.md)
- [Open Task Route](../state/open-task-route.md)
