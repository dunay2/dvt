import type { CompiledCodeRef, EventEnvelope } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { sha256HexUtf8 } from '../../src/lineage/compiledCodeRef.js';
import { SqlJobFacetBuilder } from '../../src/lineage/facets/SqlJobFacetBuilder.js';
import { StepStartedLineageMapper } from '../../src/lineage/mapper/StepStartedLineageMapper.js';

function mkCompiledCodeRef(sqlText: string): CompiledCodeRef {
  return {
    sha256: sha256HexUtf8(sqlText),
    storageUri: 'memory://compiled/sql-step',
    sizeBytes: Buffer.byteLength(sqlText, 'utf8'),
    encoding: 'utf-8',
  };
}

function mkStepStartedEvent(payload?: Record<string, unknown>): EventEnvelope {
  return {
    eventId: 'evt-1',
    eventType: 'StepStarted',
    runId: 'run-1',
    emittedAt: '2026-03-06T00:00:00.000Z',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'plan-1',
    planVersion: '2.3',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'idem-1',
    stepId: 'step-1',
    payload,
    runSeq: 1,
    persistedAt: '2026-03-06T00:00:00.001Z',
  };
}

describe('StepStartedLineageMapper', () => {
  it('builds sql facet and dvt_dbt_details when compiled code resolves', async () => {
    const sqlText = 'select id from dim_orders';
    const compiledCodeRef = mkCompiledCodeRef(sqlText);
    const mapper = new StepStartedLineageMapper({
      compiledCodeResolver: {
        resolve: async () => ({
          sourceUri: compiledCodeRef.storageUri,
          sqlText,
          sha256: compiledCodeRef.sha256,
          sizeBytes: compiledCodeRef.sizeBytes,
          encoding: 'utf-8',
        }),
      },
      sqlFacetBuilder: new SqlJobFacetBuilder(),
    });

    const result = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));
    expect(result.warnings).toEqual([]);
    expect(result.jobFacets.sql?.sql.query).toBe(sqlText);
    expect(result.jobFacets.dvt_dbt_details?.compiledCodeRef.sha256).toBe(compiledCodeRef.sha256);
  });

  it('fails open when compiled code resolution throws', async () => {
    const compiledCodeRef = mkCompiledCodeRef('select 1');
    const mapper = new StepStartedLineageMapper({
      compiledCodeResolver: {
        resolve: async () => {
          throw new Error('storage timeout');
        },
      },
      sqlFacetBuilder: new SqlJobFacetBuilder(),
    });

    const result = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));
    expect(result.jobFacets.sql).toBeUndefined();
    expect(result.jobFacets.dvt_dbt_details?.compiledCodeRef.storageUri).toBe(
      compiledCodeRef.storageUri
    );
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe('COMPILED_CODE_RESOLUTION_FAILED');
  });

  it('returns empty facets for events without compiledCodeRef', async () => {
    const mapper = new StepStartedLineageMapper({
      compiledCodeResolver: {
        resolve: async () => {
          throw new Error('should-not-be-called');
        },
      },
      sqlFacetBuilder: new SqlJobFacetBuilder(),
    });

    const result = await mapper.map(mkStepStartedEvent());
    expect(result.jobFacets).toEqual({});
    expect(result.warnings).toEqual([]);
  });
});
