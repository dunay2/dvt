---
title: 20260322 DVT Corrected Code Grounded Review
status: Historical
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-22
planning_type: review
---

# DVT+ Revisión Corregida (Basada en Código)

Correcciones a afirmaciones incorrectas del análisis previo y focos de riesgo
reales observados en código.

## Correcciones clave

### 1. DSL: versionado y determinista (afirmación previa incorrecta)

Lo que muestra el código:

- `packages/@dvt/dsl/src/v1/ast.ts`: `dslVersion: '1.0'` en el AST.
- `packages/@dvt/dsl/src/v1/parser.ts`: gramática `IDENT = LITERAL`; rechaza
  explícitamente `AND/OR`.
- `packages/@dvt/dsl/src/v1/evaluator.ts`: evaluación pura por igualdad de tipo
  y valor, sin side effects.

Corrección:

- La afirmación "DSL no versionado / no determinista" es incorrecta.

Riesgo real relacionado:

- En `continueAsNew`, se propagan `gatewayDecisions` y `skippedStepIds`, pero
  no `completedStepResults`.
- El fallback `buildCompletedStepFact(...)` aporta solo `{ stepId, status }`.
- Gateways que dependan de campos distintos de `status` pueden evaluar `false`
  silenciosamente al cruzar segmentos de workflow.

### 2. Snapshot locking: existe, pero sin CAS en upsert (afirmación previa parcial)

Lo que muestra el código:

- `rebuildSnapshot` usa `pg_advisory_xact_lock` por `runId`.
- `persistWithClient` hace `ON CONFLICT (run_id) DO UPDATE` sin condición de
  monotonicidad sobre `last_run_seq`.

Corrección:

- No es cierto que no haya locking; sí existe en `rebuildSnapshot`.
- El riesgo real es de escritura ciega entre `rebuildSnapshot` y write path:
  puede retroceder snapshot (`last_run_seq`) temporalmente.

### 3. Outbox claim/lease: implementado (afirmación previa incorrecta)

Lo que muestra el código en `PostgresOutboxStore.listPendingForClaim`:

- `FOR UPDATE SKIP LOCKED`.
- Lease expiry sobre `claimed_at`.
- Orden por `run_seq` con fence por eventos previos pendientes del mismo run.
- Fence por `outbox_dead_letter`.
- Sharding determinista por hash de `runId`.

Corrección:

- La afirmación "no hay claim/lease" es incorrecta.

Riesgo real relacionado:

- En contrato, `listPendingForClaim` sigue opcional.
- Si una implementación cae al path `listPending`, se pierde fencing en
  despliegues multi-worker.

## Riesgos reales confirmados en código

1. `assertSupportedPlanVersion` no está cableado en precondiciones de runtime.
2. `continueAsNew` no persiste `completedStepResults` y puede degradar gateways
   silenciosamente.
3. `persistWithClient` no protege monotonicidad de `last_run_seq` (falta CAS).
4. `TokenBucketRateLimiter` es in-memory por proceso (no distribuido).
5. `AllowAllAuthorizer` sigue siendo la implementación concreta disponible y su
   guard puede bypassarse con `allowInsecureInProduction`.
6. `IRunStateStore` split (`S02`) sigue pendiente.
7. `providerSelection.ts` no lee `process.env` internamente; el riesgo depende
   del call site (en la práctica no se observó uso runtime fuera de tests).

## Tabla de riesgos corregida

| Riesgo                                                | Severidad  | Estado en código        | Acción                                                             |
| ----------------------------------------------------- | ---------- | ----------------------- | ------------------------------------------------------------------ |
| `completedStepResults` no persiste en `continueAsNew` | Alta       | Confirmado              | Persistir resultados o fallar explícitamente cuando falte contexto |
| Upsert de snapshot sin CAS por `last_run_seq`         | Alta       | Confirmado              | Agregar condición de monotonicidad en `ON CONFLICT ... DO UPDATE`  |
| `assertSupportedPlanVersion` sin uso runtime          | Media      | Confirmado              | Validar `planRef.planVersion` en precondiciones de `startRun`      |
| `AllowAllAuthorizer` como implementación efectiva     | Crítica    | Confirmado              | Implementar authorizer real y retirar bypass inseguro              |
| Rate limit por tenant no distribuido                  | Media-Alta | Confirmado              | Backend distribuido (p. ej. Redis) o control externo               |
| `listPendingForClaim` opcional en contrato            | Media      | Confirmado              | Endurecer contrato o fail-fast en runtime multi-worker             |
| `IRunStateStore` monolítico                           | Alta       | Confirmado              | Ejecutar `S02`                                                     |
| "DSL no versionado"                                   | Alta       | Incorrecto              | N/A                                                                |
| "Outbox sin claim/lease"                              | Alta       | Incorrecto              | N/A                                                                |
| "Snapshot sin locking"                                | Media      | Parcialmente incorrecto | Riesgo real: falta CAS en upsert                                   |

## Tres acciones de impacto inmediato

1. Añadir guard de monotonicidad de `last_run_seq` en el upsert de snapshot.
2. Persistir `completedStepResults` en `continueAsNew` o fallar en modo
   explícito ante contexto incompleto para gateway.
3. Llamar `assertSupportedPlanVersion(planRef.planVersion)` en
   `validateStartRunPreconditions`.
