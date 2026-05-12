/**
 * @ownedConcern Protect provider adapter calls with engine-owned circuit-breaker posture.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Decorate IProviderAdapter calls at the engine outbound boundary so provider outages fail fast.
 * @consequence Runtime safety is centralized without changing provider adapter semantics.
 * @version 1.0.0
 * @date 2026-05-12
 */
import type {
  EngineRunRef,
  PlanRef,
  ProviderRunStatusView,
  ResolvedRunContext,
  SignalRequest,
  SignalSemanticsVersion,
} from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import { toErrorMessage } from '../utils/errorUtils.js';

import type { IProviderAdapter } from './IProviderAdapter.js';

export type AdapterCircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface AdapterCircuitBreakerSnapshot {
  provider: EngineRunRef['provider'];
  state: AdapterCircuitBreakerState;
  failureCount: number;
  openedAtEpochMs?: number;
  retryAtEpochMs?: number;
  lastFailureMessage?: string;
  lastOperation?: AdapterCircuitBreakerOperation;
}

export type AdapterCircuitBreakerOperation =
  | 'startRun'
  | 'cancelRun'
  | 'signal'
  | 'getProviderStatusView'
  | 'lookupRunRef';

export interface AdapterCircuitBreakerOptions {
  failureThreshold?: number;
  openStateMs?: number;
  nowMs?: () => number;
  observability?: IObservability;
}

export class AdapterCircuitOpenError extends Error {
  constructor(
    readonly provider: EngineRunRef['provider'],
    readonly operation: AdapterCircuitBreakerOperation,
    readonly retryAtEpochMs: number | undefined
  ) {
    super(
      retryAtEpochMs === undefined
        ? `Adapter circuit is open for ${provider}.${operation}`
        : `Adapter circuit is open for ${provider}.${operation} until ${retryAtEpochMs}`
    );
    this.name = 'AdapterCircuitOpenError';
  }
}

const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_OPEN_STATE_MS = 30_000;
const STATE_METRIC = 'dvt.engine.adapter_circuit_breaker.state';
const FAIL_FAST_METRIC = 'dvt.engine.adapter_circuit_breaker.fail_fast_total';
const TRANSITION_METRIC = 'dvt.engine.adapter_circuit_breaker.transition_total';

const snapshots = new WeakMap<IProviderAdapter, () => AdapterCircuitBreakerSnapshot>();

export class CircuitBreakingProviderAdapter implements IProviderAdapter {
  readonly provider: EngineRunRef['provider'];
  readonly ping?: () => Promise<void>;
  readonly estimateRunRef?: (ctx: ResolvedRunContext) => EngineRunRef;
  readonly capabilities?: () => readonly string[];
  readonly lookupRunRef?: (runId: string, tenantId: string) => Promise<EngineRunRef | null>;

  private state: AdapterCircuitBreakerState = 'closed';
  private failureCount = 0;
  private openedAtEpochMs: number | undefined;
  private retryAtEpochMs: number | undefined;
  private lastFailureMessage: string | undefined;
  private lastOperation: AdapterCircuitBreakerOperation | undefined;
  private readonly failureThreshold: number;
  private readonly openStateMs: number;
  private readonly nowMs: () => number;
  private readonly observability: IObservability | undefined;

  constructor(
    private readonly delegate: IProviderAdapter,
    options: AdapterCircuitBreakerOptions = {}
  ) {
    this.provider = delegate.provider;
    this.failureThreshold = Math.max(1, options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD);
    this.openStateMs = Math.max(1, options.openStateMs ?? DEFAULT_OPEN_STATE_MS);
    this.nowMs = options.nowMs ?? (() => 0);
    this.observability = options.observability;
    if (delegate.ping) this.ping = () => delegate.ping!();
    if (delegate.estimateRunRef) this.estimateRunRef = (ctx) => delegate.estimateRunRef!(ctx);
    if (delegate.capabilities) this.capabilities = () => delegate.capabilities!();
    if (delegate.lookupRunRef) {
      this.lookupRunRef = (runId, tenantId) =>
        this.executeProtected('lookupRunRef', () => delegate.lookupRunRef!(runId, tenantId));
    }
    snapshots.set(this, () => this.snapshot());
    this.emitStateGauge();
  }

