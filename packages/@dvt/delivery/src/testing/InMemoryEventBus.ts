import type { EventEnvelope } from '@dvt/contracts';

import type { IEventBus } from '../contracts.js';

export class InMemoryEventBus implements IEventBus {
  public readonly published: EventEnvelope[] = [];

  async publish(events: EventEnvelope[]): Promise<void> {
    this.published.push(...events);
  }
}
