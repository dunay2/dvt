import process from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

const bootstrapMocks = vi.hoisted(() => {
  const loadEnv = vi.fn(() => ({
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_PG_SCHEMA: 'dvt',
    DVT_PG_STATEMENT_TIMEOUT_MS: 0,
    DVT_PG_QUERY_TIMEOUT_MS: 0,
    DVT_ARTIFACT_S3_ENDPOINT: undefined,
    DVT_ARTIFACT_S3_REGION: undefined,
    DVT_ARTIFACT_S3_FORCE_PATH_STYLE: false,
    DVT_ARTIFACT_FILE_READ_ROOT: undefined,
    DVT_LINEAGE_API_URL: 'https://lineage.example/api',
    DVT_LINEAGE_NAMESPACE: 'dvt',
    DVT_LINEAGE_API_TOKEN: undefined,
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
  }));

  const mapperFactory = vi.fn(() => {
    throw new Error('artifact reader composition failed');
  });

  const stateStoreCtor = vi.fn();
  const migrate = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  stateStoreCtor.mockImplementation(() => ({
    migrate,
    close,
    lineageOutboxStore: {
      appendAndEnqueueTx: vi.fn(),
      listPending: vi.fn(),
    },
  }));

  const loggerInfo = vi.fn();
  const loggerWarn = vi.fn();
  const loggerError = vi.fn();
  const loggerDebug = vi.fn();

  const runtimeStart = vi.fn();
  const runtimeCtor = vi.fn().mockImplementation(() => ({
    lagCount: 0,
    deadLetterCount: 0,
    start: runtimeStart,
  }));

  return {
    loadEnv,
    mapperFactory,
    stateStoreCtor,
    migrate,
    close,
    loggerInfo,
    loggerWarn,
    loggerError,
    loggerDebug,
    runtimeCtor,
    runtimeStart,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

vi.mock('../src/env.js', () => ({
  loadEnv: bootstrapMocks.loadEnv,
}));

vi.mock('../src/lineageMapper.js', () => ({
  createStepStartedLineageMapper: bootstrapMocks.mapperFactory,
}));

vi.mock('@dvt/adapter-postgres', () => ({
  PostgresStateStoreAdapter: bootstrapMocks.stateStoreCtor,
}));

vi.mock('@dvt/traceability-service', () => ({
  HttpOpenLineageSink: vi.fn(),
  LineageWorkerRuntime: bootstrapMocks.runtimeCtor,
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: bootstrapMocks.loggerInfo,
    warn: bootstrapMocks.loggerWarn,
    error: bootstrapMocks.loggerError,
    debug: bootstrapMocks.loggerDebug,
  })),
}));

describe('lineage worker bootstrap', () => {
  it('validates generic artifact mapper composition before database side effects', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.resetModules();
    await import('../src/server.js');

    expect(bootstrapMocks.loadEnv).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.mapperFactory).toHaveBeenCalledTimes(1);
    expect(bootstrapMocks.stateStoreCtor).not.toHaveBeenCalled();
    expect(bootstrapMocks.migrate).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});
