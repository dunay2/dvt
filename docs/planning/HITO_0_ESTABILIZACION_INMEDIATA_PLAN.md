---
title: Milestone 0 - Immediate Stabilization (Sprint 1-2)
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: proposal
---

---

title: Milestone 0 - Immediate Stabilization (Sprint 1-2)
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: proposal

---

# Milestone 0 - Immediate Stabilization (Sprint 1-2)

## Objetivo

Eliminar riesgos de daÃ±o irreversible en producciÃ³n (fuga cross-tenant, corrupciÃ³n silenciosa de ejecuciÃ³n y fractura contractual entre paquetes), con un gate tÃ©cnico explÃ­cito antes de pasar a refactors estructurales.

---

## Resoluciones base (antes de ejecutar)

## R1. Criterio de Track A vs Track B

Pregunta de clasificaciÃ³n Ãºnica:

> Â¿En el estado actual puede causar daÃ±o irreversible (dato incorrecto, leak de seguridad o corrupciÃ³n silenciosa)?

Si la respuesta es sÃ­ -> **Track A (P0)**. Si no -> **Track B (P1)**.

### Track A (P0, bloqueo de salida)

0. Recuperar salud del workspace (`@dvt/adapter-postgres`) para que el gate vuelva a ser confiable.
1. Todas las lecturas de state store tenant-scoped (evitar leak cross-tenant por `runId` conocido).
2. Persistencia de `gatewayDecisions` en `continueAsNew`.
3. `appendAndEnqueueTx` devolviendo `AppendResult` (no `void`).
4. UnificaciÃ³n efectiva de `IRunStateStore` (sin interfaces divergentes en consumo real).

### Track B (P1, tras gate)

1. `Zod` + `z.infer` para consolidaciÃ³n de tipos serializables.
2. Branded types en firmas internas para fortalecer compile-time.
3. Cleanup de ownership/movimiento de archivos.

### Gate obligatorio A -> B

`pnpm -r typecheck && pnpm -r test` en verde **y** Ã­tems de Track A cerrados con tests de regresiÃ³n.

**Regla de gobernanza operativa:** mientras el gate estÃ© rojo, cualquier trabajo de Track B se considera _out-of-order_ y no cierra el hito.

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

`Zod` vive donde hay validaciÃ³n de frontera:

- SÃ­: API, adapters, lectura/escritura red/disco y `@dvt/contracts/src/schemas`.
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

## DiseÃ±o objetivo mÃ­nimo (Hito 0)

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

> Punto crÃ­tico A2: `appendAndEnqueueTx` debe devolver `AppendResult` para preservar `runSeq`, deduplicaciÃ³n y avance del projector incremental.
>
> Requisito mÃ­nimo de consistencia/idempotencia:
>
> - Ã­ndice Ãºnico en persistencia para `(tenant_id, run_id, idempotency_key)`.
> - `AppendResult` expone secuencia mÃ¡xima transaccional (`lastSeq`) ademÃ¡s de `appended`/`deduped`.
> - `deduped` representa eventos rechazados por colisiÃ³n de idempotencia en el mismo `(tenant, run)`.

## 2) Tipos serializables en contracts

`@dvt/contracts` concentra IDs, envelopes, status, seÃ±ales y referencias serializables compartidas.

## 3) ExecutionPlan

Ownership objetivo: `@dvt/planner/src/contracts/ExecutionPlan.ts`.
Si el planner aÃºn no estÃ¡ operativo, ubicaciÃ³n temporal en contracts compartidos con ticket explÃ­cito de traslado.

---

## Plan de ejecuciÃ³n

## Sprint 1 â€” Track A (P0)

### A0. Restore workspace health (`@dvt/adapter-postgres`)

- Corregir desalineaciÃ³n TS/config contractual que hoy rompe `pnpm -r typecheck`.
- Alinear implementaciÃ³n con puerto canÃ³nico de `IRunStateStore`.
- Verificar ausencia de artefactos JS residuales en `src` que contaminen compilaciÃ³n/tests.

**DoD A0:** `@dvt/adapter-postgres` deja de bloquear el gate global.

### A1. UnificaciÃ³n funcional de IRunStateStore

- Elegir contrato efectivo de runtime (engine port).
- Eliminar divergencia de uso entre engine/adapters/consumidores.
- Mantener compatibilidad mediante wrappers temporales solo si son imprescindibles.
- Mientras Track B no propague branding end-to-end, permitir cast explÃ­cito en callers (`as RunId`, `as TenantId`) para cerrar compilaciÃ³n de Track A sin bloquear seguridad funcional.
- Regla MUST de confinamiento: casts branded permitidos solo en frontera/transitional (API/adapters), prohibidos en `engine/src/core`.
- AÃ±adir tripwire CI (grep/lint rule) que falle ante `as RunId`/`as TenantId` dentro de `engine/src/core`.

