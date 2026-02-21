import type { RunEventPersisted } from '../contracts/runEvents.js';

import type { IEventBus } from './types.js';

export class InMemoryEventBus implements IEventBus {
  public readonly published: RunEventPersisted[] = [];

  async publish(events: RunEventPersisted[]): Promise<void> {
    this.published.push(...events);
  }
}
