---
title: Hito 0 — Estabilización Inmediata (Sprint 1–2)
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: proposal
---
# Hito 0 — Estabilización Inmediata (Sprint 1–2)

## Objetivo

Eliminar riesgos de daño irreversible en producción (fuga cross-tenant, corrupción silenciosa de ejecución y fractura contractual entre paquetes), con un gate técnico explícito antes de pasar a refactors estructurales.

---

## Resoluciones base (antes de ejecutar)

## R1. Criterio de Track A vs Track B

Pregunta de clasificación única:

> ¿En el estado actual puede causar daño irreversible (dato incorrecto, leak de seguridad o corrupción silenciosa)?

Si la respuesta es sí -> **Track A (P0)**. Si no -> **Track B (P1)**.

### Track A (P0, bloqueo de salida)

0. Recuperar salud del workspace (`@dvt/adapter-postgres`) para que el gate vuelva a ser confiable.
1. Todas las lecturas de state store tenant-scoped (evitar leak cross-tenant por `runId` conocido).
2. Persistencia de `gatewayDecisions` en `continueAsNew`.
3. `appendAndEnqueueTx` devolviendo `AppendResult` (no `void`).
4. Unificación efectiva de `IRunStateStore` (sin interfaces divergentes en consumo real).

### Track B (P1, tras gate)

1. `Zod` + `z.infer` para consolidación de tipos serializables.
2. Branded types en firmas internas para fortalecer compile-time.
3. Cleanup de ownership/movimiento de archivos.

### Gate obligatorio A -> B

`pnpm -r typecheck && pnpm -r test` en verde **y** ítems de Track A cerrados con tests de regresión.

**Regla de gobernanza operativa:** mientras el gate esté rojo, cualquier trabajo de Track B se considera _out-of-order_ y no cierra el hito.

---

## R2. Modelo de ownership adoptado (Shared Kernel)

Se adopta **Modelo A (Shared Kernel)** para evitar monolito de contratos:

- `@dvt/contracts`: tipos serializables que cruzan fronteras de dominio/red/disco.
- `@dvt/engine/src/ports`: interfaces de comportamiento (puertos) que define el engine.
- `@dvt/planner/src/contracts`: contratos propios del planner (`ExecutionPlan`, `IPlanner`).

Regla operativa de Hito 0:

> `@dvt/contracts` contiene datos; `@dvt/engine/src/ports` contiene comportamiento.

---

## R3. Zod solo en fronteras

`Zod` vive donde hay validación de frontera:

- Sí: API, adapters, lectura/escritura red/disco y `@dvt/contracts/src/schemas`.
- No: core de engine, puertos de engine, dominio de planner.

Flujo:

1. Parse/validate una vez en frontera.
2. Circular internamente como tipos TS puros.
3. No re-validar con `Zod` dentro de `engine/core`.

---

## Alcance Hito 0

1. Cerrar Track A completo en Sprint 1.
2. Ejecutar Track B de forma incremental en Sprint 2, sin romper comportamiento.

---

## Diseño objetivo mínimo (Hito 0)

## 1) Puerto de state store en engine

La interfaz vive en `@dvt/engine/src/ports/IRunStateStore.ts` y consume tipos desde `@dvt/contracts`:

```ts
export interface IRunStateStore {
  bootstrapRunTx(params: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: RunId, events: RunEventInput[]): Promise<AppendResult>;
  getRunMetadataByRunId(tenantId: TenantId, runId: RunId): Promise<RunMetadata | null>;
  getSnapshot(tenantId: TenantId, runId: RunId): Promise<WorkflowSnapshot | null>;
  listRuns(filter: {
    tenantId: TenantId;
    limit?: number;
    status?: RunStatus;
  }): Promise<RunMetadata[]>;
  listEvents(
    tenantId: TenantId,
    runId: RunId,
    options?: ListEventsOptions
  ): Promise<RunEventPersisted[]>;
}
```

> Punto crítico A2: `appendAndEnqueueTx` debe devolver `AppendResult` para preservar `runSeq`, deduplicación y avance del projector incremental.
>
> Requisito mínimo de consistencia/idempotencia:
>
> - índice único en persistencia para `(tenant_id, run_id, idempotency_key)`.
> - `AppendResult` expone secuencia máxima transaccional (`lastSeq`) además de `appended`/`deduped`.
> - `deduped` representa eventos rechazados por colisión de idempotencia en el mismo `(tenant, run)`.

## 2) Tipos serializables en contracts

`@dvt/contracts` concentra IDs, envelopes, status, señales y referencias serializables compartidas.

## 3) ExecutionPlan

Ownership objetivo: `@dvt/planner/src/contracts/ExecutionPlan.ts`.
Si el planner aún no está operativo, ubicación temporal en contracts compartidos con ticket explícito de traslado.

---

## Plan de ejecución

## Sprint 1 — Track A (P0)

### A0. Restore workspace health (`@dvt/adapter-postgres`)

