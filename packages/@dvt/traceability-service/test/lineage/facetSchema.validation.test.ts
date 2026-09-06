/**
 * Offline JSON Schema validation for emitted lineage facets.
 *
 * The compiled-code-specific custom facet was removed by hard cut. The mapper
 * now emits only the standard OpenLineage SQL facet after reading verified
 * generic artifact bytes through @dvt/artifacts.
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { EventEnvelope, StepArtifactRef } from '@dvt/contracts';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterEach, describe, expect, it } from 'vitest';

import { SqlJobFacetBuilder } from '../../src/lineage/facets/SqlJobFacetBuilder.js';
import { StepStartedLineageMapper } from '../../src/lineage/mapper/StepStartedLineageMapper.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');
const tempRoots: string[] = [];

function loadSchema(relativePath: string): object {
  const raw = readFileSync(join(REPO_ROOT, relativePath), 'utf8');
  return JSON.parse(raw) as object;
}

const SQL_FACET_SCHEMA = loadSchema(
  'docs/contracts/traceability/facets/openlineage/SqlJobFacet.1-0-0.schema.json'
);

const ajv = new Ajv2020({ strict: true, allErrors: true });
ajv.addKeyword('x-dvt-provenance');
addFormats(ajv);
const validateSqlFacet = ajv.compile(SQL_FACET_SCHEMA);

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function mkStepStartedEvent(payload?: Record<string, unknown>): EventEnvelope {
  return {
    eventId: 'evt-schema-1',
    eventType: 'StepStarted',
    runId: 'run-schema-1',
    emittedAt: '2026-03-12T00:00:00.000Z',
    tenantId: 'tenant-schema',
    projectId: 'project-schema',
    environmentId: 'env-schema',
    planId: 'plan-schema-1',
    planVersion: '1.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'idem-schema-1',
    stepId: 'step-schema-1',
    payload,
    runSeq: 1,
    persistedAt: '2026-03-12T00:00:00.001Z',
  };
}

function mkCompiledSqlArtifactRef(sqlText: string): StepArtifactRef {
  const root = mkdtempSync(join(tmpdir(), 'dvt-lineage-schema-'));
  tempRoots.push(root);
  const filePath = join(root, 'compiled.sql');
  const bytes = Buffer.from(sqlText, 'utf8');
  writeFileSync(filePath, bytes);
  return {
    artifactKind: 'compiled-sql',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    storageUri: pathToFileURL(filePath).href,
    sizeBytes: bytes.byteLength,
    encoding: 'utf-8',
  };
}

describe('emitted lineage facets conform to repo-local JSON Schema contracts', () => {
  it('success path: sql facet validates against SqlJobFacet.1-0-0.schema.json', async () => {
    const sqlText = 'select order_id from orders';
    const stepArtifactRef = mkCompiledSqlArtifactRef(sqlText);
    const mapper = new StepStartedLineageMapper({
      artifactReadOptions: { nodeEnv: 'test' },
      sqlFacetBuilder: new SqlJobFacetBuilder(),
    });

    const { jobFacets } = await mapper.map(mkStepStartedEvent({ stepArtifactRef }));

    const valid = validateSqlFacet(jobFacets.sql);
    expect(validateSqlFacet.errors, 'sql facet must conform to SqlJobFacet schema').toBeNull();
    expect(valid).toBe(true);
  });

  it('does not emit the retired custom compiled-code facet', async () => {
    const stepArtifactRef = mkCompiledSqlArtifactRef('select 1');
    const mapper = new StepStartedLineageMapper({
      artifactReadOptions: { nodeEnv: 'test' },
      sqlFacetBuilder: new SqlJobFacetBuilder(),
    });

    const { jobFacets } = await mapper.map(mkStepStartedEvent({ stepArtifactRef }));

    expect(Object.keys(jobFacets)).toEqual(['sql']);
    expect(jobFacets).not.toHaveProperty('dvt_dbt_details');
  });
});
