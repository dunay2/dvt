import { afterEach, describe, expect, it, vi } from 'vitest';

const bootstrapMocks = vi.hoisted(() => {
  const poolEnd = vi.fn().mockResolvedValue(undefined);
  const poolCtor = vi.fn().mockImplementation(() => ({
    end: poolEnd,
  }));

  const lineageStore = {
    enqueue: vi.fn(),
    listPending: vi.fn(),
    markDelivered: vi.fn(),
    markFailed: vi.fn(),
    listDeadLetter: vi.fn(),
    countPending: vi.fn(),
  };
  const stateStoreGetLineageOutboxStore = vi.fn().mockReturnValue(lineageStore);
  const stateStoreClose = vi.fn().mockResolvedValue(undefined);
  const stateStoreMigrate = vi.fn().mockResolvedValue(undefined);
  const stateStoreCtor = vi.fn().mockImplementation((config: unknown) => ({
    close: stateStoreClose,
    migrate: stateStoreMigrate,
    getLineageOutboxStore: stateStoreGetLineageOutboxStore,
    config,
  }));

  const sinkCtor = vi.fn().mockImplementation((config: unknown) => ({ config }));

  return {
    poolEnd,
    poolCtor,
    lineageStore,
    stateStoreGetLineageOutboxStore,
    stateStoreClose,
    stateStoreMigrate,
    stateStoreCtor,
    sinkCtor,
  };
});

vi.mock('pg', () => ({
  Pool: bootstrapMocks.poolCtor,
}));

vi.mock('@dvt/adapter-postgres', () => ({
  PostgresStateStoreAdapter: bootstrapMocks.stateStoreCtor,
}));

vi.mock('@dvt/traceability-service', () => ({
  HttpOpenLineageSink: bootstrapMocks.sinkCtor,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('buildLineageWorkerBootstrap', () => {
  it('resolves lineage outbox through the state-store port', async () => {
    const { buildLineageWorkerBootstrap } = await import('../src/bootstrap.js');

    const bootstrap = buildLineageWorkerBootstrap({
      NODE_ENV: 'test',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_PG_SCHEMA: 'dvt',
      DVT_PG_STATEMENT_TIMEOUT_MS: 15,
      DVT_PG_QUERY_TIMEOUT_MS: 30,
      DVT_ARTIFACT_S3_FORCE_PATH_STYLE: false,
      DVT_LINEAGE_API_URL: 'https://lineage.example/api',
      DVT_LINEAGE_NAMESPACE: 'dvt',
      DVT_LINEAGE_BATCH_SIZE: 50,
      DVT_LINEAGE_POLL_INTERVAL_MS: 5000,
      DVT_LINEAGE_ERROR_BACKOFF_MS: 10000,
      DVT_LINEAGE_DLQ_ALERT_TENANT_ID: 'tenant-a',
      DVT_LINEAGE_DLQ_ALERT_THRESHOLD: 10,
      DVT_LINEAGE_DLQ_AUTO_REPLAY_ENABLED: false,
      DVT_LINEAGE_DLQ_AUTO_REPLAY_BATCH_SIZE: 25,
      DVT_LINEAGE_ADMIN_HOST: '127.0.0.1',
      DVT_LINEAGE_ADMIN_PORT: 9466,
      SERVICE_NAME: 'dvt-lineage-worker',
    });

    expect(bootstrapMocks.poolCtor).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.stateStoreCtor).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.stateStoreGetLineageOutboxStore).not.toHaveBeenCalled();
    expect(bootstrapMocks.sinkCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: 'https://lineage.example/api',
        namespace: 'dvt',
      })
    );

    const lineageStore = bootstrap.getLineageStore();
    expect(lineageStore).toBe(bootstrapMocks.lineageStore);
    expect(bootstrapMocks.stateStoreGetLineageOutboxStore).toHaveBeenCalledTimes(1);

    await bootstrap.close();

    expect(bootstrapMocks.stateStoreClose).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.poolEnd).toHaveBeenCalledTimes(1);
  });
});
