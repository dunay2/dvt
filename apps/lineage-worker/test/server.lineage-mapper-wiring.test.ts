import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EventEnvelope, StepArtifactRef } from '@dvt/contracts';
import { LINEAGE_WARNING_CODE, LINEAGE_WARNING_MESSAGE_KEY } from '@dvt/traceability-service';
import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/env.js';
import { createStepStartedLineageMapper } from '../src/lineageMapper.js';

function makeEnv(fileReadRoot: string): ReturnType<typeof loadEnv> {
  return loadEnv({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgres://localhost/dvt',
    DVT_LINEAGE_API_URL: 'http://localhost:5000',
    DVT_ARTIFACT_FILE_READ_ROOT: fileReadRoot,
  });
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

async function writeSqlArtifact(root: string, sqlText: string): Promise<StepArtifactRef> {
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

describe('lineage worker mapper wiring', () => {
  it('emits sql facets by using the canonical generic artifact read path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dvt-lineage-worker-'));
    try {
      const sqlText = 'select id from dim_orders';
      const stepArtifactRef = await writeSqlArtifact(root, sqlText);
      const mapper = createStepStartedLineageMapper(makeEnv(root));

      const result = await mapper.map(mkStepStartedEvent({ stepArtifactRef }));

      expect(result.warnings).toEqual([]);
      expect(result.jobFacets).toEqual({
        sql: expect.objectContaining({ query: sqlText }),
      });
      expect(result.jobFacets).not.toHaveProperty('dvt_dbt_details');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails open when the generic artifact cannot be read', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dvt-lineage-worker-'));
    try {
      const missingPath = join(root, 'missing.sql');
      const stepArtifactRef: StepArtifactRef = {
        artifactKind: 'compiled-sql',
        sha256: 'a'.repeat(64),
        storageUri: pathToFileURL(missingPath).href,
        sizeBytes: 8,
        encoding: 'utf-8',
      };
      const mapper = createStepStartedLineageMapper(makeEnv(root));

      const result = await mapper.map(mkStepStartedEvent({ stepArtifactRef }));

      expect(result.jobFacets).toEqual({});
      expect(result.warnings).toEqual([
        expect.objectContaining({
          code: LINEAGE_WARNING_CODE.ARTIFACT_READ_FAILED,
          messageKey: LINEAGE_WARNING_MESSAGE_KEY.ARTIFACT_READ_FAILED,
          messageParams: expect.objectContaining({ storageUri: stepArtifactRef.storageUri }),
        }),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
