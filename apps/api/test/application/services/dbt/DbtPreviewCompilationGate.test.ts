/**
 * Owned concern: prove compile admission rejects absent native SQL and mismatched source evidence.
 * @decision Exercise compiler outcomes through the existing analyzer port.
 * @consequence A successful parse or missing compiled SQL cannot admit a file plan.
 */
import { describe, expect, it, vi, type Mock } from 'vitest';

import type {
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
} from '../../../../src/application/ports/dbtProjectAnalysis.js';
import { DbtPreviewCompilationGate } from '../../../../src/application/services/dbt/DbtPreviewCompilationGate.js';
import { projectDbtManifest } from '../../../../src/infrastructure/dbt/dbtManifestProjection.js';
import {
  SELECTED_MODEL_ANALYSIS_SCOPE as scope,
  validSelectedModelProjectAnalysis,
} from '../../analyzeSelectedDbtModelQuery.fixtures.js';

const model = {
  uniqueId: 'model.analytics.orders',
  resourceType: 'model' as const,
  name: 'orders',
  packageName: 'analytics',
  originalFilePath: 'models/orders.sql',
  columns: [],
  tags: [],
  codeOnlyReasons: [],
};
const input = {
  scope,
  projectRoot: 'analytics',
  contentSetSha256: 'd'.repeat(64),
  dbtVersion: '1.10.0',
  adapter: 'postgres',
  targetName: 'production',
  resources: [model],
};

function setup(): {
  analysis: DbtProjectAnalysis;
  analyze: Mock<IDbtProjectAnalyzerPort['analyze']>;
  gate: DbtPreviewCompilationGate;
} {
  const analysis = {
    ...validSelectedModelProjectAnalysis(),
    resources: [{ ...model, compiledSql: 'select 1 as order_id' }],
  };
  const analyze = vi.fn<IDbtProjectAnalyzerPort['analyze']>().mockResolvedValue(analysis);
  return { analysis, analyze, gate: new DbtPreviewCompilationGate({ analyze }) };
}

describe('DbtPreviewCompilationGate', () => {
  it.each(['model', 'test', 'snapshot'] as const)(
    'admits native compiled %s evidence through the real manifest projector',
    async (resourceType) => {
      const uniqueId = `${resourceType}.analytics.orders`;
      const originalFilePath = `${resourceType}s/orders.sql`;
      const { resources } = projectDbtManifest({
        metadata: { dbt_version: '1.10.0', project_name: 'analytics', adapter_type: 'postgres' },
        nodes: {
          [uniqueId]: {
            unique_id: uniqueId,
            resource_type: resourceType,
            name: 'orders',
            package_name: 'analytics',
            original_file_path: originalFilePath,
            compiled_code: 'select 1 as order_id',
          },
        },
        sources: {},
      });
      const { gate, analyze, analysis } = setup();
      analyze.mockResolvedValue({ ...analysis, resources });
      expect(await gate.execute({ ...input, resources })).toEqual({ ok: true });
      expect(analyze).toHaveBeenCalledExactlyOnceWith({
        scope,
        projectRoot: 'analytics',
        operation: {
          kind: 'compile',
          selectors: [`path:${originalFilePath}`],
          targetName: 'production',
        },
      });
    }
  );

  // Parse success is not compilation evidence, even for SQL without Jinja.
  it('requires native compilation against the accepted execution target', async () => {
    const { gate, analyze } = setup();
    expect(await gate.execute(input)).toEqual({ ok: true });
    expect(analyze).toHaveBeenCalledExactlyOnceWith({
      scope,
      projectRoot: 'analytics',
      operation: {
        kind: 'compile',
        selectors: ['path:models/orders.sql'],
        targetName: 'production',
      },
    });
  });

  // An old manifest or another target must never authorize materialization.
  it.each([
    ['invalid', { status: 'invalid' as const }],
    ['unavailable', { status: 'unavailable' as const }],
    ['missing output', { resources: [] }],
    ['blank SQL', { resources: [{ ...model, compiledSql: '  ' }] }],
    ['parse-only result', { resources: [model] }],
    [
      'wrong resource kind',
      { resources: [{ ...model, resourceType: 'source' as const, compiledSql: 'select 1' }] },
    ],
    ['wrong adapter', { adapterType: 'snowflake' }],
    [
      'changed source',
      {
        projectRevision: {
          ...validSelectedModelProjectAnalysis().projectRevision,
          contentSetSha256: 'f'.repeat(64),
        },
      },
    ],
    [
      'wrong project root',
      {
        projectRevision: {
          ...validSelectedModelProjectAnalysis().projectRevision,
          projectRoot: 'other',
        },
      },
    ],
    [
      'changed dbt version',
      {
        projectRevision: {
          ...validSelectedModelProjectAnalysis().projectRevision,
          dbtVersion: '1.11.0',
        },
      },
    ],
  ])('refuses %s before plan admission', async (_reason, override) => {
    const { gate, analyze, analysis } = setup();
    analyze.mockResolvedValue({ ...analysis, ...override });
    expect(await gate.execute(input)).toMatchObject({ ok: false });
  });

  it('refuses analyzer failures without exposing process details', async () => {
    const { gate, analyze } = setup();
    analyze.mockRejectedValue(new Error('private process details'));
    const result = await gate.execute(input);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain('private process details');
  });

  it('does not compile an unresolvable selection', async () => {
    const { gate, analyze } = setup();
    expect(await gate.execute({ ...input, resources: [] })).toMatchObject({ ok: false });
    expect(
      await gate.execute({ ...input, resources: [{ ...model, originalFilePath: undefined }] })
    ).toMatchObject({ ok: false });
    expect(analyze).not.toHaveBeenCalled();
  });

  it('requires SQL for every selected resource', async () => {
    const { gate } = setup();
    expect(
      await gate.execute({
        ...input,
        resources: [
          model,
          { ...model, uniqueId: 'model.analytics.other', originalFilePath: 'models/other.sql' },
        ],
      })
    ).toMatchObject({ ok: false });
  });
});
