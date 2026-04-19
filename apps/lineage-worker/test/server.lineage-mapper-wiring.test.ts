import type { CompiledCodeRef, EventEnvelope } from '@dvt/contracts';
import {
  LINEAGE_WARNING_CODE,
  LINEAGE_WARNING_MESSAGE_KEY,
  sha256HexUtf8,
} from '@dvt/traceability-service';
import { describe, expect, it, vi } from 'vitest';

import { createStepStartedLineageMapper } from '../src/compiledCodeResolver.js';

type ResolverEnv = Parameters<typeof createStepStartedLineageMapper>[0];

function mkCompiledCodeRef(
  sqlText: string,
  storageUri = 'memory://compiled/sql-step'
): CompiledCodeRef {
  return {
    sha256: sha256HexUtf8(sqlText),
    storageUri,
    sizeBytes: Buffer.byteLength(sqlText, 'utf8'),
    encoding: 'utf-8',
  };
}

function makeResolverEnv(overrides: Partial<ResolverEnv> = {}): ResolverEnv {
  return {
    NODE_ENV: 'development',
    DVT_COMPILED_CODE_RESOLVER_BACKEND: 'auto',
    DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE: false,
    ...overrides,
  };
}

function mkStepStartedEvent(payload?: Record<string, unknown>): EventEnvelope {
  return {
    eventId: 'evt-1',
    eventType: 'StepStarted',
    runId: 'run-1',
    emittedAt: '2026-03-23T00:00:00.000Z',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'plan-1',
    planVersion: '1.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'idem-1',
    stepId: 'step-1',
    payload,
    runSeq: 1,
    persistedAt: '2026-03-23T00:00:00.001Z',
  };
}

describe('lineage worker mapper wiring', () => {
  it('emits sql facets when the compiled code resolver succeeds', async () => {
    const sqlText = 'select id from dim_orders';
    const compiledCodeRef = mkCompiledCodeRef(sqlText);
    const read = vi.fn(async () => ({
      sourceUri: compiledCodeRef.storageUri,
      sqlText,
      sha256: compiledCodeRef.sha256,
      sizeBytes: compiledCodeRef.sizeBytes,
      encoding: 'utf-8' as const,
    }));

    const mapper = createStepStartedLineageMapper(makeResolverEnv(), {
      readerOverrides: new Map([['memory', { read }]]),
      retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
    });

    const result = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));

    expect(read).toHaveBeenCalledTimes(1);
    expect(result.warnings).toEqual([]);
    expect(result.jobFacets.sql?.query).toBe(sqlText);
    expect(result.jobFacets.dvt_dbt_details?.compiledCodeRef).toEqual(compiledCodeRef);
  });

  it('fails open when the compiled code resolver throws', async () => {
    const sqlText = 'select 1';
    const compiledCodeRef = mkCompiledCodeRef(sqlText);
    const read = vi.fn(async () => {
      throw new Error('storage timeout');
    });

    const mapper = createStepStartedLineageMapper(makeResolverEnv(), {
      readerOverrides: new Map([['memory', { read }]]),
      retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
    });

    const result = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));

    expect(read).toHaveBeenCalledTimes(1);
    expect(result.jobFacets.sql).toBeUndefined();
    expect(result.jobFacets.dvt_dbt_details?.compiledCodeRef).toEqual(compiledCodeRef);
    expect(result.warnings).toEqual([
      {
        code: LINEAGE_WARNING_CODE.COMPILED_CODE_RESOLUTION_FAILED,
        message: 'storage timeout',
        messageKey: LINEAGE_WARNING_MESSAGE_KEY.COMPILED_CODE_RESOLUTION_FAILED,
        messageParams: {
          storageUri: compiledCodeRef.storageUri,
        },
      },
    ]);
  });

  it('allows production auto mapper construction without an s3 region', async () => {
    const sqlText = 'select id from dim_orders';
    const compiledCodeRef = mkCompiledCodeRef(sqlText, 'memory://compiled/sql-step');
    const read = vi.fn(async () => ({
      sourceUri: compiledCodeRef.storageUri,
      sqlText,
      sha256: compiledCodeRef.sha256,
      sizeBytes: compiledCodeRef.sizeBytes,
      encoding: 'utf-8' as const,
    }));

    const mapper = createStepStartedLineageMapper(
      makeResolverEnv({
        NODE_ENV: 'production',
      }),
      {
        readerOverrides: new Map([['memory', { read }]]),
        retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0 },
      }
    );

    const result = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));

    expect(read).toHaveBeenCalledTimes(1);
    expect(result.warnings).toEqual([]);
    expect(result.jobFacets.sql?.query).toBe(sqlText);
  });
});
