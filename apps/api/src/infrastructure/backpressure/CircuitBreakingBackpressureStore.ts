import type {
  BackpressureSnapshotEnvelope,
  BackpressureSnapshotEnvelopeStore,
  PersistedBackpressureFallbackStore,
} from './types.js';

type CircuitState = 'closed' | 'open' | 'half_open';

export class CircuitBreakingBackpressureStore implements BackpressureSnapshotEnvelopeStore {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openUntilEpochMs = 0;
  private halfOpenProbeInFlight = false;

  public constructor(
    private readonly deps: {
      readonly delegate: BackpressureSnapshotEnvelopeStore;
      readonly fallbackStore: PersistedBackpressureFallbackStore;
      readonly failureThreshold: number;
      readonly openDurationMs: number;
      readonly snapshotMaxAgeMs: number;
      readonly nowEpochMs?: () => number;
    }
  ) {}

  public async getTenantSnapshot(tenantId: string) {
    return (await this.getTenantSnapshotEnvelope(tenantId)).snapshot;
  }

  public async getTenantSnapshotEnvelope(tenantId: string): Promise<BackpressureSnapshotEnvelope> {
    const nowEpochMs = this.nowEpochMs();
    if (this.state === 'open') {
      if (nowEpochMs < this.openUntilEpochMs) {
        return this.getFreshFallbackOrThrow(tenantId);
      }

      if (this.halfOpenProbeInFlight) {
        return this.getFreshFallbackOrThrow(tenantId);
      }

      this.state = 'half_open';
      this.halfOpenProbeInFlight = true;
      try {
        const envelope = await this.deps.delegate.getTenantSnapshotEnvelope(tenantId);
        this.resetCircuit();
        await this.persistFallback(tenantId, envelope);
        return envelope;
      } catch (error) {
        this.tripCircuit(nowEpochMs);
        return this.getFreshFallbackOrThrow(tenantId, error);
      } finally {
        this.halfOpenProbeInFlight = false;
      }
    }

    if (this.state === 'half_open') {
      return this.getFreshFallbackOrThrow(tenantId);
    }

    try {
      const envelope = await this.deps.delegate.getTenantSnapshotEnvelope(tenantId);
      this.resetCircuit();
      await this.persistFallback(tenantId, envelope);
      return envelope;
    } catch (error) {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= this.deps.failureThreshold) {
        this.tripCircuit(nowEpochMs);
      }
      return this.getFreshFallbackOrThrow(tenantId, error);
    }
  }

  public getCircuitState(): CircuitState {
    return this.state;
  }

  private async getFreshFallbackOrThrow(
    tenantId: string,
    cause?: unknown
  ): Promise<BackpressureSnapshotEnvelope> {
    try {
      const fallback = await this.deps.fallbackStore.read(tenantId);
      if (
        fallback &&
        this.nowEpochMs() - fallback.capturedAtEpochMs <= this.deps.snapshotMaxAgeMs
      ) {
        return {
          snapshot: fallback.snapshot,
          capturedAtEpochMs: fallback.capturedAtEpochMs,
          source: 'fallback',
        };
      }
    } catch {
      // Fallback persistence is advisory. If it cannot be read, fail closed below.
    }

    throw new Error('Backpressure snapshot unavailable', { cause });
  }

  private async persistFallback(
    tenantId: string,
    envelope: BackpressureSnapshotEnvelope
  ): Promise<void> {
    if (envelope.source === 'fallback') {
      return;
    }

    try {
      await this.deps.fallbackStore.write(tenantId, envelope);
    } catch {
      // Fallback persistence is advisory and must not break live admission.
    }
  }

  private tripCircuit(nowEpochMs: number): void {
    this.state = 'open';
    this.openUntilEpochMs = nowEpochMs + this.deps.openDurationMs;
  }

  private resetCircuit(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.openUntilEpochMs = 0;
  }

  private nowEpochMs(): number {
    return this.deps.nowEpochMs?.() ?? Date.now();
  }
}
