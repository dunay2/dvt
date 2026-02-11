/**
 * InMemoryStateStore - Mock implementation for testing
 *
 * Simple in-memory implementation of IOutboxStorage for unit tests
 * NOT for production use
 *
 * Note: Use of Date is intentional for testing infrastructure
 */

/* eslint-disable no-restricted-globals */

import { IOutboxStorage } from '../../core/interfaces/IOutboxStorage';
import { OutboxEvent } from '../../core/types';

export class InMemoryStateStore implements IOutboxStorage {
  private events: Map<string, OutboxEvent> = new Map();
  private idempotencyKeys: Set<string> = new Set();

  /**
   * Append an event to the outbox
   */
  async appendOutbox(event: OutboxEvent): Promise<void> {
    // Enforce idempotency - don't add duplicates
    if (this.idempotencyKeys.has(event.idempotencyKey)) {
      return;
    }

    if (this.events.has(event.eventId)) {
      return;
    }

    this.events.set(event.eventId, { ...event });
    this.idempotencyKeys.add(event.idempotencyKey);
  }

  /**
   * Mark an event as delivered
   */
  async markDelivered(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      event.deliveredAt = new Date();
      this.events.set(eventId, event);
    }
  }

  /**
   * Pull undelivered events from the outbox
   */
  async pullUndelivered(limit: number): Promise<OutboxEvent[]> {
    const undelivered = Array.from(this.events.values())
      .filter((event) => event.deliveredAt === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit)
      .map((event) => ({ ...event }));

    return undelivered;
  }

  /**
   * Get all events (for testing)
   */
  async getAllEvents(): Promise<OutboxEvent[]> {
    return Array.from(this.events.values()).map((event) => ({ ...event }));
  }

  /**
   * Get count of undelivered events (for testing)
   */
  async getUndeliveredCount(): Promise<number> {
    return this.countUndelivered();
  }

  /**
   * Get count of undelivered events (for testing)
   */
  async countUndelivered(): Promise<number> {
    let count = 0;
    for (const event of this.events.values()) {
      if (event.deliveredAt === null) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all events (for testing)
   */
  async clear(): Promise<void> {
    this.events.clear();
    this.idempotencyKeys.clear();
  }
}