**DoD A1:** no hay llamadas de runtime a variantes incompatibles, y los callers compilan usando casts explÃ­citos solo donde aÃºn no se propagÃ³ branding.

### A2. `appendAndEnqueueTx` -> `AppendResult`

- Cambiar firma y propagaciÃ³n en engine + adapters.
- Ajustar projector/idempotency registry para usar `written/deduped` + `runSeq`.

**DoD A2:** tests de deduplicaciÃ³n y watermark en verde.

### A3. `listRuns` tenant-scoped obligatorio

- `tenantId` requerido en filter y rutas de listado.
- `tenantId` requerido tambiÃ©n en lecturas por `runId`: `getRunMetadataByRunId`, `getSnapshot`, `listEvents`.
- Invalidar llamadas sin tenant en compile-time.
- Test de no-fuga cross-tenant.

**DoD A3:** prueba explÃ­cita de leak inexistente en listados y lecturas directas por `runId`.

### A4. `gatewayDecisions` persistente en continueAsNew

- Extender input de workflow.
- Propagar mapa acumulado en cada `continueAsNew`.
- AÃ±adir test multi-capa con gateways.
- Requisito MUST: `gatewayDecisions` debe quedar reconstruible desde state store (evento append-only o snapshot derivado), sin depender de estado in-memory/provider.

**DoD A4:** no hay pÃ©rdida de decisiones tras rollover.

### Gate Sprint 1

- A0, A1, A2, A3 y A4 cerrados.
- `pnpm -r typecheck` verde.
- `pnpm -r test` verde.

---

## Sprint 2 â€” Track B (P1)

### B1. Zod + z.infer para serializables

- Crear/normalizar schemas en `@dvt/contracts/src/schemas`.
- Derivar tipos exclusivamente con `z.infer`.
- Aplicar parse en API/adapters, no en core.

### B2. Branded types end-to-end

- Sustituir `string` por `TenantId`/`RunId`/etc. en firmas internas prioritarias.
- AÃ±adir asserts runtime solo en fronteras externas.

### B3. Ownership cleanup controlado

- Mover tipos serializables compartidos a `@dvt/contracts`.
- Mover explÃ­citamente `WorkflowSnapshot` (hoy en `engine/src/contracts/runEvents.ts`) a `@dvt/contracts` para permitir que adapters externos implementen `IRunStateStore` sin dependencia circular.
- Mover puertos de comportamiento a `@dvt/engine/src/ports`.
- Mover `ExecutionPlan` al planner (o registrar deuda temporal si no aplica aÃºn).
- Eliminar `engine/src/contracts/types.ts` solo con 0 referencias.

### B4. Gobernanza ADR para Shared Kernel (R2)

- Crear `ADR-0018` (o update ADR existente) formalizando:
  - `@dvt/contracts` como shared kernel de tipos serializables.
  - puertos de comportamiento en paquete dueÃ±o de dominio (`@dvt/engine/src/ports`).
- Registrar consecuencias de migraciÃ³n (`IRunStateStore`, `IWorkflowEngine`, `IProviderAdapter`).

---

## Matriz de trabajo (Track)

| Ãtem                                            | Track | Motivo                                                  |
| ----------------------------------------------- | ----- | ------------------------------------------------------- |
| Lecturas state store sin `tenantId` obligatorio | A     | Riesgo activo de leak cross-tenant por `runId` conocido |
| `gatewayDecisions` perdido en `continueAsNew`   | A     | CorrupciÃ³n silenciosa del estado                       |
| `appendAndEnqueueTx` sin `AppendResult`         | A     | PÃ©rdida de `runSeq` Ãºtil para projector/watermark     |
| Divergencia de `IRunStateStore` en consumo real | A     | Fractura contractual con impacto runtime                |
| Zod + `z.infer`                                 | B     | Robustez de tipado, no corrupciÃ³n inmediata            |
| Branded types                                   | B     | Mejora compile-time                                     |
| Refactor ownership/estructura                   | B     | ReorganizaciÃ³n sin cambio funcional directo            |

---

## Riesgos y mitigaciÃ³n

1. **Borrado prematuro de tipos/archivos legacy**  
   MitigaciÃ³n: regla estricta â€œredirigir imports -> medir refs=0 -> eliminarâ€.

2. **RegresiÃ³n de idempotencia por cambio de firma**  
   MitigaciÃ³n: golden tests de `runSeq`, dedup y avance incremental.

3. **Introducir validaciones de formato disruptivas**  
   MitigaciÃ³n: en Hito 0 priorizar scope enforcement (`tenantId` requerido), no imponer formatos nuevos no ADR.

4. **No determinismo/corrupciÃ³n en workflows con gateway**  
   MitigaciÃ³n: test de regresiÃ³n especÃ­fico con rollover y capas distantes.

---

## Criterios de aceptaciÃ³n del Hito 0

