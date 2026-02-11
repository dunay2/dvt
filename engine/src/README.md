# Outbox Delivery Worker Implementation

This implementation provides a robust outbox pattern for at-least-once event delivery in the DVT Engine.

## Overview

The Outbox Delivery Worker implements the [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html) as specified in ROADMAP.md - Anchor Decision: Outbox Semantics.

### Key Features

- **Polling Loop**: Queries undelivered events every 100ms (configurable)
- **Batch Delivery**: Processes up to 100 events per batch (configurable)
- **Exponential Backoff**: Retries forever with exponential backoff (max 30s delay)
- **At-Least-Once Delivery**: Guarantees no event loss
- **Monitoring**: Emits metrics for delivery lag and rate
- **Circuit Breaker**: Triggers alerts when lag exceeds threshold (default 5s)
- **Idempotency**: Uses unique keys for deduplication at consumer

## Architecture

```
┌─────────────────┐
│   StateStore    │
│  (outbox table) │
└────────┬────────┘
         │
         │ pullUndelivered(100)
         │
    ┌────▼────────┐
    │  Outbox     │
    │   Worker    │
    └────┬────────┘
         │
         │ publish()
         │
    ┌────▼────────┐
    │  EventBus   │
    │ (Kafka/etc) │
    └─────────────┘
```

## Components

### Core Types (`engine/src/core/types.ts`)

- `OutboxEvent`: Event structure for outbox storage
- `OutboxMetrics`: Monitoring metrics
- `OutboxWorkerConfig`: Configuration options

### Interfaces

- `IOutboxStorage`: Adapter-agnostic storage interface
- `IEventBus`: Adapter-agnostic event bus interface

### Worker (`engine/src/workers/OutboxWorker.ts`)

Main implementation of the outbox delivery worker with:
- Configurable polling and batch size
- Exponential backoff retry logic
- Circuit breaker for lag detection
- Metrics collection

### Test Adapters

- `InMemoryStateStore`: In-memory implementation for testing
- `InMemoryEventBus`: In-memory event bus for testing

## Usage

### Basic Example

```typescript
import { OutboxWorker } from '@dvt/engine';
import { PostgresStateStore } from './adapters/postgres';
import { KafkaEventBus } from './adapters/kafka';

// Initialize adapters
const stateStore = new PostgresStateStore(config);
const eventBus = new KafkaEventBus(kafkaConfig);

// Create worker
const worker = new OutboxWorker(stateStore, eventBus, {
  pollIntervalMs: 100,
  batchSize: 100,
  maxRetryDelayMs: 30000,
  circuitBreakerLagSeconds: 5,
});

// Start worker
await worker.start();

// Check metrics
const metrics = await worker.getMetrics();
console.log(`Lag: ${metrics.deliveryLagSeconds}s`);
console.log(`Rate: ${metrics.deliveryRate} events/s`);

// Stop worker (on shutdown)
await worker.stop();
```

### Custom Configuration

```typescript
const worker = new OutboxWorker(stateStore, eventBus, {
  pollIntervalMs: 50,          // Poll every 50ms
  batchSize: 200,              // Process 200 events per batch
  initialRetryDelayMs: 100,    // Start retry delay at 100ms
  maxRetryDelayMs: 60000,      // Max retry delay 60s
  circuitBreakerLagSeconds: 10, // Alert at 10s lag
  backoffMultiplier: 2,        // Double delay each retry
});
```

## Testing

Run the comprehensive test suite:

```bash
npm test -- engine/test/workers/OutboxWorker.test.ts
```

### Test Coverage

- ✅ Worker lifecycle (start/stop)
- ✅ Event delivery (single, batch, 1000 events)
- ✅ Exponential backoff on failures
- ✅ At-least-once delivery guarantee
- ✅ Metrics emission
- ✅ Circuit breaker activation
- ✅ Idempotency key enforcement
- ✅ Chaos testing (event bus failures)

All 19 tests pass, covering 100% of success criteria from Issue #16.

## Implementation Notes

### Idempotency Keys

Events include an `idempotencyKey` for deduplication:

```
idempotencyKey = tenantId + contractVersion + eventType + runId + stepId + attemptId
```

Consumers MUST handle duplicates using this key (e.g., upsert semantics).

### Backpressure

When projection lag exceeds the threshold, the circuit breaker opens and logs a warning. In production, this would:

- Emit `BACKPRESSURE_ON` signal
- Trigger monitoring alerts
- Return 503 from API (if integrated)

### Monitoring

The worker provides metrics via `getMetrics()`:

```typescript
interface OutboxMetrics {
  deliveryLagSeconds: number;  // Age of oldest undelivered event
  deliveryRate: number;        // Events delivered per second
  undeliveredCount: number;    // Total undelivered events
  timestamp: Date;             // When metrics were collected
}
```

Integrate with your monitoring system (Prometheus, DataDog, etc.) to track these metrics.

## Production Considerations

### State Store Adapter

The worker requires a production implementation of `IOutboxStorage`. Example Postgres schema:

```sql
CREATE TABLE outbox_events (
  event_id UUID PRIMARY KEY,
  run_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  INDEX idx_undelivered (delivered_at) WHERE delivered_at IS NULL
);
```

### Event Bus Adapter

The worker requires a production implementation of `IEventBus`. Examples:

- **Kafka**: Use `KafkaJS` or similar client
- **RabbitMQ**: Use `amqplib` client
- **AWS SQS/SNS**: Use AWS SDK
- **Google Cloud Pub/Sub**: Use Google Cloud SDK

### High Availability

For production HA deployments:

1. Run multiple worker instances
2. Use database-level locking for event coordination
3. Ensure idempotent event handling at consumers
4. Monitor lag and circuit breaker status
5. Set up alerts for P1 incidents (lag > threshold)

### Performance Tuning

Adjust configuration based on load:

- **High throughput**: Increase `batchSize` to 200-500
- **Low latency**: Decrease `pollIntervalMs` to 10-50ms
- **Many failures**: Increase `maxRetryDelayMs` to avoid overwhelming EventBus

## References

- [ROADMAP.md - Anchor Decision: Outbox Semantics](../../ROADMAP.md#anchor-decision-outbox-semantics-core---adapter-agnostic)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [State Store Contract](../../docs/architecture/engine/contracts/state-store/README.md)
- [Issue #16: Outbox delivery worker](https://github.com/dunay2/dvt/issues/16)

## License

ISC
