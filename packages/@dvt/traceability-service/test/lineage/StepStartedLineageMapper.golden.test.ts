/**
 * G6 Slice 3 — Golden fixture regression for StepStartedLineageMapper
 *
 * Proves that the full serialized output shape of all three mapper paths is
 * stable and makes any drift visible as a PR diff in the fixture files under
 * test/fixtures/lineage/. Update fixtures intentionally with:
 *   pnpm --filter @dvt/traceability-service test --update-snapshots
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CompiledCodeRef, EventEnvelope } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { sha256HexUtf8 } from '../../src/lineage/compiledCodeRef.js';
import { SqlJobFacetBuilder } from '../../src/lineage/facets/SqlJobFacetBuilder.js';
import { StepStartedLineageMapper } from '../../src/lineage/mapper/StepStartedLineageMapper.js';

// ---------------------------------------------------------------------------
// Fixtures directory — committed JSON files under test/fixtures/lineage/
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(fileURLToPath(import.meta.url), '../../fixtures/lineage');

function fixtureFile(name: string): string {
  return join(FIXTURES_DIR, name);
}

function toSnapshotJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// Helpers (same as the unit test suite to keep fixtures representative)
// ---------------------------------------------------------------------------

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

function makeMapper(
  resolveImpl: () => Promise<{
    sourceUri: string;
    sqlText: string;
    sha256: string;
    sizeBytes: number;
    encoding: string;
  }>
): StepStartedLineageMapper {
  return new StepStartedLineageMapper({
    compiledCodeResolver: { resolve: resolveImpl },
    sqlFacetBuilder: new SqlJobFacetBuilder(),
  });
}

// ---------------------------------------------------------------------------
// Golden tests
// ---------------------------------------------------------------------------

describe('StepStartedLineageMapper golden fixtures', () => {
  it('success path: both sql and dvt_dbt_details facets emitted', async () => {
    const sqlText = 'select id, name from dim_customers where active = true';
    const compiledCodeRef = mkCompiledCodeRef(sqlText);
    const mapper = makeMapper(async () => ({
      sourceUri: compiledCodeRef.storageUri,
      sqlText,
      sha256: compiledCodeRef.sha256,
      sizeBytes: compiledCodeRef.sizeBytes,
      encoding: 'utf-8',
    }));

    const result = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));

    await expect(toSnapshotJson(result)).toMatchFileSnapshot(fixtureFile('mapper-success.json'));
  });

  it('fail-open path: only dvt_dbt_details emitted with warning', async () => {
    const sqlText = 'select count(*) from orders';
    const compiledCodeRef = mkCompiledCodeRef(sqlText);
    const mapper = makeMapper(async () => {
      throw new Error('storage timeout');
    });

    const result = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));

    await expect(toSnapshotJson(result)).toMatchFileSnapshot(fixtureFile('mapper-fail-open.json'));
  });

  it('no-compiledCodeRef path: empty facets and no warnings', async () => {
    const mapper = makeMapper(async () => {
      throw new Error('should not be called');
    });

    const result = await mapper.map(mkStepStartedEvent());

    await expect(toSnapshotJson(result)).toMatchFileSnapshot(fixtureFile('mapper-no-ref.json'));
  });
});
