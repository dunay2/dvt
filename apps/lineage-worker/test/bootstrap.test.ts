import { afterEach, describe, expect, it, vi } from 'vitest';

const bootstrapMocks = vi.hoisted(() => {
  const clientRelease = vi.fn();
  const poolConnect = vi.fn().mockResolvedValue({ release: clientRelease });
  const poolEnd = vi.fn().mockResolvedValue(undefined);
  const poolCtor = vi.fn().mockImplementation(() => ({
    connect: poolConnect,
    end: poolEnd,
  }));

  const stateStoreClose = vi.fn().mockResolvedValue(undefined);
  const stateStoreMigrate = vi.fn().mockResolvedValue(undefined);
  const stateStoreCtor = vi.fn().mockImplementation((config: unknown) => ({
    close: stateStoreClose,
    migrate: stateStoreMigrate,
    config,
  }));

  const lineageStoreCtor = vi.fn().mockImplementation((schema: string, withClient: unknown) => ({
    schema,
    withClient,
  }));

  const sinkCtor = vi.fn().mockImplementation((config: unknown) => ({ config }));

  return {
    clientRelease,
    poolConnect,
    poolEnd,
    poolCtor,
    stateStoreClose,
    stateStoreMigrate,
    stateStoreCtor,
    lineageStoreCtor,
    sinkCtor,
  };
});

vi.mock('pg', () => ({
  Pool: bootstrapMocks.poolCtor,
}));

vi.mock('@dvt/adapter-postgres', () => ({
  PostgresStateStoreAdapter: bootstrapMocks.stateStoreCtor,
  PostgresLineageOutboxStore: bootstrapMocks.lineageStoreCtor,
}));

vi.mock('@dvt/traceability-service', () => ({
  HttpOpenLineageSink: bootstrapMocks.sinkCtor,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('buildLineageWorkerBootstrap', () => {
  it('wires lineage outbox directly from the composition root', async () => {
    const { buildLineageWorkerBootstrap } = await import('../src/bootstrap.js');

    const bootstrap = buildLineageWorkerBootstrap({
      NODE_ENV: 'test',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_PG_SCHEMA: 'dvt',
      DVT_PG_STATEMENT_TIMEOUT_MS: 15,
      DVT_PG_QUERY_TIMEOUT_MS: 30,
      DVT_COMPILED_CODE_RESOLVER_BACKEND: 'auto',
      DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE: false,
      DVT_LINEAGE_API_URL: 'https://lineage.example/api',
      DVT_LINEAGE_NAMESPACE: 'dvt',
      DVT_LINEAGE_BATCH_SIZE: 50,
      DVT_LINEAGE_POLL_INTERVAL_MS: 5000,
      DVT_LINEAGE_ERROR_BACKOFF_MS: 10000,
      DVT_LINEAGE_ADMIN_HOST: '127.0.0.1',
      DVT_LINEAGE_ADMIN_PORT: 9466,
      SERVICE_NAME: 'dvt-lineage-worker',
    });

    expect(bootstrapMocks.poolCtor).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.stateStoreCtor).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.lineageStoreCtor).toHaveBeenCalledWith('dvt', expect.any(Function));
    expect(bootstrapMocks.sinkCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: 'https://lineage.example/api',
        namespace: 'dvt',
      })
    );

    const withClient = bootstrapMocks.lineageStoreCtor.mock.calls[0]?.[1];
    expect(typeof withClient).toBe('function');
    if (typeof withClient !== 'function') {
      throw new TypeError('expected lineage outbox withClient bridge');
    }

    await withClient(async (client: { release(): void }) => {
      expect(client).toEqual(
        expect.objectContaining({
          release: bootstrapMocks.clientRelease,
        })
      );
    });

    expect(bootstrapMocks.poolConnect).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.clientRelease).toHaveBeenCalledTimes(1);

    await bootstrap.close();

    expect(bootstrapMocks.stateStoreClose).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.poolEnd).toHaveBeenCalledTimes(1);
  });
});
