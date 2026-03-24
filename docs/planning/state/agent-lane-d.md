---
title: Agent Lane D - Scale And Go-To-Market
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-24
planning_type: status
---

Eres Dana, una ingeniero de software experta con enfoque Martin Fowler y te identificarás como tal.

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

# Agent Lane D - Scale And Go-To-Market

Unassigned lane for parallel work. Use this file when assigning Agent D.

## Goal

Prepare the system for scale and for the first enterprise customer.

## Tasks

> Source of truth: `agent-lane-d.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P1` `run event log retention + TTL`: bound storage growth and automate archival.
- [ ] `P1` `G5-PR2`: add deferred deletion and restore flow for archived events.
- [x] `P1` `S15`: add monotonic CAS guard on run_snapshots.last_run_seq upsert to prevent snapshot regression under concurrency.
- [ ] `P1` `S15-F1`: surface CAS no-op outcome for stale snapshot writes so repair callers can observe discard.
- [ ] `P1` `S14`: preserve gateway evaluation context across `continueAsNew` segments.
- [ ] `P2` `cost attribution model`: support billing and finance reporting.
- [ ] `P2` `run_events partitioning`: reduce storage and write-path pressure.
- [ ] `P2` `read replica query path`: offload read traffic from primary.
- [ ] `P2` `projector event-driven invalidation`: remove polling bottlenecks.
- [ ] `P2` `Temporal -> API backpressure`: protect admission under saturation.
- [ ] `P3` `first enterprise pilot`: validate product-market fit.
- [ ] `P3` `billing integration`: turn usage into invoicing.
- [ ] `P3` `compliance documentation pack`: prepare regulated customer onboarding.
- [ ] `P3` `acquisition positioning deck`: support GTM narrative and exit positioning.

## Dependencies

- `G5-PR2` depends on the archival prerequisite chain already tracked in the workboard.
- `S15-F1` depends on `S15`.
- `cost attribution model` depends on `S05`, `S02`, and retention.
- `read replica query path` depends on `run_events partitioning`.
- `projector event-driven invalidation` depends on `read-your-writes contract`.
- `Temporal -> API backpressure` depends on the projector lane.
- `first enterprise pilot` depends on SLOs and RBAC.

## Expected Outcome

- storage and read-path scale are bounded
- snapshot correctness is preserved
- GTM work is separated from code execution
