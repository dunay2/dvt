/** Prove accepted file plans address the compiled resource in its native dbt manifest. */
import { describe, expect, it, vi, type Mock } from 'vitest';

import type { IDbtProjectAnalyzerPort } from '../../../../src/application/ports/dbtProjectAnalysis.js';
import { DbtPreviewCompilationGate } from '../../../../src/application/services/dbt/DbtPreviewCompilationGate.js';
import { projectDbtManifest } from '../../../../src/infrastructure/dbt/dbtManifestProjection.js';
import {
  SELECTED_MODEL_ANALYSIS_SCOPE as scope,
  validSelectedModelProjectAnalysis,
} from '../../analyzeSelectedDbtModelQuery.fixtures.js';

type NativeResource = {
  unique_id: string;
  resource_type: 'model' | 'test' | 'snapshot';
  name: string;
  package_name: string;
  fqn: string[];
  original_file_path: string;
  compiled_code: string;
};

function nativeResource(
  resourceType: NativeResource['resource_type'],
  uniqueId: string
): NativeResource {
  return {
    unique_id: uniqueId,
    resource_type: resourceType,
    name: 'orders',
    package_name: 'analytics',
    fqn: ['analytics', 'nested', 'orders'],
    original_file_path: `${resourceType}s\\orders.sql`,
    compiled_code: 'select 1 as order_id',
  };
}

function manifest(nodes: NativeResource[]): unknown {
  return {
    metadata: { dbt_version: '1.10.0', project_name: 'analytics', adapter_type: 'postgres' },
    nodes: Object.fromEntries(nodes.map((node) => [node.unique_id, node])),
    sources: {},
  };
}

function compile(nodes: NativeResource[]): {
  admission: ReturnType<DbtPreviewCompilationGate['execute']>;
  analyze: Mock<IDbtProjectAnalyzerPort['analyze']>;
} {
  const { resources } = projectDbtManifest(manifest(nodes), 'compile');
  const analysis = { ...validSelectedModelProjectAnalysis(), resources };
  const analyze = vi.fn<IDbtProjectAnalyzerPort['analyze']>().mockResolvedValue(analysis);
  const gate = new DbtPreviewCompilationGate({ analyze });
  const { contentSetSha256, projectRoot } = analysis.projectRevision;
  const admission = gate.execute({
    scope,
    projectRoot,
    contentSetSha256,
    adapter: 'postgres',
    dbtVersion: '1.10.0',
    targetName: 'production',
    resources: [resources[0]!],
  });
  return { admission, analyze };
}

describe('compiled dbt step selectors', () => {
  it.each(['model', 'test', 'snapshot'] as const)(
    'binds native compiled %s evidence to its package, kind, original filename and FQN',
    async (kind) => {
      const uniqueId = `${kind}.analytics.orders`;
      const { admission, analyze } = compile([nativeResource(kind, uniqueId)]);
      expect(await admission).toEqual({
        ok: true,
        selectors: new Map([
          [
            uniqueId,
            {
              version: 'v1',
              uniqueId,
              selector: `package:analytics,resource_type:${kind},file:orders.sql,fqn:analytics.nested.orders`,
            },
          ],
        ]),
      });
      expect(analyze).toHaveBeenCalledExactlyOnceWith({
        scope,
        projectRoot: 'analytics',
        operation: {
          kind: 'compile',
          selectors: [`path:${kind}s/orders.sql`],
          targetName: 'production',
        },
      });
    }
  );

  it('refuses two declarations in one file that match the same native FQN prefix', async () => {
    const first = nativeResource('test', 'test.analytics.orders.abc');
    const second = {
      ...first,
      unique_id: 'test.analytics.orders.def',
      fqn: [...first.fqn, 'other'],
    };
    expect(await compile([first, second]).admission).toMatchObject({ ok: false });
  });

  it('keeps the previous parse projection used in historical revision hashes', () => {
    const parsed = projectDbtManifest(
      manifest([nativeResource('model', 'model.analytics.orders')]),
      'parse'
    );
    expect(parsed.resources[0]?.fqn).toBeUndefined();
  });
});
