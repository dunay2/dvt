import type { OutboxTickResult } from '@dvt/delivery';

import type { OutboxWorkerRuntimeLogger } from '../../runtime/OutboxWorkerRuntime.js';

import type {
  DeliveryFailureSignal,
  HealthSnapshot,
  OutboxRuntimeMetricsSnapshot,
  OutboxRuntimeState,
} from './model.js';
import { DEFAULT_READY_STALE_AFTER_MS } from './model.js';
import { toErrorMessage, toIso } from './support.js';

interface OutboxRuntimeHealthTrackerOptions {
  serviceName: string;
  logger: OutboxWorkerRuntimeLogger;
  nowMs?: () => number;
  readyStaleAfterMs?: number;
}

export class OutboxRuntimeHealthTracker {
  private readonly serviceName: string;
  private readonly logger: OutboxWorkerRuntimeLogger;
  private readonly nowMs: () => number;
  private readonly readyStaleAfterMs: number;

  private state: OutboxRuntimeState = 'starting';
  private owner = false;
  private runtimeErrorsTotal = 0;
  private startedAtMs: number | null = null;
  private lastTickAtMs: number | null = null;
  private lastErrorAtMs: number | null = null;
  private lastErrorMessage: string | null = null;

  constructor(options: OutboxRuntimeHealthTrackerOptions) {
    this.serviceName = options.serviceName;
    this.logger = options.logger;
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.readyStaleAfterMs = options.readyStaleAfterMs ?? DEFAULT_READY_STALE_AFTER_MS;
  }

  onStarted(): void {
    this.owner = true;
    this.startedAtMs ??= this.nowMs();
    this.transitionTo('starting', 'runtime bootstrapped');
  }

  onOwnershipAcquired(): void {
    this.owner = true;
  }

  onOwnershipLost(error?: unknown): void {
    this.owner = false;
    this.lastErrorMessage = error ? toErrorMessage(error) : 'outbox ownership lost';
    this.lastErrorAtMs = this.nowMs();
    this.transitionTo('failing', 'ownership lost');
  }

  onTick(result: OutboxTickResult, deliveryFailure: DeliveryFailureSignal | null): void {
    this.lastTickAtMs = this.nowMs();
    const hadDeliveryFailures = result.retriedCount > 0 || result.deadLetteredCount > 0;

    if (hadDeliveryFailures) {
      this.lastErrorMessage =
        deliveryFailure?.errorMessage ?? this.lastErrorMessage ?? 'outbox delivery failed';
      this.lastErrorAtMs =
        deliveryFailure?.errorAtMs ?? this.lastErrorAtMs ?? this.lastTickAtMs;
      this.transitionTo('failing', 'tick completed with delivery failures');
      return;
    }

    if (result.retryBacklogActive) {
      this.transitionTo('failing', 'retry backlog still pending');
      return;
    }

    this.lastErrorMessage = null;
    this.lastErrorAtMs = null;
    this.transitionTo(result.claimedCount > 0 ? 'draining' : 'idle', 'tick completed');
  }

  onRuntimeError(error: unknown): void {
    this.runtimeErrorsTotal += 1;
    this.lastErrorMessage = toErrorMessage(error);
    this.lastErrorAtMs = this.nowMs();
    this.transitionTo('failing', 'runtime error observed');
  }

  onStopped(): void {
    this.owner = false;
    this.transitionTo('stopped', 'runtime stopped');
  }

  onStopping(): void {
    this.transitionTo('stopping', 'shutdown requested');
  }

  enterPassiveMode(): void {
    this.owner = false;
    this.startedAtMs ??= this.nowMs();
    this.lastErrorMessage = null;
    this.lastErrorAtMs = null;
    this.transitionTo('passive', 'runtime ownership is passive');
  }

  getHealthSnapshot(): HealthSnapshot {
    const tickFresh = this.isTickFresh();
    return {
      ok: this.state !== 'stopped',
      ready: this.isReadyState() && tickFresh,
      state: this.state,
      owner: this.owner,
      service: this.serviceName,
      lastErrorMessage: this.lastErrorMessage,
      lastErrorAt: toIso(this.lastErrorAtMs),
      lastTickAt: toIso(this.lastTickAtMs),
      tickFresh,
    };
  }

  getMetricsSnapshot(): OutboxRuntimeMetricsSnapshot {
    return {
      state: this.state,
      owner: this.owner,
      ready: this.isReadyState() && this.isTickFresh(),
      tickFresh: this.isTickFresh(),
      startedAtMs: this.startedAtMs,
      lastTickAtMs: this.lastTickAtMs,
      lastErrorAtMs: this.lastErrorAtMs,
      runtimeErrorsTotal: this.runtimeErrorsTotal,
    };
  }

  private transitionTo(nextState: OutboxRuntimeState, reason: string): void {
    if (this.state === nextState) {
      return;
    }

    const previousState = this.state;
    this.state = nextState;
    this.logger.info(
      { from: previousState, to: nextState, reason },
      'outbox runtime state changed'
    );
  }

  private isReadyState(): boolean {
    return this.state === 'idle' || this.state === 'draining';
  }

  private isTickFresh(): boolean {
    if (this.lastTickAtMs === null) {
      return false;
    }

    return this.nowMs() - this.lastTickAtMs <= this.readyStaleAfterMs;
  }
}
