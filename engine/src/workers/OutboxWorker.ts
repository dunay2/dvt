/**
 * OutboxWorker - Outbox Delivery Worker
 * 
 * Implements the transactional outbox pattern for at-least-once event delivery
 * Based on ROADMAP.md - Anchor Decision: Outbox Semantics
 * 
 * Features:
 * - Poll loop: Query undelivered events every 100ms (configurable)
 * - Batch delivery: Up to 100 events per batch (configurable)
 * - Retry forever: Exponential backoff with max 30s delay
 * - Monitoring: Emit metrics (delivery_lag_seconds, delivery_rate)
 * - Circuit breaker: Alert if lag > 5s (configurable)
 * 
 * Note: This is a standalone worker, not a Temporal workflow.
 * Use of Date and setTimeout is intentional and safe here.
 * 
 * @see https://microservices.io/patterns/data/transactional-outbox.html
 */

/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable no-console */

import { IEventBus } from '../core/interfaces/IEventBus';
import { IOutboxStorage } from '../core/interfaces/IOutboxStorage';
import { OutboxEvent, OutboxWorkerConfig, OutboxMetrics } from '../core/types';

export class OutboxWorker {
  private readonly storage: IOutboxStorage;
  private readonly eventBus: IEventBus;
  private readonly config: Required<OutboxWorkerConfig>;
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private lastDeliveredCount = 0;
  private lastMetricsTime = Date.now();
  private circuitBreakerOpen = false;
  private lastCircuitBreakerCheck = 0;
  private readonly circuitBreakerCheckIntervalMs = 1000; // Check every 1s

