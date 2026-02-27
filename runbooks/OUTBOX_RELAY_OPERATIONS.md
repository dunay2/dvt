# Runbook — Outbox Relay (polling + retry/backoff + DLQ + replay)

## Objetivo

Operar el relay de outbox en modo polling con semántica at-least-once, aplicar retry con backoff, gestionar DLQ y ejecutar replay manual de eventos fallidos.

## Alcance

- Worker de relay: [`OutboxWorker`](../packages/@dvt/engine/src/outbox/OutboxWorker.ts)
- Storage (Postgres): [`PostgresStateStoreAdapter`](../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
- Storage (in-memory): [`InMemoryOutboxStorage`](../packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts)

## Comportamiento operativo esperado

1. **Drain**
   - El worker hace polling de `listPending(batchSize)` y publica en bus.
   - En éxito, marca `markDelivered([id])`.

2. **Fallo y retry**
   - En fallo de publicación, marca `markFailed(id, error)`.
   - El registro queda reintentable a partir de `nextAttemptAt`.
   - Backoff exponencial, con tope de 60s.

3. **DLQ**
   - Al superar `MAX_OUTBOX_ATTEMPTS` el registro se mueve a `outbox_dead_letter`.

4. **Replay manual**
   - Operación: `replayDeadLetters({ limit?, runId?, ids? })`.
   - Mueve registros de DLQ a outbox pending reseteando intentos.

## Procedimiento de replay manual

1. Identificar registros DLQ por `runId` o `id`.
2. Ejecutar replay acotado (`limit` + filtro por `runId`/`ids`).
3. Confirmar:
   - DLQ decrece.
   - Pending aumenta.
   - Worker drena y marca delivered.

## Señales de salud

- `listPending(limit)` no crece indefinidamente.
- `listDeadLetter(limit)` estable o decreciente tras replay.
- Errores repetidos del bus activan investigación de downstream.

## Fallos comunes

- **Bus caído**: pending crece, attempts incrementa, DLQ aumenta.
- **Postgres no disponible**: no hay claim ni delivered; revisar conectividad.
- **Replay sin filtros**: riesgo operativo; usar siempre `limit` y scope.

## Verificación recomendada

- Engine tests (incluye OutboxWorker):
  - `pnpm --filter @dvt/engine test`
- Adapter Postgres tests:
  - `pnpm --filter @dvt/adapter-postgres test`
  - `DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres test` (si existe Postgres local)
