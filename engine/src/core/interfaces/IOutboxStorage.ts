/**
 * IOutboxStorage Interface
 *
 * Adapter-agnostic interface for outbox event storage
 * Based on ROADMAP.md - Anchor Decision: Outbox Semantics
 *
 * All outbox implementations must support:
 * - Transactional append with state change (consistency)
 * - Idempotent markDelivered (can safely retry)
 * - Consistent read for pullUndelivered (no duplicates within batch)
 */

import { OutboxEvent } from '../types';

export interface IOutboxStorage {
  /**
   * Append an event to the outbox
   * Must be transactional with state change for consistency
   *
   * @param event - The outbox event to append
   * @returns Promise that resolves when event is persisted
   */
  appendOutbox(event: OutboxEvent): Promise<void>;

  /**
   * Mark an event as delivered
   * Must be idempotent (can safely retry)
   *
   * @param eventId - The ID of the event to mark as delivered
   * @returns Promise that resolves when event is marked
   */
  markDelivered(eventId: string): Promise<void>;

  /**
   * Pull undelivered events from the outbox
   * Must provide consistent read (no duplicates within batch)
   *
   * @param limit - Maximum number of events to retrieve
   * @returns Promise resolving to array of undelivered events
   */
  pullUndelivered(limit: number): Promise<OutboxEvent[]>;

  /**
   * Count undelivered events in the outbox
   *
   * @returns Promise resolving to total undelivered events
   */
  countUndelivered(): Promise<number>;
}
