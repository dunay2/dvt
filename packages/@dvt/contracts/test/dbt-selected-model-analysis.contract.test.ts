import { describe, expect, it } from 'vitest';

import type { DbtSelectedModelAnalysis } from '../src/contracts/dbt-project/DbtSelectedModelAnalysis.v1.js';
import { DbtSelectedModelAnalysisSchema } from '../src/contracts/dbt-project/DbtSelectedModelAnalysis.v1.js';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const SHA_C = 'c'.repeat(64);
const SHA_D = 'd'.repeat(64);

const readyAnalysis = (): DbtSelectedModelAnalysis => {
  return {
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: 'ready',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas-orders',
      authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
    },
    projectRevision: {
      projectRoot: 'analytics',
      projectName: 'analytics',
      contentSetSha256: SHA_A,
      analyzedAt: '2026-08-01T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v2',
      dbtVersion: '1.10.0',
    },
    analysisSha256: SHA_B,
    selectedAnalysisSha256: SHA_C,
    capabilitySet: {
      adapterType: 'postgres',
      analyzerVersion: 'dvt-dbt-analyzer.v2',
      dbtVersion: '1.10.0',
      supportedRegionKinds: ['ref', 'source'],
      capabilitySetSha256: SHA_D,
    },
    selectedUniqueId: 'model.analytics.orders',
    files: [
      {
        path: 'models/orders.sql',
        revisionSha256: SHA_A,
        byteLength: 96,
        kind: 'model',
      },
      {
        path: 'models/sources.yml',
        revisionSha256: SHA_B,
        byteLength: 80,
        kind: 'schema',
      },
    ],
    identities: [
      {
        uniqueId: 'model.analytics.orders',
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
        originalFilePath: 'models/orders.sql',
        relationToSelection: 'selected',
      },
      {
        uniqueId: 'source.analytics.raw.orders',
        resourceType: 'source',
        name: 'orders',
        packageName: 'analytics',
        originalFilePath: 'models/sources.yml',
        relationToSelection: 'upstream',
      },
    ],
    dependencies: [
      {
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
        regionId: 'models/orders.sql:24:61:source',
      },
    ],
    regions: [
      {
        regionId: 'models/orders.sql:24:61:source',
        path: 'models/orders.sql',
        kind: 'source',
        classification: 'supported',
        range: { startByte: 24, endByte: 61 },
        sourceSha256: SHA_C,
        targetUniqueId: 'source.analytics.raw.orders',
      },
      {
        regionId: 'models/orders.sql:70:91:jinja',
        path: 'models/orders.sql',
        kind: 'jinja',
        classification: 'code_only',
        range: { startByte: 70, endByte: 91 },
        sourceSha256: SHA_D,
        reasonCode: 'dbt_jinja_unsupported',
      },
    ],
    diagnostics: [
      {
        code: 'dbt_jinja_unsupported',
        severity: 'warning',
        message: 'The Jinja region is preserved as code-only.',
        subject: {
          kind: 'region',
          uniqueId: 'model.analytics.orders',
          path: 'models/orders.sql',
          regionId: 'models/orders.sql:70:91:jinja',
        },
        evidence: {
          path: 'models/orders.sql',
          range: { startByte: 70, endByte: 91 },
        },
      },
    ],
  } as const;
};

describe('DbtSelectedModelAnalysis.v1', () => {
  it('accepts a deterministic selected-model projection with supported and code-only regions', () => {
    const analysis = readyAnalysis();

    expect(DbtSelectedModelAnalysisSchema.parse(analysis)).toEqual(analysis);
  });

  it('rejects unordered published collections', () => {
    const analysis = readyAnalysis();

    expect(
      DbtSelectedModelAnalysisSchema.safeParse({
        ...analysis,
        files: [...analysis.files].reverse(),
      }).success
    ).toBe(false);
    expect(
      DbtSelectedModelAnalysisSchema.safeParse({
        ...analysis,
        identities: [...analysis.identities].reverse(),
      }).success
    ).toBe(false);
    expect(
      DbtSelectedModelAnalysisSchema.safeParse({
        ...analysis,
        regions: [...analysis.regions].reverse(),
      }).success
    ).toBe(false);
  });

  it('rejects overlapping regions and dangling evidence', () => {
    const analysis = readyAnalysis();
    const overlap = {
      ...analysis.regions[1],
      regionId: 'models/orders.sql:50:91:jinja',
      range: { startByte: 50, endByte: 91 },
    };

    expect(
      DbtSelectedModelAnalysisSchema.safeParse({
        ...analysis,
        regions: [analysis.regions[0], overlap],
      }).success
    ).toBe(false);
    expect(
      DbtSelectedModelAnalysisSchema.safeParse({
        ...analysis,
        dependencies: [{ ...analysis.dependencies[0], regionId: 'missing-region' }],
      }).success
    ).toBe(false);
  });

  it('requires exactly one selected model identity', () => {
    const analysis = readyAnalysis();

    expect(
      DbtSelectedModelAnalysisSchema.safeParse({
        ...analysis,
        identities: analysis.identities.map((identity) => ({
          ...identity,
          relationToSelection: 'upstream',
        })),
      }).success
    ).toBe(false);
  });

  it('requires supported regions to resolve a target and code-only regions to explain refusal', () => {
    const analysis = readyAnalysis();
    const { targetUniqueId: _targetUniqueId, ...supportedWithoutTarget } = analysis.regions[0];
    const { reasonCode: _reasonCode, ...codeOnlyWithoutReason } = analysis.regions[1];

    expect(
      DbtSelectedModelAnalysisSchema.safeParse({
        ...analysis,
        regions: [supportedWithoutTarget, analysis.regions[1]],
      }).success
    ).toBe(false);
    expect(
      DbtSelectedModelAnalysisSchema.safeParse({
        ...analysis,
        regions: [analysis.regions[0], codeOnlyWithoutReason],
      }).success
    ).toBe(false);
  });
});
