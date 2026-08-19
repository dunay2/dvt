import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
} from '../../src/application/ports/dbtProjectAnalysis.js';
import {
  CanvasAuthoringAuthorityMissingError,
  CanvasAuthoringAuthorityMixedError,
} from '../../src/application/services/canvasAuthoringAuthorityPolicy.js';
import { CompileGraphDbtModelsQuery } from '../../src/application/services/compileGraphDbtModelsQuery.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;
const GRAPH_AUTHORITY: CanvasAuthoringAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'canvas-dbt',
  authority: { kind: 'graph-draft' },
};

describe('CompileGraphDbtModelsQuery', () => {
  it('returns selected native compiled SQL from the published workspace project', async () => {
    const analyze = vi.fn<IDbtProjectAnalyzerPort['analyze']>().mockResolvedValue(
      analysis({
        resources: [
          resource('model.analytics.orders', 'orders', 'select * from raw.orders'),
          resource('model.analytics.customers', 'customers', 'select * from raw.customers'),
        ],
      })
    );
    const query = new CompileGraphDbtModelsQuery({
      analyzer: { analyze },
      authorityPolicy: { resolve: vi.fn().mockResolvedValue(GRAPH_AUTHORITY) },
    });

    const result = await query.execute({
      scope: SCOPE,
      canvasId: 'canvas-dbt',
      selectors: ['orders', 'customers'],
    });

    expect(result).toMatchObject({
      kind: 'compiled',
      canvasId: 'canvas-dbt',
      models: [
        { selector: 'customers', compiledSql: 'select * from raw.customers' },
        { selector: 'orders', compiledSql: 'select * from raw.orders' },
      ],
    });
    expect(analyze).toHaveBeenCalledWith({
      scope: SCOPE,
      projectRoot: '.',
      operation: { kind: 'compile', selectors: ['customers', 'orders'] },
    });
  });

  it.each([
    ['missing_authority', new CanvasAuthoringAuthorityMissingError('canvas-dbt')],
    ['mixed_authority', new CanvasAuthoringAuthorityMixedError('canvas-dbt')],
  ] as const)('fails closed for %s', async (reason, error) => {
    const analyze = vi.fn<IDbtProjectAnalyzerPort['analyze']>();
    const query = new CompileGraphDbtModelsQuery({
      analyzer: { analyze },
      authorityPolicy: { resolve: vi.fn().mockRejectedValue(error) },
    });

    await expect(
      query.execute({ scope: SCOPE, canvasId: 'canvas-dbt', selectors: ['orders'] })
    ).resolves.toEqual({
      schemaVersion: 'graph-dbt-model-compilation.v1',
      kind: 'authority_refused',
      canvasId: 'canvas-dbt',
      reason,
    });
    expect(analyze).not.toHaveBeenCalled();
  });

  it('keeps file-backed authority out of the Graph Draft compile query', async () => {
    const analyze = vi.fn<IDbtProjectAnalyzerPort['analyze']>();
    const query = new CompileGraphDbtModelsQuery({
      analyzer: { analyze },
      authorityPolicy: {
        resolve: vi.fn().mockResolvedValue({
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: 'canvas-dbt',
          authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
        }),
      },
    });

    expect(
      await query.execute({ scope: SCOPE, canvasId: 'canvas-dbt', selectors: ['orders'] })
    ).toMatchObject({ kind: 'authority_refused', reason: 'dbt_project_files_authority' });
    expect(analyze).not.toHaveBeenCalled();
  });

  it('rejects unsafe selectors before authority or process access', async () => {
    const analyze = vi.fn<IDbtProjectAnalyzerPort['analyze']>();
    const resolve = vi.fn();
    const query = new CompileGraphDbtModelsQuery({
      analyzer: { analyze },
      authorityPolicy: { resolve },
    });

    await expect(
      query.execute({
        scope: SCOPE,
        canvasId: 'canvas-dbt',
        selectors: ['orders; drop table users'],
      })
    ).rejects.toThrow();
    expect(resolve).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it('fails closed when DBT omits compiled SQL for a requested selector', async () => {
    const query = new CompileGraphDbtModelsQuery({
      analyzer: { analyze: vi.fn().mockResolvedValue(analysis()) },
      authorityPolicy: { resolve: vi.fn().mockResolvedValue(GRAPH_AUTHORITY) },
    });

    expect(
      await query.execute({ scope: SCOPE, canvasId: 'canvas-dbt', selectors: ['orders'] })
    ).toEqual({
      schemaVersion: 'graph-dbt-model-compilation.v1',
      kind: 'invalid',
      canvasId: 'canvas-dbt',
      diagnostics: [
        {
          code: 'dbt_compiled_model_missing',
          message: 'Native dbt compilation did not produce SQL for model selector orders.',
        },
      ],
    });
  });
});

function resource(uniqueId: string, name: string, compiledSql: string) {
  return {
    uniqueId,
    resourceType: 'model' as const,
    name,
    packageName: 'analytics',
    columns: [],
    tags: [],
    codeOnlyReasons: [],
    compiledSql,
  };
}

function analysis(overrides: Partial<DbtProjectAnalysis> = {}): DbtProjectAnalysis {
  return {
    status: 'valid',
    projectRevision: {
      projectRoot: '.',
      projectName: 'analytics',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: '2026-08-19T22:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v1',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'b'.repeat(64),
    resources: [],
    dependencies: [],
    diagnostics: [],
    semanticEvidence: { files: [], identities: [], regions: [], diagnostics: [] },
    ...overrides,
  };
}
