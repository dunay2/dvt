---
title: API tenant review
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-04-26
planning_type: review
---

## Review API Tenant - Validacion tecnica y plan de remediacion

Fecha de revision: 2026-04-26
Ultima actualizacion: 2026-04-26 (alineado con codigo tras remediacion QA)

### 1) Validacion de hallazgos (codigo vs documento)

#### H1 - `run_events` sin indice compuesto `(tenant_id, run_id)`

Estado: **RESUELTO - verificado en codigo**

Evidencia:

- `PostgresSchemaManager` incorpora `core_020_run_events_tenant_run_idx`.
- La migracion crea `run_events_tenant_run_id_idx ON run_events (tenant_id, run_id)`.

Conclusion:

- La inconsistencia de indices tenant-leading ya esta corregida.

#### H2 - `core_018`/`core_019` (y `003/004/005` en intent schema) generan SQL idempotente equivalente

Estado: **REAL - documentado y acotado**

Evidencia:

- Los steps siguen llamando a `buildTenantIsolationPolicySql(...)` con catalogo actual.
- Las descripciones de migracion ahora declaran explicitamente que son re-aplicaciones idempotentes y no snapshots historicos exactos.

Conclusion:

- El comportamiento sigue siendo idempotente y no historico por step.
- La deuda de trazabilidad queda mitigada en metadata y tests, no eliminada a nivel de modelo de migracion.

#### H3 - Rollback de `core_018`/`core_019` re-aplica hardening

Estado: **RESUELTO - semantica aclarada y fijada con test**

Evidencia:

- `rollbackDescription` deja claro que el rollback no degrada hardening.
- Existe test que verifica que el rollback de hardening re-aplica politica y no desactiva RLS.

Conclusion:

- El comportamiento sigue siendo no-downgrade por seguridad, pero ya no se presenta como una reversibilidad falsa.

#### H4 - Divergencia estructural en locks entre schema managers

Estado: **PARCIAL / CORREGIDO**

Evidencia:

- `PostgresSchemaManager` y `StartRunIntentSchemaManager` usan `pg_advisory_lock` + `pg_advisory_unlock` explicito.
- La diferencia real permanece en capacidades: `StartRunIntentSchemaManager` no expone rollback.

Conclusion:

- El problema de lock no era real como estaba redactado.
- La asimetria de rollback sigue siendo una mejora pendiente, no un bug activo.

#### H5 - Asimetria write/read en deduplicacion de eventos (`UNIQUE(run_id, idempotency_key)` vs lectura con tenant)

Estado: **RESUELTO - contrato formalizado**

Evidencia:

- ADR-0004 ahora declara explicitamente que `runId` es globalmente unico entre tenants.
- El constraint `(run_id, idempotency_key)` queda respaldado por esa invariante.

Conclusion:

- No se requiere cambiar el constraint.
- Solo queda registrar riesgo si algun dia cambiara el contrato global de IDs.

#### H6 - Duplicacion de `toSqlStringLiteral`

Estado: **RESUELTO - utilitario unificado**

Evidencia:

- `toSqlStringLiteral` vive en `sqlUtils.ts`.
- `StartRunIntentSchemaManager.ts` ya no mantiene una copia local.

Conclusion:

- Deuda de mantenibilidad eliminada.

#### H7 - Obligacion dual de migracion (`adapter.migrate()` + `intentStore.migrate()`)

Estado: **RESUELTO - helper adoptado en bootstraps reales**

Evidencia:

- Existe helper `migratePostgresRuntimeStores(...)`.
- `apps/api/src/runtime/intentReconcilerRuntime.ts` lo usa para migrar ambos stores en el orden correcto.
- `apps/api/src/modules/buildProtectedRuntimeModule.ts` lo usa en el `migrate()` del runtime protegido.
- Hay test que fija orden y fallo temprano si la migracion base falla.

Conclusion:

- La necesidad de dos rutas sigue existiendo architecturalmente.
- Los puntos de bootstrap reales del API ya no dependen de memoria manual del caller.

#### H8 - `table.name` sin `quoteIdentifier` en generacion de SQL de politicas RLS

Estado: **RESUELTO - verificado en codigo**

Evidencia:

- `PostgresTenantIsolationPolicy.ts` usa `quoteIdentifier(table.name)`.

Conclusion:

- Ya corregido. No requiere accion.

#### H9 - Grants de harness de prueba (over-grants)

Estado: **RESUELTO - verificado en codigo**

Evidencia:

- El harness usa grants declarativos least-privilege.
- `schema_migrations` no esta en la lista de escritura del app role.

Conclusion:

- No requiere accion.

#### H10 - Tests negativos de escritura DML sin contexto de tenant

Estado: **RESUELTO - verificado en codigo**

Evidencia:

- Existe test de rechazo de escritura sin contexto o con tenant mismatched.

Conclusion:

- No requiere accion.

---

### 2) Estado del plan de remediacion

## Fase 0 - Seguridad y rendimiento minimo

Estado actual: **resuelto**

1. `core_020` con indice `run_events (tenant_id, run_id)`: hecho.
2. Formalizacion de contrato en ADR-0004 para `runId` global: hecho.

## Fase 1 - Consistencia de contrato de eventos multi-tenant

Estado actual: **resuelto**

1. Se mantiene `UNIQUE (run_id, idempotency_key)`.
2. ADR-0004 declara la unicidad global de `runId`.
3. No se requiere migracion de constraint.

## Fase 2 - Trazabilidad de migraciones de hardening

Estado actual: **parcialmente resuelto**

1. Descripciones de migracion actualizadas para declarar idempotencia y falta de snapshot historico exacto: hecho.
2. `rollbackDescription` aclarado para no sugerir downgrade: hecho.
3. Test de regresion de rollback no-downgrade: hecho.

Pendiente residual:

- El modelo sigue siendo "ultima politica aplicada prevalece". Eso es una propiedad del enfoque, no un defecto operativo actual.

## Fase 3 - Operabilidad y arquitectura

Estado actual: **parcialmente resuelto**

1. Helper de bootstrap `migratePostgresRuntimeStores(...)`: hecho.
2. Unificacion de `toSqlStringLiteral`: hecho.

Pendiente residual:

- `StartRunIntentSchemaManager` sigue sin `rollbackTo`.
- Si se quiere reversibilidad operativa simetrica, eso requiere una decision adicional de producto/operacion.

---

### 3) Criterios de aceptacion

1. Rendimiento y consistencia:

- existe indice `(tenant_id, run_id)` en `run_events`: si.
- consultas tenant-scoped mantienen plan alineado con schema: si.
- nombres de tabla en SQL generado van citados: si.

1. Contrato multi-tenant:

- ADR-0004 declara explicitamente `runId` global: si.
- deduplicacion y lectura quedan consistentes con el contrato: si.

1. Gobernanza de migraciones:

- hardening declarado como idempotente y no historico por step: si.
- rollback no induce falsa reversibilidad: si.

1. Calidad de mantenimiento:

- sin duplicacion innecesaria de `toSqlStringLiteral`: si.
- helper para migracion conjunta disponible, adoptado y cubierto por tests: si.

---

### 4) Veredicto ejecutivo

El QA activo de este slice queda sustancialmente cerrado.

Lo unico que no se ha convertido en codigo es una mejora de operabilidad futura:

1. decidir si `StartRunIntentSchemaManager` necesita `rollbackTo` o si la postura oficial sera degradacion manual.

Fuera de eso, lo que quedaba como bug, inconsistencia o deuda inmediata ya esta remediado o acotado con contrato y tests.
