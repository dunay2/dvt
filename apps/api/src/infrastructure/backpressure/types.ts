import type { BackpressureSnapshot, BackpressureStore } from '@dvt/delivery';

export type { BackpressureSnapshotSource } from '../../application/ports/IBackpressureCapacityTelemetry.js';

export interface BackpressureSnapshotEnvelope {
  readonly snapshot: BackpressureSnapshot;
  readonly capturedAtEpochMs: number;
  readonly source: BackpressureSnapshotSource;
}

export interface BackpressureSnapshotEnvelopeStore extends BackpressureStore {
  getTenantSnapshotEnvelope(tenantId: string): Promise<BackpressureSnapshotEnvelope>;
}

export interface PersistedBackpressureFallbackStore {
  read(tenantId: string): Promise<BackpressureSnapshotEnvelope | null>;
  write(tenantId: string, envelope: BackpressureSnapshotEnvelope): Promise<void>;
}
