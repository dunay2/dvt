Recomendaciones Adicionales para la Implementación

1. Manejo de Errores en appendEventsTx
   Añadir manejo específico para conflictos de idempotencia:

typescript
try {
await client.query(SQL.insertRunEvents, [...]);
} catch (err: any) {
if (err.code === '23505' && err.constraint === 'run_events_idempotency_key_ux') {
// Si es duplicado por idempotency_key, buscar el evento existente
const existing = await client.query(
'SELECT run_seq FROM run_events WHERE idempotency_key = $1',
[env.idempotencyKey]
);
// Retornar resultado existente en lugar de fallar
return mapToAppendEventsResult(existing.rows[0]);
}
throw err;
} 2. Timeouts y Circuit Breakers
Para el worker de outbox, considerar añadir timeouts:

typescript
private async publishWithTimeout(msg: OutboxMessage, timeoutMs = 5000): Promise<void> {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
await Promise.race([
this.bus.publish(msg.topic, msg.orderingKey, msg.payload),
new Promise((_, reject) =>
controller.signal.addEventListener('abort', () =>
reject(new Error('Publish timeout'))
)
)
]);
} finally {
clearTimeout(timeout);
}
} 3. Métricas y Observabilidad
Añadir métricas Prometheus (o similar) para monitoreo:

typescript
// En PostgresRunStateStore
async appendEventsTx(cmd: AppendEventsCmd): Promise<AppendEventsResult> {
const start = Date.now();
try {
const result = await this.appendEventsTxWithClient(client, cmd);
metrics.recordAppendEventsLatency(Date.now() - start);
metrics.recordEventsAppended(cmd.events.length);
return result;
} catch (err) {
metrics.recordAppendEventsError();
throw err;
}
}

// En OutboxPublisherWorker
private async publishOne(msg: OutboxMessage): Promise<void> {
metrics.recordPublishAttempt(msg.topic);
// ... existing code
metrics.recordPublishSuccess(msg.topic);
} 4. Testing de Concurrencia
Para probar el optimistic concurrency control:

typescript
test('concurrent appends with same expectedRunSeq fail gracefully', async () => {
const runId = await createTestRun();

// Dos operaciones concurrentes
const [res1, res2] = await Promise.allSettled([
store.appendEventsTx({ runId, expectedRunSeq: 0, events: [event1] }),
store.appendEventsTx({ runId, expectedRunSeq: 0, events: [event2] })
]);

// Una debe funcionar, la otra debe fallar con OCC error
expect(res1.status).toBe('fulfilled');
expect(res2.status).toBe('rejected');
expect(res2.reason).toBeInstanceOf(OptimisticConcurrencyError);
});
