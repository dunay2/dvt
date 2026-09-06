import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EventEnvelope, StepArtifactRef } from '@dvt/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { SqlJobFacetBuilder } from '../../src/lineage/facets/SqlJobFacetBuilder.js';
import { StepStartedLineageMapper } from '../../src/lineage/mapper/StepStartedLineageMapper.js';
import {
  DVT_TRACEABILITY_FACET_PRODUCER,
  OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL,
} from '../../src/lineage/openlineageSchema.js';
import {
  LINEAGE_WARNING_CODE,
  LINEAGE_WARNING_MESSAGE_KEY,
} from '../../src/lineage/warningContract.js';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function mkCompiledSqlArtifactRef(sqlText: string): Promise<StepArtifactRef> {
  const root = await mkdtemp(join(tmpdir(), 'dvt-lineage-artifact-'));
  tempRoots.push(root);
  const filePath = join(root, 'compiled.sql');
  const bytes = Buffer.from(sqlText, 'utf8');
  await writeFile(filePath, bytes);
  return {
    artifactKind: 'compiled-sql',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    storageUri: pathToFileURL(filePath).href,
    sizeBytes: bytes.byteLength,
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
    planVersion: '1.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'idem-1',
    stepId: 'step-1',
    payload,
    runSeq: 1,
    persistedAt: '2026-03-06T00:00:00.001Z',
  };
}

function makeMapper(): StepStartedLineageMapper {
  return new StepStartedLineageMapper({
    artifactReadOptions: { nodeEnv: 'test' },
    sqlFacetBuilder: new SqlJobFacetBuilder(),
  });
}

describe('StepStartedLineageMapper', () => {
  it('builds the SQL facet through the canonical generic artifact read path', async () => {
    const sqlText = 'select id from dim_orders';
    const stepArtifactRef = await mkCompiledSqlArtifactRef(sqlText);

    const result = await makeMapper().map(mkStepStartedEvent({ stepArtifactRef }));

    expect(result.warnings).toEqual([]);
    expect(result.jobFacets).toEqual({
      sql: {
        _producer: DVT_TRACEABILITY_FACET_PRODUCER,
        _schemaURL: OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL,
        query: sqlText,
      },
    });
  });

  it('fails open with a generic artifact warning when the referenced artifact cannot be read', async () => {
    const missingPath = join(tmpdir(), `dvt-lineage-missing-${Date.now()}.sql`);
    const stepArtifactRef: StepArtifactRef = {
      artifactKind: 'compiled-sql',
      sha256: 'a'.repeat(64),
      storageUri: pathToFileURL(missingPath).href,
      sizeBytes: 8,
      encoding: 'utf-8',
    };

    const result = await makeMapper().map(mkStepStartedEvent({ stepArtifactRef }));

    expect(result.jobFacets).toEqual({});
    expect(result.warnings).toEqual([
      {
        code: LINEAGE_WARNING_CODE.ARTIFACT_READ_FAILED,
        message: 'lineage source artifact could not be found',
        messageKey: LINEAGE_WARNING_MESSAGE_KEY.ARTIFACT_READ_FAILED,
        messageParams: {
          causeCode: 'ARTIFACT_NOT_FOUND',
          storageUri: stepArtifactRef.storageUri,
        },
      },
    ]);
  });

  it('returns empty facets for events without a generic artifact ref', async () => {
    const result = await makeMapper().map(mkStepStartedEvent());
    expect(result.jobFacets).toEqual({});
    expect(result.warnings).toEqual([]);
  });

  it('ignores non-SQL artifacts instead of making lineage own generic artifact semantics', async () => {
    const stepArtifactRef = await mkCompiledSqlArtifactRef('select 1');
    const result = await makeMapper().map(
      mkStepStartedEvent({
        stepArtifactRef: { ...stepArtifactRef, artifactKind: 'dbt-manifest' },
      })
    );

    expect(result.jobFacets).toEqual({});
    expect(result.warnings).toEqual([]);
  });

  it('does not read the retired compiled-code payload as a fallback', async () => {
    const ref = await mkCompiledSqlArtifactRef('select confidential_value from orders');
    const result = await makeMapper().map(mkStepStartedEvent({ compiledCodeRef: ref }));
    expect(result).toEqual({ jobFacets: {}, warnings: [] });
  });

  it.each([{ sha256: '0'.repeat(64) }, { sizeBytes: 1 }])(
    'does not publish SQL from an artifact that fails integrity %o',
    async (override) => {
      const ref = await mkCompiledSqlArtifactRef('select id from orders');
      const result = await makeMapper().map(
        mkStepStartedEvent({ stepArtifactRef: { ...ref, ...override } })
      );
      expect(result.jobFacets).toEqual({});
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.code).toBe(LINEAGE_WARNING_CODE.ARTIFACT_READ_FAILED);
    }
  );
});
