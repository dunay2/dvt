import { asIsoUtcString } from '@dvt/contracts';
import type { IProviderAdapter } from '@dvt/engine';
import { describe, expect, it } from 'vitest';

import { buildProviderAdapters } from '../../src/modules/buildProviderAdapters.js';

import { readModuleSource } from './modulesArchitectureAst.support.js';

/**
 * Provider-adapter registration cases.
 * This stays separate from runtime-module and compile-boundary tests because it
 * validates a different composition seam.
 */
export function describeBuildProviderAdaptersCases(): void {
  describe('buildProviderAdapters', () => {
    it('keeps provider assembly independent from concrete Temporal construction', () => {
      const source = readModuleSource('buildProviderAdapters.ts').sourceText;

      expect(source).not.toContain('@dvt/adapter-temporal');
      expect(source).not.toContain('TemporalAdapter');
      expect(source).not.toContain('TEMPORAL_ADDRESS');
    });

    it('returns no active provider adapters when runtime providers are not configured', async () => {
      const result = await buildProviderAdapters(
        {
          NODE_ENV: 'test',
          PORT: 3000,
          HOST: '0.0.0.0',
          LOG_LEVEL: 'info',
          CORS_ORIGIN: '*',
          DVT_PG_SCHEMA: 'dvt',
          DVT_PG_STATEMENT_TIMEOUT_MS: 0,
          DVT_PG_QUERY_TIMEOUT_MS: 0,
          DVT_OUTBOX_SHARD_COUNT: 1,
          DVT_INTENT_RECONCILER_ENABLED: false,
          DVT_INTENT_RECONCILER_INTERVAL_MS: 30000,
          DVT_INTENT_RECONCILER_ORPHAN_THRESHOLD_MS: 300000,
          DVT_INTENT_RECONCILER_LIMIT: 50,
          DVT_INTENT_RECONCILER_BACKOFF_BASE_MS: 1000,
          DVT_INTENT_RECONCILER_BACKOFF_MAX_MS: 60000,
          DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS: 20000,
          DVT_INTENT_RECONCILER_PROVIDERS: 'temporal',
          SERVICE_NAME: 'dbf-api',
          OBS_ENABLED: false,
          OIDC_ALGORITHMS: 'RS256',
          DVT_READYZ_ENABLED: false,
          DVT_VERSION_ENABLED: false,
          DVT_DB_READY_ENABLED: false,
          DVT_ADMIN_ROUTES_ENABLED: false,
        } as never,
        {
          stateStore: {
            async getRunMetadataByRunId() {
              return null;
            },
            async listEvents() {
              return [];
            },
          },
          stateStoreWrite: {
            async appendAndEnqueueTx() {
              return {
                appended: [],
                deduped: [],
                lastSeq: 0,
              };
            },
          },
          clock: { nowIsoUtc: () => asIsoUtcString('2026-02-12T00:00:00.000Z') },
          projector: {
            rebuild() {
              return {};
            },
          },
          observability: { logs: { info() {}, warn() {}, error() {}, debug() {} } } as never,
        },
        [
          {
            provider: 'temporal',
            build: async () => null,
          },
        ]
      );

      expect(result.adapters.size).toBe(0);

      await expect(result.close()).resolves.toBeUndefined();
    });

    it('registers only adapters returned by adapter factories', async () => {
      const temporalAdapter = { startRun: async () => ({ provider: 'temporal' }) } as never as
        IProviderAdapter;
      let closed = false;

      const result = await buildProviderAdapters(
        {
          NODE_ENV: 'test',
          PORT: 3000,
          HOST: '0.0.0.0',
          LOG_LEVEL: 'info',
          CORS_ORIGIN: '*',
          DVT_PG_SCHEMA: 'dvt',
          DVT_PG_STATEMENT_TIMEOUT_MS: 0,
          DVT_PG_QUERY_TIMEOUT_MS: 0,
          DVT_OUTBOX_SHARD_COUNT: 1,
          DVT_INTENT_RECONCILER_ENABLED: false,
          DVT_INTENT_RECONCILER_INTERVAL_MS: 30000,
          DVT_INTENT_RECONCILER_ORPHAN_THRESHOLD_MS: 300000,
          DVT_INTENT_RECONCILER_LIMIT: 50,
          DVT_INTENT_RECONCILER_BACKOFF_BASE_MS: 1000,
          DVT_INTENT_RECONCILER_BACKOFF_MAX_MS: 60000,
          DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS: 20000,
          DVT_INTENT_RECONCILER_PROVIDERS: 'temporal',
          SERVICE_NAME: 'dbf-api',
          OBS_ENABLED: false,
          OIDC_ALGORITHMS: 'RS256',
          DVT_READYZ_ENABLED: false,
          DVT_VERSION_ENABLED: false,
          DVT_DB_READY_ENABLED: false,
          DVT_ADMIN_ROUTES_ENABLED: false,
        } as never,
        {
          stateStore: {
            async getRunMetadataByRunId() {
              return null;
            },
            async listEvents() {
              return [];
            },
          },
          stateStoreWrite: {
            async appendAndEnqueueTx() {
              return {
                appended: [],
                deduped: [],
                lastSeq: 0,
              };
            },
          },
          clock: { nowIsoUtc: () => asIsoUtcString('2026-02-12T00:00:00.000Z') },
          projector: {
            rebuild() {
              return {};
            },
          },
          observability: { logs: { info() {}, warn() {}, error() {}, debug() {} } } as never,
        },
        [
          {
            provider: 'temporal',
            build: async () => ({
              adapter: temporalAdapter,
              close: async () => {
                closed = true;
              },
            }),
          },
          {
            provider: 'conductor',
            build: async () => null,
          },
        ]
      );

      expect(result.adapters.size).toBe(1);
      expect(result.adapters.get('temporal')).toBe(temporalAdapter);
      expect(result.adapters.has('temporal')).toBe(true);
      expect(result.adapters.has('conductor')).toBe(false);

      await expect(result.close()).resolves.toBeUndefined();
      expect(closed).toBe(true);
    });
  });
}
