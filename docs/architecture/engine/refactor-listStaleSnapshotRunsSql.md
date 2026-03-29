---
title: S19-F1 - Refactor de listStaleSnapshotRunsSql con run_event_heads
status: Draft
owner: Lane A / Anne
last_reviewed: 2026-03-29
---

# Objetivo

Eliminar el patrón correlacionado `LEFT JOIN LATERAL` de `listStaleSnapshotRunsSql` y reemplazarlo por un modelo de heads materializados (`run_event_heads`) mantenido en el mismo commit transaccional del append de eventos.

Este draft está alineado con:

- ADR-0004 (event log append-only, `runSeq` monotónico, replay determinista, tenant scope)
- ADR-0031 (aislamiento tenant en adapters)
- ADR-0039 (snapshot como read-model cache, no source of truth)
- Lane A `S19-F1` (Phase 1 heads + evidencia EXPLAIN bajo carga)

# Estado actual (problema real)

SQL actual:

```sql
SELECT m.run_id, m.tenant_id
FROM run_metadata m
LEFT JOIN run_snapshots s ON s.run_id = m.run_id
LEFT JOIN LATERAL (
  SELECT e.run_seq AS max_run_seq
  FROM run_events e
  WHERE e.run_id = m.run_id
    AND e.tenant_id = m.tenant_id
  ORDER BY e.run_seq DESC
  LIMIT 1
) le ON TRUE
WHERE s.run_id IS NULL
  OR s.last_run_seq < COALESCE(le.max_run_seq, 0)
ORDER BY m.created_at ASC
LIMIT $1
```

Problemas:

- El lookup correlacionado degrada con alta cardinalidad de runs.
- El worker de proyección paga costo de polling caro para descubrir trabajo.
- No existe un head explícito por run/tenant para observabilidad operativa.

# Invariantes (obligatorios)

1. `INV-S19-F1-001` - Source of truth  
   El estado autoritativo sigue siendo `run_events`; `run_event_heads` y `run_snapshots` son estructuras derivadas.

2. `INV-S19-F1-002` - Monotonía de head  
   `run_event_heads.latest_run_seq` nunca puede decrecer.

3. `INV-S19-F1-003` - Atomicidad de append  
   El append de `run_events` y el upsert de `run_event_heads` deben vivir en la misma transacción.

4. `INV-S19-F1-004` - Tenant scope  
   Toda query de staleness y reconciliación mantiene scope tenant-safe.

5. `INV-S19-F1-005` - No falso "fresh"  
   El sistema puede tolerar falsos positivos (rebuild redundante), pero no falsos negativos (run stale no detectado).

6. `INV-S19-F1-006` - Snapshot sigue siendo cache  
   Si snapshot/head divergen temporalmente, se prioriza replay desde eventos para reparar.

# Diseño propuesto (Phase 1)

## DDL

Nota de compatibilidad: el baseline actual usa `TEXT` y `INTEGER`; este draft mantiene esos tipos para evitar drift innecesario.

```sql
CREATE TABLE IF NOT EXISTS run_event_heads (
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  latest_run_seq INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (run_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS run_event_heads_tenant_updated_idx
  ON run_event_heads (tenant_id, updated_at DESC);
```

## Write path transaccional

```sql
INSERT INTO run_event_heads (run_id, tenant_id, latest_run_seq, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (run_id, tenant_id)
DO UPDATE
SET latest_run_seq = GREATEST(run_event_heads.latest_run_seq, EXCLUDED.latest_run_seq),
    updated_at = NOW();
```

Regla: este upsert ocurre en la misma transacción que persiste el evento con `run_seq = $3`.

## Read path (staleness)

```sql
SELECT m.run_id, m.tenant_id
FROM run_metadata m
LEFT JOIN run_snapshots s
  ON s.run_id = m.run_id
LEFT JOIN run_event_heads h
  ON h.run_id = m.run_id
 AND h.tenant_id = m.tenant_id
WHERE s.run_id IS NULL
   OR s.last_run_seq < COALESCE(h.latest_run_seq, 0)
ORDER BY m.created_at ASC
LIMIT $1;
```

# Plan de migración (realista y sin ventanas ciegas)

## Fase A - Expand

1. Crear tabla `run_event_heads` + índice.
2. Desplegar código con dual-write opcional (`run_events` + `run_event_heads`) detrás de flag.

