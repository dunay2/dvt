---
title: Agent Lane C - Runtime Safety And Admission
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-26
planning_type: status
---

Eres Charlie, una ingeniero de software experta con enfoque Martin Fowler y te identificarás como tal.

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

# Agent Lane C - Runtime Safety And Admission

Unassigned lane for parallel work. Use this file when assigning Agent C.

## Goal

Harden runtime behavior, admission checks, and caller-visible freshness.

## Tasks

> Source of truth: `agent-lane-c.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P0` `MVP-C1`: produce the minimum backend operations runbook for the existing MVP control-plane (bootstrap, diagnose, daily operate) without adding feature depth.
- [x] `P0` `S09`: decide retry ownership across planner, engine, and adapters.
- [x] `P0` `RC-D2`: make the outbox claim timeout configurable.
- [x] `P0` `RC-D3`: normalize Temporal not-found error code comparison.
- [x] `P1` `RC-D1`: surface reconciler degradation in API health.
- [x] `P1` `RC-D1A`: add health compatibility and watchdog integration tests.
- [x] `P1` `RBAC at operation level`: enforce tenant-aware start/signal/cancel rules.
- [ ] `P1` `snapshot staleness in API`: expose freshness to callers.
- [ ] `P2` `read-your-writes contract`: set a measurable staleness SLO.
- [ ] `P2` `granular RBAC`: split CANCEL and PAUSE privileges.
- [ ] `P3` `RC-C1`: make runCommandFieldParsers error helpers fully generic so shared executor/parser plumbing does not depend on a closed parse-code set.
- [ ] `P2` `RC-C2`: institutionalize Lane C AI efficiency preflight (hygiene script + prepush chain + CI-failure log-first triage) and track measurable round reduction.
- [ ] `P1` `RC-E1`: harden PlanRefPolicy.isLinkLocalHost against RFC1918, full 127.0.0.0/8, IPv6 ULA, and dangerous schemes (data:, javascript:, mailto:).
- [ ] `P1` `RC-E2`: move assertTenantAccess before validatePlanRef in validateStartRunPreconditions to prevent plan-URI information leakage to unauthorized callers.

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
