/**
 * IEventBus Interface
 *
 * Adapter-agnostic interface for event bus publishers
 * Based on ROADMAP.md - Anchor Decision: Outbox Semantics
 *
 * Supports integration with Kafka, RabbitMQ, or other message brokers
 * Consumers receive events via this bus and must implement idempotent handling
 */

import { OutboxEvent } from '../types';

export interface IEventBus {
  /**
   * Publish an event to the event bus
   *
   * @param event - The event to publish
   * @returns Promise that resolves when event is published
   * @throws Error if publishing fails
   */
  publish(event: OutboxEvent): Promise<void>;

  /**
   * Check if the event bus is available/healthy
   *
   * @returns Promise resolving to true if healthy, false otherwise
   */
  isHealthy(): Promise<boolean>;
}
