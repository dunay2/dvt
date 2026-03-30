import { readFileSync } from 'node:fs';

import { describe, it, expect, vi } from 'vitest';

import { isActiveEnv, loadEnv, type ActiveEnv, type Env } from '../../src/plugins/env.js';

function assertActiveEnv(env: Env): asserts env is ActiveEnv {
  if (!isActiveEnv(env)) {
    expect.fail('expected an active outbox worker environment');
  }
}

describe('loadEnv', () => {
  it('applies active worker defaults when ownership mode is explicit', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    });

    assertActiveEnv(env);
    expect(env.DVT_PG_SCHEMA).toBe('dvt');
    expect(env.DVT_OUTBOX_SHARD_COUNT).toBe(1);
    expect(env.DVT_OUTBOX_OWNED_SHARD_IDS).toEqual([0]);
    expect(env.DVT_OUTBOX_WORKER_POLL_INTERVAL_MS).toBe(1000);
    expect(env.DVT_OUTBOX_WORKER_BATCH_SIZE).toBe(100);
    expect(env.DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS).toBe(5000);
    expect(env.DVT_OUTBOX_WORKER_STOP_ON_ERROR).toBe(false);
    expect(env.DVT_OUTBOX_WORKER_RUN_MIGRATIONS).toBe(false);
    expect(env.DVT_OUTBOX_OWNERSHIP_MODE).toBe('active');
    expect(env.DVT_OUTBOX_EVENT_BUS_MODE).toBe('http');
    if (env.DVT_OUTBOX_EVENT_BUS_MODE !== 'http') {
      expect.fail('expected http event bus mode');
    }
    expect(env.DVT_OUTBOX_HTTP_TARGET_URL).toBe('http://localhost:8080/outbox/events');
    expect(env.DVT_OUTBOX_HTTP_TIMEOUT_MS).toBe(10000);
    expect(env.DVT_RUN_EVENT_RETENTION_ENABLED).toBe(false);
    expect(env.DVT_RUN_EVENT_RETENTION_INITIAL_DELAY_MS).toBe(30_000);
    expect(env.DVT_RUN_EVENT_RETENTION_INTERVAL_MS).toBe(3_600_000);
    expect(env.DVT_RUN_EVENT_RETENTION_HOT_RETENTION_DAYS).toBe(90);
    expect(env.DVT_RUN_EVENT_RETENTION_ARCHIVE_BUCKET_COUNT).toBe(64);
    expect(env.DVT_RUN_EVENT_RETENTION_PIN_TERMINAL_SNAPSHOTS).toBe(true);
    expect(env.DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY).toBe('.dvt/archive');
    expect(env.DVT_OUTBOX_ADMIN_HOST).toBe('0.0.0.0');
    expect(env.DVT_OUTBOX_ADMIN_PORT).toBe(9464);
    expect(env.SERVICE_NAME).toBe('dvt-outbox-worker');
  });

  it('applies passive worker defaults without runtime dependencies', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
    });

    expect(env.DVT_OUTBOX_OWNERSHIP_MODE).toBe('passive');
    expect(env.DVT_OUTBOX_ADMIN_HOST).toBe('0.0.0.0');
    expect(env.DVT_OUTBOX_ADMIN_PORT).toBe(9464);
    expect(env.SERVICE_NAME).toBe('dvt-outbox-worker');
  });

  it('fails fast when ownership mode is missing', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
      })
    ).toThrow(/DVT_OUTBOX_OWNERSHIP_MODE/);
  });

  it('fails fast when active mode is missing DATABASE_URL', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      })
    ).toThrow(/DATABASE_URL/);
  });

  it('fails fast when active mode uses an empty DATABASE_URL', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: '',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
      })
    ).toThrow(/DATABASE_URL/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: '   ',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
      })
    ).toThrow(/DATABASE_URL/);
  });

  it('fails fast when active http mode is selected without target url', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      })
    ).toThrow(/DVT_OUTBOX_HTTP_TARGET_URL/);
  });

  it('fails fast when active http mode uses an empty target url', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: '',
      })
    ).toThrow(/DVT_OUTBOX_HTTP_TARGET_URL/);
  });

  it('fails fast when active http mode target url is not a valid http endpoint', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'not-a-url',
      })
    ).toThrow(/DVT_OUTBOX_HTTP_TARGET_URL/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'ftp://localhost:8080/outbox/events',
      })
    ).toThrow(/DVT_OUTBOX_HTTP_TARGET_URL/);
  });

  it('allows active log mode without target url', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
    });

    assertActiveEnv(env);
    expect(env.DVT_OUTBOX_EVENT_BUS_MODE).toBe('log');
  });

  it('accepts explicit shard ownership for active workers', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      DVT_OUTBOX_SHARD_COUNT: '4',
      DVT_OUTBOX_OWNED_SHARD_IDS: '3,1',
    });

    assertActiveEnv(env);
    expect(env.DVT_OUTBOX_SHARD_COUNT).toBe(4);
    expect(env.DVT_OUTBOX_OWNED_SHARD_IDS).toEqual([1, 3]);
  });

  it('parses string booleans for stop-on-error explicitly', () => {
    const falseEnv = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
      DVT_OUTBOX_WORKER_STOP_ON_ERROR: 'false',
    });
    const zeroEnv = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
      DVT_OUTBOX_WORKER_STOP_ON_ERROR: '0',
    });
    const trueEnv = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
      DVT_OUTBOX_WORKER_STOP_ON_ERROR: 'true',
    });
    const migrateEnv = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
      DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
    });

    assertActiveEnv(falseEnv);
    assertActiveEnv(zeroEnv);
    assertActiveEnv(trueEnv);
    assertActiveEnv(migrateEnv);
    expect(falseEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR).toBe(false);
    expect(zeroEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR).toBe(false);
    expect(trueEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR).toBe(true);
    expect(migrateEnv.DVT_OUTBOX_WORKER_RUN_MIGRATIONS).toBe(true);
  });

  it('accepts explicit ownership modes for canary control', () => {
    const activeEnv = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    });
    const passiveEnv = loadEnv({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
    });

    assertActiveEnv(activeEnv);
    expect(isActiveEnv(passiveEnv)).toBe(false);
    expect(activeEnv.DVT_OUTBOX_OWNERSHIP_MODE).toBe('active');
    expect(passiveEnv.DVT_OUTBOX_OWNERSHIP_MODE).toBe('passive');
  });

  it('stays aligned with the checked-in example environment', () => {
    const file = readFileSync(new globalThis.URL('../../.env.example', import.meta.url), 'utf8');
    const input = Object.fromEntries(
      file
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
        .map((line) => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), line.slice(separator + 1)];
        })
    );

    const env = loadEnv(input);
    assertActiveEnv(env);
    expect(env.DVT_OUTBOX_OWNERSHIP_MODE).toBe('active');
  });

  it('rejects ambiguous boolean strings for worker flags', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_STOP_ON_ERROR: 'yes',
      })
    ).toThrow(/DVT_OUTBOX_WORKER_STOP_ON_ERROR/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'enabled',
      })
    ).toThrow(/DVT_OUTBOX_WORKER_RUN_MIGRATIONS/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_OWNERSHIP_MODE: 'leader',
      })
    ).toThrow(/DVT_OUTBOX_OWNERSHIP_MODE/);
  });

  it('rejects invalid worker timing and admin port values', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '0',
      })
    ).toThrow(/DVT_OUTBOX_WORKER_POLL_INTERVAL_MS/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_BATCH_SIZE: '-1',
      })
    ).toThrow(/DVT_OUTBOX_WORKER_BATCH_SIZE/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '0',
      })
    ).toThrow(/DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_ADMIN_PORT: '70000',
      })
    ).toThrow(/DVT_OUTBOX_ADMIN_PORT/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_RUN_EVENT_RETENTION_HOT_RETENTION_DAYS: '0',
      })
    ).toThrow(/DVT_RUN_EVENT_RETENTION_HOT_RETENTION_DAYS/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_RUN_EVENT_RETENTION_INITIAL_DELAY_MS: '-1',
      })
    ).toThrow(/DVT_RUN_EVENT_RETENTION_INITIAL_DELAY_MS/);
  });

  it('rejects ambiguous shard ownership configuration', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_OUTBOX_SHARD_COUNT: '2',
      })
    ).toThrow(/DVT_OUTBOX_OWNED_SHARD_IDS/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_OUTBOX_SHARD_COUNT: '4',
        DVT_OUTBOX_OWNED_SHARD_IDS: '1,1',
      })
    ).toThrow(/DVT_OUTBOX_OWNED_SHARD_IDS/);

    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_OUTBOX_SHARD_COUNT: '4',
        DVT_OUTBOX_OWNED_SHARD_IDS: '4',
      })
    ).toThrow(/DVT_OUTBOX_OWNED_SHARD_IDS/);
  });

  it('fails in production when retention is enabled without explicit filesystem opt-in', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_RUN_EVENT_RETENTION_ENABLED: 'true',
      })
    ).toThrow(/DVT_RUN_EVENT_RETENTION_ALLOW_FILESYSTEM_IN_PROD/);
  });

  it('fails in production when retention is enabled and filesystem opt-in is false', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_EVENT_BUS_MODE: 'log',
        DVT_RUN_EVENT_RETENTION_ENABLED: 'true',
        DVT_RUN_EVENT_RETENTION_ALLOW_FILESYSTEM_IN_PROD: 'false',
      })
    ).toThrow(/DVT_RUN_EVENT_RETENTION_ALLOW_FILESYSTEM_IN_PROD/);
  });

  it('allows production retention with warning when filesystem opt-in is true in http mode', () => {
    const warningSpy = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});

    const env = loadEnv({
      NODE_ENV: 'production',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_EVENT_BUS_MODE: 'http',
      DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
      DVT_RUN_EVENT_RETENTION_ENABLED: 'true',
    });

    assertActiveEnv(env);
    expect(env.DVT_RUN_EVENT_RETENTION_ENABLED).toBe(true);
    expect(warningSpy).toHaveBeenCalledWith(
      expect.stringContaining('DVT_RUN_EVENT_RETENTION_ENABLED is active in production'),
      expect.objectContaining({
        code: 'DVT_RUN_EVENT_RETENTION_PROD_FILESYSTEM',
      })
    );
    warningSpy.mockRestore();
  });

  it('keeps warning behavior in production with opt-in and custom archive directory', () => {
    const warningSpy = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});

    const env = loadEnv({
      NODE_ENV: 'production',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      DVT_RUN_EVENT_RETENTION_ENABLED: 'true',
      DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY: '/tmp/archive',
    });

    assertActiveEnv(env);
    expect(env.DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY).toBe('/tmp/archive');
    expect(warningSpy).toHaveBeenCalledWith(
      expect.stringContaining('DVT_RUN_EVENT_RETENTION_ENABLED is active in production'),
      expect.objectContaining({
        code: 'DVT_RUN_EVENT_RETENTION_PROD_FILESYSTEM',
      })
    );
    warningSpy.mockRestore();
  });

  it('does not warn in production when run-event retention is disabled', () => {
    const warningSpy = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});

    const env = loadEnv({
      NODE_ENV: 'production',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      DVT_RUN_EVENT_RETENTION_ENABLED: 'false',
    });

    assertActiveEnv(env);
    expect(env.DVT_RUN_EVENT_RETENTION_ENABLED).toBe(false);
    expect(warningSpy).not.toHaveBeenCalled();
    warningSpy.mockRestore();
  });

  it('emits one warning per loadEnv call when production retention is enabled with opt-in', () => {
    const warningSpy = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});

    loadEnv({
      NODE_ENV: 'production',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      DVT_RUN_EVENT_RETENTION_ENABLED: 'true',
    });

    loadEnv({
      NODE_ENV: 'production',
      DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      DVT_RUN_EVENT_RETENTION_ENABLED: 'true',
    });

    expect(warningSpy).toHaveBeenCalledTimes(2);
    warningSpy.mockRestore();
  });
});
