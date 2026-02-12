import type { EventEnvelope } from '../contracts/runEvents.js';

import type { IEventBus } from './types.js';

export class InMemoryEventBus implements IEventBus {
  public readonly published: EventEnvelope[] = [];

  async publish(events: EventEnvelope[]): Promise<void> {
    this.published.push(...events);
  }
}
