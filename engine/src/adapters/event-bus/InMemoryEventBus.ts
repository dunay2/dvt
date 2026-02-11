/**
 * InMemoryEventBus - Mock implementation for testing
 *
 * Simple in-memory implementation of IEventBus for unit tests
 * NOT for production use
 */

/* eslint-disable @typescript-eslint/require-await */

import { IEventBus } from '../../core/interfaces/IEventBus';
import { OutboxEvent } from '../../core/types';

export class InMemoryEventBus implements IEventBus {
  private publishedEvents: OutboxEvent[] = [];
  private healthy = true;
  private shouldFail = false;
  private failureCount = 0;
  private maxFailures = 0;

  /**
   * Publish an event to the event bus
   */
  async publish(event: OutboxEvent): Promise<void> {
    if (!this.healthy) {
      throw new Error('Event bus is not healthy');
    }

    // Simulate controlled failures for testing
    if (this.shouldFail) {
      this.failureCount++;
      if (this.maxFailures === 0 || this.failureCount <= this.maxFailures) {
        throw new Error('Simulated publish failure');
      }
    }

    this.publishedEvents.push({ ...event });
  }

  /**
   * Check if the event bus is healthy
   */
  async isHealthy(): Promise<boolean> {
    return this.healthy;
  }

  /**
   * Get count of published events (for testing)
   */
  getPublishedCount(): number {
    return this.publishedEvents.length;
  }

  /**
   * Get all published events (for testing)
   */
  getPublishedEvents(): OutboxEvent[] {
    return [...this.publishedEvents];
  }

  /**
   * Set health status (for testing)
   */
  setHealthy(healthy: boolean): void {
    this.healthy = healthy;
  }

  /**
   * Simulate failures for testing
   *
   * @param maxFailures - Maximum number of failures to simulate (0 = fail forever)
   */
  simulateFailures(maxFailures = 0): void {
    this.shouldFail = true;
    this.maxFailures = maxFailures;
    this.failureCount = 0;
  }

  /**
   * Stop simulating failures
   */
  stopSimulatingFailures(): void {
    this.shouldFail = false;
    this.failureCount = 0;
    this.maxFailures = 0;
  }

  /**
   * Clear all published events (for testing)
   */
  clear(): void {
    this.publishedEvents = [];
  }
}