  constructor(
    storage: IOutboxStorage,
    eventBus: IEventBus,
    config: OutboxWorkerConfig = {}
  ) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.config = {
      pollIntervalMs: config.pollIntervalMs ?? 100,
      batchSize: config.batchSize ?? 100,
      initialRetryDelayMs: config.initialRetryDelayMs ?? 100,
      maxRetryDelayMs: config.maxRetryDelayMs ?? 30000,
      circuitBreakerLagSeconds: config.circuitBreakerLagSeconds ?? 5,
      backoffMultiplier: config.backoffMultiplier ?? 2,
    };
  }

  /**
   * Start the outbox worker
   * Begins polling for undelivered events
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('OutboxWorker is already running');
    }

    this.running = true;
    this.consecutiveFailures = 0;
    this.lastDeliveredCount = 0;
    this.lastMetricsTime = Date.now();
    this.circuitBreakerOpen = false;

    // Start polling loop
    await this.schedulePoll();
  }

  /**
   * Stop the outbox worker
   * Stops polling for undelivered events
   */
  async stop(): Promise<void> {
    this.running = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Check if the worker is currently running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current metrics
   * 
   * Note: This method queries storage and should be called periodically (not on every poll)
   */
  async getMetrics(): Promise<OutboxMetrics> {
    // Pull one event to check lag and existence
    const undeliveredEvents = await this.storage.pullUndelivered(1);
    
    // For undeliveredCount, we only check if there are any undelivered events
    // A full count would require a separate query which could be expensive
    const undeliveredCount = undeliveredEvents.length;

    // Calculate delivery lag (oldest undelivered event age)
    let deliveryLagSeconds = 0;
    if (undeliveredEvents.length > 0) {
      const oldestEvent = undeliveredEvents[0];
      if (oldestEvent) {
        const ageMs = Date.now() - oldestEvent.createdAt.getTime();
        deliveryLagSeconds = ageMs / 1000;
      }
    }

    // Calculate delivery rate
    const now = Date.now();
    const timeSinceLastMetrics = (now - this.lastMetricsTime) / 1000;
    const deliveryRate =
      timeSinceLastMetrics > 0 ? this.lastDeliveredCount / timeSinceLastMetrics : 0;

    // Reset counters
    this.lastDeliveredCount = 0;
    this.lastMetricsTime = now;

    return {
      deliveryLagSeconds,
      deliveryRate,
      undeliveredCount,
      timestamp: new Date(),
    };
  }

  /**
   * Check circuit breaker status
   */
  isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerOpen;
  }

  /**
   * Schedule the next poll
   * Ensures polls don't overlap by only scheduling after current poll completes
   */
  private async schedulePoll(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Calculate delay based on consecutive failures (exponential backoff)
    const delay = this.calculateBackoffDelay();

    this.pollTimer = setTimeout(async () => {
      await this.poll();
      // Only schedule next poll after current poll completes
      await this.schedulePoll();
    }, delay);
  }

  /**
   * Calculate backoff delay based on consecutive failures
   */
  private calculateBackoffDelay(): number {
    if (this.consecutiveFailures === 0) {
      return this.config.pollIntervalMs;
    }

    // Exponential backoff: initialDelay * (multiplier ^ failures)
    const exponentialDelay =
      this.config.initialRetryDelayMs *
      Math.pow(this.config.backoffMultiplier, this.consecutiveFailures - 1);

    // Cap at max retry delay
    return Math.min(exponentialDelay, this.config.maxRetryDelayMs);
  }

  /**
   * Poll for undelivered events and attempt delivery
   */
  private async poll(): Promise<void> {
    try {
      // Check circuit breaker
      await this.checkCircuitBreaker();

      // Pull undelivered events
      const events = await this.storage.pullUndelivered(this.config.batchSize);

      if (events.length === 0) {
        // No events to deliver, reset consecutive failures
        this.consecutiveFailures = 0;
        return;
      }

      // Attempt to deliver batch
      await this.deliverBatch(events);

      // Reset consecutive failures on success
      this.consecutiveFailures = 0;
    } catch (error) {
      // Increment consecutive failures for backoff
      this.consecutiveFailures++;

      // Log error (in production, would use structured logging)
      console.error('OutboxWorker poll failed:', error);
    }
  }

  /**
   * Deliver a batch of events
   */
  private async deliverBatch(events: OutboxEvent[]): Promise<void> {
    let deliveredCount = 0;

    for (const event of events) {
      try {
        // Publish to event bus
        await this.eventBus.publish(event);

        // Mark as delivered
        await this.storage.markDelivered(event.eventId);

        deliveredCount++;
      } catch (error) {
        // Log individual event failure
        console.error(`Failed to deliver event ${event.eventId}:`, error);

        // Continue with next event (retry on next poll)
        // This provides at-least-once delivery semantics
      }
    }

    // Update metrics
    this.lastDeliveredCount += deliveredCount;
  }

  /**
   * Check circuit breaker and emit alerts if needed
   * Throttled to avoid excessive storage queries (checks at most once per second)
   */
  private async checkCircuitBreaker(): Promise<void> {
    const now = Date.now();
    
    // Throttle circuit breaker checks to once per second
    if (now - this.lastCircuitBreakerCheck < this.circuitBreakerCheckIntervalMs) {
      return;
    }
    
    this.lastCircuitBreakerCheck = now;
    
    const metrics = await this.getMetrics();

    const wasOpen = this.circuitBreakerOpen;
    this.circuitBreakerOpen =
      metrics.deliveryLagSeconds > this.config.circuitBreakerLagSeconds;

    // Emit alert when circuit breaker opens
    if (this.circuitBreakerOpen && !wasOpen) {
      console.warn(
        `Circuit breaker OPEN: delivery lag ${metrics.deliveryLagSeconds}s exceeds threshold ${this.config.circuitBreakerLagSeconds}s`
      );
      // In production, would emit to monitoring system (Prometheus, DataDog, etc.)
    }

    // Emit recovery when circuit breaker closes
    if (!this.circuitBreakerOpen && wasOpen) {
      console.info(
        `Circuit breaker CLOSED: delivery lag ${metrics.deliveryLagSeconds}s is below threshold ${this.config.circuitBreakerLagSeconds}s`
      );
    }
  }
}
