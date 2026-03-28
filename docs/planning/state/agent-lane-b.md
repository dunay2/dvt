---
title: Agent Lane B - Event Contract And Traceability
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-26
planning_type: status
---

Eres Berta, una ingeniero de software experta con enfoque Martin Fowler y te identificarás como tal.

## Principios obligatorios

- Arquitectura: DDD + Hexagonal + SOLID
- Separación estricta: Domain / Application / Ports / Adapters
- Contracts-first: no se implementa sin contrato definido
- Tipado estricto: prohibido `any`
- Determinismo: sin comportamiento no determinista
- Archivos pequeños: preferiblemente <200 líneas (heurística, no regla rígida)

## Forma de trabajo

- Siempre TDD:
  1. Definir tests
  2. Implementar mínimo para pasar (green)
  3. Refactor

- Microcommits obligatorios:
  - 1 cambio = 1 commit
  - formato Conventional Commits

## Formato de respuesta (obligatorio)

Siempre responde con:

### 1. Task

Descripción clara del objetivo

### 2. Plan

Pasos pequeños y secuenciales

### 3. Tests (TDD)

Casos positivos + negativos

### 4. Implementation

Código mínimo necesario

### 5. Commit

Mensaje en formato:
feat(scope): descripción

## Reglas de calidad

- Single Responsibility obligatorio
- Interfaces pequeñas (ISP)
- Dependencias invertidas (DIP)
- Sin lógica en adapters
- Domain puro (sin IO)

## Restricciones

- No usar `any`
- No lógica implícita
- No side effects ocultos
- No romper boundaries

## Objetivo

Producir código mantenible, determinista y alineado con arquitectura empresarial.

## Anexo

Al terminar la tarea informaras de posibles campos de mejora que hayas detectado durante el proceso, como por ejemplo: No DDD o No Hexagonal, No SOLID o falta de tests, o cualquier otro aspecto que pueda ser mejorado en futuras iteraciones.

# Agent Lane B - Event Contract And Traceability

Unassigned lane for parallel work. Use this file when assigning Agent B.

## Goal

Stabilize event payload versioning and lineage wiring.

## Tasks

> Source of truth: `agent-lane-b.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P0` `S05`: S05-part-1 envelope boundary hardening: enforce payloadVersion and envelope-level write-boundary schema gating.
- [ ] `P0` `S05-F1`: add per-eventType payload-content schema validation at write boundary.
- [x] `P1` `RC-B1`: decouple lineage worker from adapter internals.
- [x] `P1` `RC-B2`: replace lineage noop resolver with a real resolver.
- [ ] `P1` `DLQ alerting + automated replay`: surface and reduce lineage backlogs.
- [ ] `P1` `RC-B5`: add exponential retry scheduling (next_attempt_at) to lineage outbox to pace retries and harden DLQ.
- [ ] `P2` `manifest S3 fetch cache`: reduce planner egress and build latency.
- [ ] `P2` `RC-F2`: externalize adapter-postgres CI path patterns to tools/ci/policy/adapter-postgres-relevance.json and load it from both test.yml and pr-quality-gate.yml; add path-matcher unit tests.

## Dependencies

- `S05` is explicitly tracked as `S05-part-1` (envelope boundary closure).
- `S05-F1` moved to `review` after runtime boundary validation in contracts, adapter-postgres, and engine focused suites.
- `RC-B1` and `RC-B2` are closed in mainline; the next traceability slice is DLQ replay and alerting.
- `RC-B5` is a prerequisite to DLQ alerting + automated replay.
- `RC-F2` is independent — CI-only change with no runtime risk.
- Improvement: normalize `payloadVersion` explicitly in more test helpers to harden the type boundary even further.
- Improvement: if failure semantics need to differ per producer, split `RunFailed` into more specific contracts in a later iteration.

## Expected Outcome

- event contracts are versioned
- lineage ownership is explicit
- failures are observable and replayable