1. Track A completo cerrado con tests.
2. `appendAndEnqueueTx` devuelve `AppendResult` y se usa en toda la cadena.
3. Lecturas y listados de state store exigen `tenantId` obligatorio.
4. `gatewayDecisions` se preserva tras `continueAsNew`.
5. No existe divergencia efectiva de `IRunStateStore` en runtime.
6. Gate tÃ©cnico superado: `pnpm -r typecheck && pnpm -r test` verde.

---

## Checklist ejecutable

### Checklist de resoluciÃ³n (esta iteraciÃ³n) â€” controlado por gate

#### 1) Track A Done (solo vÃ¡lido con gate global en verde)

- [x] A0 `@dvt/adapter-postgres` deja de bloquear `pnpm -r typecheck`.
- [x] A1 UnificaciÃ³n de `IRunStateStore` con regla de casts confinados + tripwire CI.
- [x] A2 `AppendResult` con semÃ¡ntica de dedupe y `lastSeq`.
- [x] A3 Tenant-scope obligatorio en listados y lecturas por `runId`.
- [x] A4 `gatewayDecisions` persistente y reconstruible provider-agnostic.

#### 2) Gate status

- [x] `pnpm -r typecheck && pnpm -r test` en verde (workspace completo).
- [x] `pnpm -r typecheck` en verde (incluyendo `@dvt/adapter-postgres`).
- [x] `pnpm -r test` en verde tras excluir `test/integration.time-skipping.test.ts` del script por limitaciÃ³n de permisos del servidor efÃ­mero Temporal en Windows (`os error 5`).

#### 3) Track B (solo tras gate verde)

- [x] B1 `Zod` + `z.infer` en serializables.
- [x] B2 branded types end-to-end sin casts en `engine/src/core`.
- [x] B3 ownership cleanup con borrado seguro.
- [x] B4 ADR-0018 formalizado y vigente.

#### 4) Work performed out-of-order (histÃ³rico, no cierre de hito)

- [x] `@dvt/engine` build en verde y estabilizaciÃ³n de `WorkflowSnapshot` vÃ­a shared contracts.
- [x] ADR-0018 creado y endurecido (dependency direction, versionado semÃ¡ntico, snapshots, puertos).
- [x] Cambios B1/B2/B3/B4 ejecutados fuera de orden de gate; revalidaciÃ³n final con gate global verde completada.

---

## Patch de cierre (hallazgos de contratos/operaciÃ³n)

### Estado consolidado

- `getRunStatus` **store-first**: resuelto y vigente (snapshot + replay fallback), sin dependencia del provider para el read path canÃ³nico.
- `eventsTail/getRunSnapshot` ambiguo: **no aplica** al contrato runtime actual; el puerto vigente usa `listEvents(..., { afterSeq, limit })` y `getSnapshot(...)`.
- Workflow `any` y `proxyActivities` no compilable: **resuelto** en adapter Temporal actual (tipado estricto y `proxyActivities<Activities>`).
- `inputBindings` definido pero no implementado: **resuelto por policy explÃ­cita v1**; se rechaza en runtime si aparece (`INVALID_STEP_SCHEMA: inputBindings_not_supported_in_v1`).
- Versionado de plan en runtime adapter: **reforzado** con rechazo explÃ­cito de `contractVersion` no soportada (`PLAN_CONTRACT_VERSION_UNKNOWN`).
- Prueba de crash recovery sin aserciÃ³n concreta: **resuelto** con aserciÃ³n directa de no duplicaciÃ³n por `idempotencyKey` tras restart de worker.

### Decisiones operativas explÃ­citas

1. **Status canÃ³nico**
   - `getRunStatus` permanece ligado a Store como SoT.
   - Cualquier enriquecimiento de runtime es vÃ­a endpoint/mÃ©todo separado de best-effort (`enrichRunStatus`).

2. **Policy para `inputBindings` en v1**
   - Mientras no exista semÃ¡ntica completa planner+engine para bindings, v1 los rechaza en frontera activity.
   - Evita silent-ignore y resultados implÃ­citos.

3. **Replay corpus (gate) â€” policy mÃ­nima obligatoria**
   - El corpus de histories se versiona y se considera artefacto de contrato.
   - Cada cambio de control-flow del workflow exige actualizaciÃ³n del corpus en la misma PR.
   - El gate de replay debe fallar si hay drift entre workflow vigente y corpus comprometido.

4. **Outbox**
   - En este workspace el outbox ya existe y se mantiene activo; no hay bifurcaciÃ³n condicional de esquema en runtime.

### Evidencia de implementaciÃ³n en cÃ³digo (esta iteraciÃ³n)

- Rechazo de versiones de contrato no soportadas + hard-fail de `inputBindings`:
  - `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- Cobertura de tests de contrato/versionado + `inputBindings`:
  - `packages/@dvt/adapter-temporal/test/activities.test.ts`
- Cobertura de crash recovery con aserciÃ³n explÃ­cita de unicidad de `idempotencyKey`:
  - `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