## Fase B - Backfill consistente

- Capturar watermark de inicio (`max(persisted_at)` o equivalente de corte).
- Ejecutar backfill inicial:

```sql
INSERT INTO run_event_heads (run_id, tenant_id, latest_run_seq, updated_at)
SELECT e.run_id, e.tenant_id, MAX(e.run_seq), NOW()
FROM run_events e
GROUP BY e.run_id, e.tenant_id
ON CONFLICT (run_id, tenant_id)
DO UPDATE
SET latest_run_seq = GREATEST(run_event_heads.latest_run_seq, EXCLUDED.latest_run_seq),
    updated_at = NOW();
```

- Ejecutar reconciliación delta para eventos posteriores al watermark.
- Verificar paridad (`heads` vs `MAX(run_seq)` por run/tenant) con query de auditoría.

## Fase C - Cutover

1. Activar lectura de staleness por `run_event_heads`.
2. Mantener query anterior como fallback por ventana corta controlada.
3. Desactivar fallback tras validar métricas y paridad.

## Fase D - Contract

1. Remover SQL lateral y tests asociados al patrón.
2. Mantener job de reconciliación operativa periódica para detección temprana de drift.

# Riesgos y mitigaciones

- Riesgo: head faltante por fallo entre append y upsert.  
  Mitigación: atomicidad estricta en la misma tx + reconciliador periódico.

- Riesgo: drift por migración concurrente.  
  Mitigación: watermark + backfill + delta reconcile + auditoría de paridad.

- Riesgo: degradación por índices insuficientes.  
  Mitigación: EXPLAIN (ANALYZE, BUFFERS) obligatorio en carga objetivo.

- Riesgo: regresión tenant-scope.  
  Mitigación: tests negativos cross-tenant en query y rutas de mantenimiento.

# Matriz de tests (incluye negativos)

## Unit (SQL builder / adapter)

1. Genera SQL con join a `run_event_heads` y sin `LEFT JOIN LATERAL`.
2. Conserva límite y orden (`ORDER BY created_at`, `LIMIT $1`).
3. `batchSize` inválido sigue rechazando (`NaN`, negativo, decimal).

## Integration (Postgres real)

1. `listStaleSnapshotRuns` devuelve run sin snapshot.
2. Devuelve run con snapshot stale (`last_run_seq < latest_run_seq`).
3. No devuelve run fresh (`last_run_seq == latest_run_seq`).
4. Upsert concurrente de head no reduce `latest_run_seq`.

## Negative tests (obligatorios)

1. Cross-tenant isolation: un tenant no ve stale-runs de otro.
2. Out-of-order write attempt: no decrementa head.
3. Head missing + snapshot present: run se marca stale (no falso fresh).
4. Falla de tx en append: no persiste evento sin head ni head sin evento.
5. Batch size `0`: retorna vacío sin tocar DB (comportamiento actual).

## Performance / no-regression

1. Comparativa EXPLAIN entre SQL lateral vs SQL heads.
2. Validar objetivo `S19-F1`: carga de referencia 5000 runs concurrentes.
3. Publicar evidencia en closeout con plan, costos, filas y buffers.

# Criterios de aceptación

1. Se elimina el patrón correlacionado del SQL productivo.
2. Se cumplen invariantes `INV-S19-F1-*`.
3. Se entrega evidencia EXPLAIN bajo carga objetivo.
4. Se incluyen tests positivos y negativos descritos arriba.
5. Se define rollback operativo (reactivar query lateral temporalmente si falla cutover).

# Crítica Fowler (dura, técnica)

- El patrón actual no es "simple"; es deuda operacional pagada en cada ciclo del projector.
- Calcular el head por fila en polling continuo es costo estructural, no incidente puntual.
- Sin head materializado, la observabilidad de retraso del projector es opaca.
- Escala no se "optimiza después": se diseña con costos de lectura y mantenimiento explícitos.
- Mantener el lateral como camino principal tras `S19-F1` sería incumplir el objetivo del lane, no una decisión neutral.

# Fuera de alcance (Phase 2)

- Migrar de polling a cola push de invalidación de snapshots.
- Cambiar unicidad de `run_id` global o rediseñar `run_snapshots`.
- Alterar semántica de snapshot más allá del mecanismo de descubrimiento de stale runs.
