/**
 * @file packages/@dvt/engine/src/outbox/InMemoryEventBus.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The outbox event bus publishes persisted envelopes without reinterpreting domain semantics
 * @consequence Separation between event persistence and delivery to consumers is preserved
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { RunEventPersisted } from '../contracts/runEvents.js';
import type { IEventBus } from './types.js';
export declare class InMemoryEventBus implements IEventBus {
  readonly published: RunEventPersisted[];
  publish(events: RunEventPersisted[]): Promise<void>;
}
//# sourceMappingURL=InMemoryEventBus.d.ts.map
