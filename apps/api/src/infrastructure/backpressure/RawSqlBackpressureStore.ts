import type { PostgresBackpressureSnapshotReader } from '@dvt/adapter-postgres';
import type { BackpressureSnapshot } from '@dvt/delivery';

import type { BackpressureSnapshotEnvelope, BackpressureSnapshotEnvelopeStore } from './types.js';

export class RawSqlBackpressureStore implements BackpressureSnapshotEnvelopeStore {
  public constructor(
    private readonly reader: Pick<PostgresBackpressureSnapshotReader, 'getTenantSnapshot'>,
    private readonly nowEpochMs: () => number = () => Date.now()
  ) {}

  public async getTenantSnapshot(tenantId: string): Promise<BackpressureSnapshot> {
    return (await this.getTenantSnapshotEnvelope(tenantId)).snapshot;
  }

  public async getTenantSnapshotEnvelope(
    tenantId: string
  ): Promise<BackpressureSnapshotEnvelope> {
    const snapshot = await this.reader.getTenantSnapshot(tenantId);
    return {
      snapshot: {
        pendingEventsPerTenant: snapshot.tenantActivePendingEventCount,
        outboxOldestAgeMs: snapshot.globalHealthyTenantOldestActiveAgeMs,
      },
      capturedAtEpochMs: this.nowEpochMs(),
      source: 'live',
    };
  }
}