  startRun(planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef> {
    return this.executeProtected('startRun', () => this.delegate.startRun(planRef, ctx));
  }

  cancelRun(runRef: EngineRunRef): Promise<void> {
    return this.executeProtected('cancelRun', () => this.delegate.cancelRun(runRef));
  }

  getProviderStatusView(runRef: EngineRunRef): Promise<ProviderRunStatusView> {
    return this.executeProtected('getProviderStatusView', () =>
      this.delegate.getProviderStatusView(runRef)
    );
  }

  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void> {
    return this.executeProtected('signal', () => this.delegate.signal(runRef, request));
  }

  signalSemanticsVersions(): readonly SignalSemanticsVersion[] {
    return this.delegate.signalSemanticsVersions();
  }

  private async executeProtected<T>(
    operation: AdapterCircuitBreakerOperation,
    invoke: () => Promise<T>
  ): Promise<T> {
    this.beforeCall(operation);
    try {
      const result = await invoke();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(operation, error);
      throw error;
    }
  }

  private beforeCall(operation: AdapterCircuitBreakerOperation): void {
    const now = this.nowMs();
    if (this.state !== 'open') return;

    if (this.retryAtEpochMs !== undefined && now >= this.retryAtEpochMs) {
      this.transitionTo('half_open');
      return;
    }

    this.lastOperation = operation;
    this.emitFailFast(operation);
    throw new AdapterCircuitOpenError(this.provider, operation, this.retryAtEpochMs);
  }

  private recordSuccess(): void {
    if (this.state === 'closed' && this.failureCount === 0) {
      return;
    }

    this.failureCount = 0;
    this.openedAtEpochMs = undefined;
    this.retryAtEpochMs = undefined;
    this.lastFailureMessage = undefined;
    this.transitionTo('closed');
  }

  private recordFailure(operation: AdapterCircuitBreakerOperation, error: unknown): void {
    this.lastOperation = operation;
    this.lastFailureMessage = toErrorMessage(error);
    this.failureCount = this.state === 'half_open' ? this.failureThreshold : this.failureCount + 1;

    if (this.state === 'half_open' || this.failureCount >= this.failureThreshold) {
      this.open();
      return;
    }

    this.emitStateGauge();
  }

  private open(): void {
    const now = this.nowMs();
    this.openedAtEpochMs = now;
    this.retryAtEpochMs = now + this.openStateMs;
    this.transitionTo('open');
  }

  private transitionTo(next: AdapterCircuitBreakerState): void {
    const previous = this.state;
    this.state = next;
    this.emitStateGauge();
    if (previous !== next) {
      this.emitTransition(previous, next);
    }
  }

  private snapshot(): AdapterCircuitBreakerSnapshot {
    const snapshot: AdapterCircuitBreakerSnapshot = {
      provider: this.provider,
      state: this.state,
      failureCount: this.failureCount,
    };
    if (this.openedAtEpochMs !== undefined) snapshot.openedAtEpochMs = this.openedAtEpochMs;
    if (this.retryAtEpochMs !== undefined) snapshot.retryAtEpochMs = this.retryAtEpochMs;
    if (this.lastFailureMessage !== undefined)
      snapshot.lastFailureMessage = this.lastFailureMessage;
    if (this.lastOperation !== undefined) snapshot.lastOperation = this.lastOperation;
    return snapshot;
  }

  private emitStateGauge(): void {
    this.safeMetric(() => {
      this.observability?.metrics
        .gauge(STATE_METRIC, { provider: this.provider, state: this.state })
        .set(1);
    });
  }

  private emitFailFast(operation: AdapterCircuitBreakerOperation): void {
    this.safeMetric(() => {
      this.observability?.metrics
        .counter(FAIL_FAST_METRIC, {
          provider: this.provider,
          operation,
          state: this.state,
        })
        .add(1);
    });
  }

  private emitTransition(
    previous: AdapterCircuitBreakerState,
    next: AdapterCircuitBreakerState
  ): void {
    this.safeMetric(() => {
      this.observability?.metrics
        .counter(TRANSITION_METRIC, {
          provider: this.provider,
          from: previous,
          to: next,
        })
        .add(1);
    });
  }

  private safeMetric(emit: () => void): void {
    try {
      emit();
    } catch {
      // Observability must not change adapter call behavior.
    }
  }
}

export function buildCircuitBreakingAdapterRegistry(
  adapters: ReadonlyMap<EngineRunRef['provider'], IProviderAdapter>,
  options: AdapterCircuitBreakerOptions = {}
): Map<EngineRunRef['provider'], IProviderAdapter> {
  const protectedAdapters = new Map<EngineRunRef['provider'], IProviderAdapter>();
  for (const [provider, adapter] of adapters) {
    protectedAdapters.set(
      provider,
      getAdapterCircuitBreakerSnapshot(adapter)
        ? adapter
        : new CircuitBreakingProviderAdapter(adapter, options)
    );
  }
  return protectedAdapters;
}

export function getAdapterCircuitBreakerSnapshot(
  adapter: IProviderAdapter | undefined
): AdapterCircuitBreakerSnapshot | undefined {
  if (!adapter) return undefined;
  return snapshots.get(adapter)?.();
}
