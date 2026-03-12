/**
 * G6 Slice 4 — Offline JSON Schema validation for emitted lineage facets
 *
 * Validates that the `sql` and `dvt_dbt_details` facets emitted by
 * StepStartedLineageMapper conform to the repo-local contract artifacts under
 * docs/contracts/traceability/facets/. Runs fully offline — no network calls.
 *
 * Changing a required field, removing a property, or drifting _schemaURL from
 * the pinned value will produce an AJV validation error and fail this suite.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CompiledCodeRef, EventEnvelope } from '@dvt/contracts';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import { sha256HexUtf8 } from '../../src/lineage/compiledCodeRef.js';
import { SqlJobFacetBuilder } from '../../src/lineage/facets/SqlJobFacetBuilder.js';
import { StepStartedLineageMapper } from '../../src/lineage/mapper/StepStartedLineageMapper.js';

// ---------------------------------------------------------------------------
// Schema loading — repo-local artifacts, no network
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');

function loadSchema(relativePath: string): object {
  const raw = readFileSync(join(REPO_ROOT, relativePath), 'utf8');
  return JSON.parse(raw) as object;
}

const SQL_FACET_SCHEMA = loadSchema(
  'docs/contracts/traceability/facets/openlineage/SqlJobFacet.1-0-0.schema.json'
);
const DVT_DBT_DETAILS_SCHEMA = loadSchema(
  'docs/contracts/traceability/facets/DvtDbtDetailsJobFacet.v1.schema.json'
);

// ---------------------------------------------------------------------------
// AJV setup — draft 2020-12 with format validation
// ---------------------------------------------------------------------------

const ajv = new Ajv2020({ strict: true, allErrors: true });
// Register repo-local vendor extension keywords used in vendored schema artifacts.
ajv.addKeyword('x-dvt-provenance');
addFormats(ajv);

const validateSqlFacet = ajv.compile(SQL_FACET_SCHEMA);
const validateDvtDbtDetailsFacet = ajv.compile(DVT_DBT_DETAILS_SCHEMA);

// ---------------------------------------------------------------------------
// Helpers
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('emitted lineage facets conform to repo-local JSON Schema contracts', () => {
  it('success path: sql facet validates against SqlJobFacet.1-0-0.schema.json', async () => {
    const sqlText = 'select order_id from orders';
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

    const { jobFacets } = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));

    const valid = validateSqlFacet(jobFacets.sql);
    expect(validateSqlFacet.errors, 'sql facet must conform to SqlJobFacet schema').toBeNull();
    expect(valid).toBe(true);
  });

  it('success path: dvt_dbt_details facet validates against DvtDbtDetailsJobFacet.v1.schema.json', async () => {
    const sqlText = 'select order_id from orders';
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

    const { jobFacets } = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));

    const valid = validateDvtDbtDetailsFacet(jobFacets.dvt_dbt_details);
    expect(
      validateDvtDbtDetailsFacet.errors,
      'dvt_dbt_details facet must conform to DvtDbtDetailsJobFacet schema'
    ).toBeNull();
    expect(valid).toBe(true);
  });

  it('fail-open path: dvt_dbt_details facet validates even when sql resolution fails', async () => {
    const sqlText = 'select 1';
    const compiledCodeRef = mkCompiledCodeRef(sqlText);
    const mapper = new StepStartedLineageMapper({
      compiledCodeResolver: {
        resolve: async () => {
          throw new Error('storage timeout');
        },
      },
      sqlFacetBuilder: new SqlJobFacetBuilder(),
    });

    const { jobFacets, warnings } = await mapper.map(mkStepStartedEvent({ compiledCodeRef }));

    expect(warnings).toHaveLength(1);
    expect(jobFacets.sql).toBeUndefined();

    const valid = validateDvtDbtDetailsFacet(jobFacets.dvt_dbt_details);
    expect(
      validateDvtDbtDetailsFacet.errors,
      'dvt_dbt_details facet must conform to schema even on fail-open path'
    ).toBeNull();
    expect(valid).toBe(true);
  });
});