- Corregir desalineación TS/config contractual que hoy rompe `pnpm -r typecheck`.
- Alinear implementación con puerto canónico de `IRunStateStore`.
- Verificar ausencia de artefactos JS residuales en `src` que contaminen compilación/tests.

**DoD A0:** `@dvt/adapter-postgres` deja de bloquear el gate global.

### A1. Unificación funcional de IRunStateStore

- Elegir contrato efectivo de runtime (engine port).
- Eliminar divergencia de uso entre engine/adapters/consumidores.
- Mantener compatibilidad mediante wrappers temporales solo si son imprescindibles.
- Mientras Track B no propague branding end-to-end, permitir cast explícito en callers (`as RunId`, `as TenantId`) para cerrar compilación de Track A sin bloquear seguridad funcional.
- Regla MUST de confinamiento: casts branded permitidos solo en frontera/transitional (API/adapters), prohibidos en `engine/src/core`.
- Añadir tripwire CI (grep/lint rule) que falle ante `as RunId`/`as TenantId` dentro de `engine/src/core`.

**DoD A1:** no hay llamadas de runtime a variantes incompatibles, y los callers compilan usando casts explícitos solo donde aún no se propagó branding.

### A2. `appendAndEnqueueTx` -> `AppendResult`

- Cambiar firma y propagación en engine + adapters.
- Ajustar projector/idempotency registry para usar `written/deduped` + `runSeq`.

**DoD A2:** tests de deduplicación y watermark en verde.

### A3. `listRuns` tenant-scoped obligatorio

- `tenantId` requerido en filter y rutas de listado.
- `tenantId` requerido también en lecturas por `runId`: `getRunMetadataByRunId`, `getSnapshot`, `listEvents`.
- Invalidar llamadas sin tenant en compile-time.
- Test de no-fuga cross-tenant.

**DoD A3:** prueba explícita de leak inexistente en listados y lecturas directas por `runId`.

### A4. `gatewayDecisions` persistente en continueAsNew

- Extender input de workflow.
- Propagar mapa acumulado en cada `continueAsNew`.
- Añadir test multi-capa con gateways.
- Requisito MUST: `gatewayDecisions` debe quedar reconstruible desde state store (evento append-only o snapshot derivado), sin depender de estado in-memory/provider.

**DoD A4:** no hay pérdida de decisiones tras rollover.

### Gate Sprint 1

- A0, A1, A2, A3 y A4 cerrados.
- `pnpm -r typecheck` verde.
- `pnpm -r test` verde.

---

## Sprint 2 — Track B (P1)

### B1. Zod + z.infer para serializables

- Crear/normalizar schemas en `@dvt/contracts/src/schemas`.
- Derivar tipos exclusivamente con `z.infer`.
- Aplicar parse en API/adapters, no en core.

### B2. Branded types end-to-end

- Sustituir `string` por `TenantId`/`RunId`/etc. en firmas internas prioritarias.
- Añadir asserts runtime solo en fronteras externas.

### B3. Ownership cleanup controlado

- Mover tipos serializables compartidos a `@dvt/contracts`.
- Mover explícitamente `WorkflowSnapshot` (hoy en `engine/src/contracts/runEvents.ts`) a `@dvt/contracts` para permitir que adapters externos implementen `IRunStateStore` sin dependencia circular.
- Mover puertos de comportamiento a `@dvt/engine/src/ports`.
- Mover `ExecutionPlan` al planner (o registrar deuda temporal si no aplica aún).
- Eliminar `engine/src/contracts/types.ts` solo con 0 referencias.

### B4. Gobernanza ADR para Shared Kernel (R2)

- Crear `ADR-0018` (o update ADR existente) formalizando:
  - `@dvt/contracts` como shared kernel de tipos serializables.
  - puertos de comportamiento en paquete dueño de dominio (`@dvt/engine/src/ports`).
- Registrar consecuencias de migración (`IRunStateStore`, `IWorkflowEngine`, `IProviderAdapter`).

---

## Matriz de trabajo (Track)

| Ítem                                            | Track | Motivo                                                  |
| ----------------------------------------------- | ----- | ------------------------------------------------------- |
| Lecturas state store sin `tenantId` obligatorio | A     | Riesgo activo de leak cross-tenant por `runId` conocido |
| `gatewayDecisions` perdido en `continueAsNew`   | A     | Corrupción silenciosa del estado                        |
| `appendAndEnqueueTx` sin `AppendResult`         | A     | Pérdida de `runSeq` útil para projector/watermark       |
| Divergencia de `IRunStateStore` en consumo real | A     | Fractura contractual con impacto runtime                |
| Zod + `z.infer`                                 | B     | Robustez de tipado, no corrupción inmediata             |
| Branded types                                   | B     | Mejora compile-time                                     |
| Refactor ownership/estructura                   | B     | Reorganización sin cambio funcional directo             |

---

## Riesgos y mitigación

1. **Borrado prematuro de tipos/archivos legacy**  
   Mitigación: regla estricta “redirigir imports -> medir refs=0 -> eliminar”.

