import type { EventEnvelope, IEventBus } from '@dvt/contracts';

export class InMemoryEventBus implements IEventBus {
  public readonly published: EventEnvelope[] = [];

  async publish(events: EventEnvelope[]): Promise<void> {
    this.published.push(...events);
  }
}
