import type { EventEnvelope as RunEventPersisted } from '@dvt/contracts';
import type { IEventBus } from '@dvt/delivery';

export interface LoggingEventBusLogger {
  info(data: Record<string, unknown>, msg?: string): void;
}

export class LoggingEventBus implements IEventBus {
  constructor(private readonly logger: LoggingEventBusLogger) {}

  async publish(events: RunEventPersisted[]): Promise<void> {
    for (const event of events) {
      this.logger.info(
        {
          eventId: event.eventId,
          eventType: event.eventType,
          runId: event.runId,
          runSeq: event.runSeq,
          tenantId: event.tenantId,
          projectId: event.projectId,
          environmentId: event.environmentId,
          idempotencyKey: event.idempotencyKey,
        },
        'outbox event published'
      );
    }
  }
}
