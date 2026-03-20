import type { BackpressureSnapshot, BackpressureStore } from '@dvt/delivery';
import type { PostgresBackpressureSnapshotReader } from '@dvt/adapter-postgres';

export class RawSqlBackpressureStore implements BackpressureStore {
  public constructor(
    private readonly reader: Pick<PostgresBackpressureSnapshotReader, 'getTenantSnapshot'>
  ) {}

  public async getTenantSnapshot(tenantId: string): Promise<BackpressureSnapshot> {
    const snapshot = await this.reader.getTenantSnapshot(tenantId);
    return {
      pendingEventsPerTenant: snapshot.tenantActivePendingEventCount,
      outboxOldestAgeMs: snapshot.globalHealthyTenantOldestActiveAgeMs,
    };
  }
}
