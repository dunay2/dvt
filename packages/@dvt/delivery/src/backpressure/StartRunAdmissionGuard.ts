export type BackpressureSnapshot = {
  readonly pendingEventsPerTenant: number;
  readonly outboxOldestAgeMs: number;
};

export type BackpressurePolicy = {
  readonly maxPendingEventsPerTenant: number;
  readonly maxOutboxLagMs: number;
};

export type BackpressureStore = {
  getTenantSnapshot(tenantId: string): Promise<BackpressureSnapshot>;
};

class BackpressureError extends Error {
  public constructor(
    message: string,
    public readonly code:
      | 'TENANT_BACKPRESSURE'
      | 'SYSTEM_BACKPRESSURE'
      | 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE'
  ) {
    super(message);
  }
}

export class TenantBackpressureError extends BackpressureError {
  public constructor(
    public readonly tenantId: string,
    public readonly snapshot: BackpressureSnapshot
  ) {
    super(`Tenant backlog exceeds threshold for ${tenantId}`, 'TENANT_BACKPRESSURE');
  }
}

export class SystemBackpressureError extends BackpressureError {
  public constructor(public readonly snapshot: BackpressureSnapshot) {
    super('System outbox lag exceeds threshold', 'SYSTEM_BACKPRESSURE');
  }
}

export class BackpressureSnapshotUnavailableError extends BackpressureError {
  public constructor(
    public readonly tenantId: string,
    public readonly cause: unknown
  ) {
    super(`Backpressure snapshot unavailable for ${tenantId}`, 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE');
  }
}

export class StartRunAdmissionGuard {
  public constructor(
    private readonly deps: {
      readonly backpressureStore: BackpressureStore;
      readonly policy: BackpressurePolicy;
    }
  ) {}

  public async assertAdmissible(tenantId: string): Promise<void> {
    let snapshot: BackpressureSnapshot;

    try {
      snapshot = await this.deps.backpressureStore.getTenantSnapshot(tenantId);
    } catch (error) {
      throw new BackpressureSnapshotUnavailableError(tenantId, error);
    }

    if (snapshot.pendingEventsPerTenant > this.deps.policy.maxPendingEventsPerTenant) {
      throw new TenantBackpressureError(tenantId, snapshot);
    }

    if (snapshot.outboxOldestAgeMs > this.deps.policy.maxOutboxLagMs) {
      throw new SystemBackpressureError(snapshot);
    }
  }
}
