/**
 * Golden fixture regression for StepStartedLineageMapper.
 *
 * The hard-cut surface is intentionally generic: StepStarted may carry a
 * StepArtifactRef, and traceability specializes only `compiled-sql` into the
 * standard OpenLineage SQL facet. No compiled-code-specific facet survives.
 */
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ArtifactReadRuntimeOptions } from '@dvt/artifacts';
import type { EventEnvelope, StepArtifactRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { SqlJobFacetBuilder } from '../../src/lineage/facets/SqlJobFacetBuilder.js';
import { StepStartedLineageMapper } from '../../src/lineage/mapper/StepStartedLineageMapper.js';

const FIXTURES_DIR = join(fileURLToPath(import.meta.url), '../../fixtures/lineage');
const STORAGE_URI = 's3://dvt-artifacts/compiled/sql-step';

function fixtureFile(name: string): string {
  return join(FIXTURES_DIR, name);
}

function toSnapshotJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function mkStepArtifactRef(sqlText: string): StepArtifactRef {
  const bytes = Buffer.from(sqlText, 'utf8');
  return {
    artifactKind: 'compiled-sql',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    storageUri: STORAGE_URI,
    sizeBytes: bytes.byteLength,
    encoding: 'utf-8',
  };
}

function mkStepStartedEvent(payload?: Record<string, unknown>): EventEnvelope {
  return {
    eventId: 'evt-golden-1',
    eventType: 'StepStarted',
    runId: 'run-golden-1',
    emittedAt: '2026-03-12T00:00:00.000Z',
    tenantId: 'tenant-golden',
    projectId: 'project-golden',
    environmentId: 'env-golden',
    planId: 'plan-golden-1',
    planVersion: '1.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'idem-golden-1',
    stepId: 'step-golden-1',
    payload,
    runSeq: 1,
    persistedAt: '2026-03-12T00:00:00.001Z',
  };
}

function makeMapper(send: (...args: unknown[]) => Promise<unknown>): StepStartedLineageMapper {
  const s3Client = { send } as unknown as NonNullable<ArtifactReadRuntimeOptions['s3Client']>;
  return new StepStartedLineageMapper({
    artifactReadOptions: { nodeEnv: 'test', s3Client },
    sqlFacetBuilder: new SqlJobFacetBuilder(),
  });
}

describe('StepStartedLineageMapper golden fixtures', () => {
  it('success path: standard SQL facet emitted from a verified generic artifact', async () => {
    const sqlText = 'select id, name from dim_customers where active = true';
    const bytes = Buffer.from(sqlText, 'utf8');
    const stepArtifactRef = mkStepArtifactRef(sqlText);
    const mapper = makeMapper(async () => ({
      Body: bytes,
      ContentLength: bytes.byteLength,
    }));

    const result = await mapper.map(mkStepStartedEvent({ stepArtifactRef }));

    await expect(toSnapshotJson(result)).toMatchFileSnapshot(fixtureFile('mapper-success.json'));
  });

  it('fail-open path: generic artifact warning and no lineage facet', async () => {
    const stepArtifactRef = mkStepArtifactRef('select count(*) from orders');
    const mapper = makeMapper(async () => {
      throw Object.assign(new Error('Missing object'), {
        name: 'NoSuchKey',
        $metadata: { httpStatusCode: 404 },
      });
    });

    const result = await mapper.map(mkStepStartedEvent({ stepArtifactRef }));

    await expect(toSnapshotJson(result)).toMatchFileSnapshot(fixtureFile('mapper-fail-open.json'));
  });

  it('no-ref path: empty facets and no warnings', async () => {
    const mapper = makeMapper(async () => {
      throw new Error('should not be called');
    });

    const result = await mapper.map(mkStepStartedEvent());

    await expect(toSnapshotJson(result)).toMatchFileSnapshot(fixtureFile('mapper-no-ref.json'));
  });
});
