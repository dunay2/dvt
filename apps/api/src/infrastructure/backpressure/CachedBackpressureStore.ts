import type { BackpressureSnapshotEnvelope, BackpressureSnapshotEnvelopeStore } from './types.js';

type CacheEntry = {
  readonly envelope: BackpressureSnapshotEnvelope;
  readonly expiresAtEpochMs: number;
};

export class CachedBackpressureStore implements BackpressureSnapshotEnvelopeStore {
  private readonly cache = new Map<string, CacheEntry>();

  public constructor(
    private readonly deps: {
      readonly delegate: BackpressureSnapshotEnvelopeStore;
      readonly ttlMs: number;
      readonly nowEpochMs?: () => number;
    }
  ) {}

  public async getTenantSnapshot(tenantId: string) {
    return (await this.getTenantSnapshotEnvelope(tenantId)).snapshot;
  }

  public async getTenantSnapshotEnvelope(tenantId: string): Promise<BackpressureSnapshotEnvelope> {
    const nowEpochMs = this.nowEpochMs();
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAtEpochMs > nowEpochMs) {
      return {
        snapshot: cached.envelope.snapshot,
        capturedAtEpochMs: cached.envelope.capturedAtEpochMs,
        source: 'cache',
      };
    }

    const envelope = await this.deps.delegate.getTenantSnapshotEnvelope(tenantId);
    if (envelope.source !== 'fallback') {
      this.cache.set(tenantId, {
        envelope,
        expiresAtEpochMs: nowEpochMs + this.deps.ttlMs,
      });
    }
    return envelope;
  }

  private nowEpochMs(): number {
    return this.deps.nowEpochMs?.() ?? Date.now();
  }
}