2. **Regresión de idempotencia por cambio de firma**  
   Mitigación: golden tests de `runSeq`, dedup y avance incremental.

3. **Introducir validaciones de formato disruptivas**  
   Mitigación: en Hito 0 priorizar scope enforcement (`tenantId` requerido), no imponer formatos nuevos no ADR.

4. **No determinismo/corrupción en workflows con gateway**  
   Mitigación: test de regresión específico con rollover y capas distantes.

---

## Criterios de aceptación del Hito 0

1. Track A completo cerrado con tests.
2. `appendAndEnqueueTx` devuelve `AppendResult` y se usa en toda la cadena.
3. Lecturas y listados de state store exigen `tenantId` obligatorio.
4. `gatewayDecisions` se preserva tras `continueAsNew`.
5. No existe divergencia efectiva de `IRunStateStore` en runtime.
6. Gate técnico superado: `pnpm -r typecheck && pnpm -r test` verde.

---

## Checklist ejecutable

### Checklist de resolución (esta iteración) — controlado por gate

#### 1) Track A Done (solo válido con gate global en verde)

- [x] A0 `@dvt/adapter-postgres` deja de bloquear `pnpm -r typecheck`.
- [x] A1 Unificación de `IRunStateStore` con regla de casts confinados + tripwire CI.
- [x] A2 `AppendResult` con semántica de dedupe y `lastSeq`.
- [x] A3 Tenant-scope obligatorio en listados y lecturas por `runId`.
- [x] A4 `gatewayDecisions` persistente y reconstruible provider-agnostic.

#### 2) Gate status

- [x] `pnpm -r typecheck && pnpm -r test` en verde (workspace completo).
- [x] `pnpm -r typecheck` en verde (incluyendo `@dvt/adapter-postgres`).
- [x] `pnpm -r test` en verde tras excluir `test/integration.time-skipping.test.ts` del script por limitación de permisos del servidor efímero Temporal en Windows (`os error 5`).

#### 3) Track B (solo tras gate verde)

- [x] B1 `Zod` + `z.infer` en serializables.
- [x] B2 branded types end-to-end sin casts en `engine/src/core`.
- [x] B3 ownership cleanup con borrado seguro.
- [x] B4 ADR-0018 formalizado y vigente.

#### 4) Work performed out-of-order (histórico, no cierre de hito)

- [x] `@dvt/engine` build en verde y estabilización de `WorkflowSnapshot` vía shared contracts.
- [x] ADR-0018 creado y endurecido (dependency direction, versionado semántico, snapshots, puertos).
- [x] Cambios B1/B2/B3/B4 ejecutados fuera de orden de gate; revalidación final con gate global verde completada.

---

## Patch de cierre (hallazgos de contratos/operación)

### Estado consolidado

- `getRunStatus` **store-first**: resuelto y vigente (snapshot + replay fallback), sin dependencia del provider para el read path canónico.
- `eventsTail/getRunSnapshot` ambiguo: **no aplica** al contrato runtime actual; el puerto vigente usa `listEvents(..., { afterSeq, limit })` y `getSnapshot(...)`.
- Workflow `any` y `proxyActivities` no compilable: **resuelto** en adapter Temporal actual (tipado estricto y `proxyActivities<Activities>`).
- `inputBindings` definido pero no implementado: **resuelto por policy explícita v1**; se rechaza en runtime si aparece (`INVALID_STEP_SCHEMA: inputBindings_not_supported_in_v1`).
- Versionado de plan en runtime adapter: **reforzado** con rechazo explícito de `contractVersion` no soportada (`PLAN_CONTRACT_VERSION_UNKNOWN`).
- Prueba de crash recovery sin aserción concreta: **resuelto** con aserción directa de no duplicación por `idempotencyKey` tras restart de worker.

### Decisiones operativas explícitas

1. **Status canónico**
   - `getRunStatus` permanece ligado a Store como SoT.
   - Cualquier enriquecimiento de runtime es vía endpoint/método separado de best-effort (`enrichRunStatus`).

2. **Policy para `inputBindings` en v1**
   - Mientras no exista semántica completa planner+engine para bindings, v1 los rechaza en frontera activity.
   - Evita silent-ignore y resultados implícitos.

3. **Replay corpus (gate) — policy mínima obligatoria**
   - El corpus de histories se versiona y se considera artefacto de contrato.
   - Cada cambio de control-flow del workflow exige actualización del corpus en la misma PR.
   - El gate de replay debe fallar si hay drift entre workflow vigente y corpus comprometido.

4. **Outbox**
   - En este workspace el outbox ya existe y se mantiene activo; no hay bifurcación condicional de esquema en runtime.

### Evidencia de implementación en código (esta iteración)

- Rechazo de versiones de contrato no soportadas + hard-fail de `inputBindings`:
  - `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- Cobertura de tests de contrato/versionado + `inputBindings`:
  - `packages/@dvt/adapter-temporal/test/activities.test.ts`
- Cobertura de crash recovery con aserción explícita de unicidad de `idempotencyKey`:
  - `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
