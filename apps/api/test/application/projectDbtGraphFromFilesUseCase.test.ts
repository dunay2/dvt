import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
} from '../../src/application/ports/dbtProjectAnalysis.js';
import { ProjectDbtGraphFromFilesUseCase } from '../../src/application/services/projectDbtGraphFromFilesUseCase.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

const FILE_AUTHORITY: CanvasAuthoringAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'canvas-orders',
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
};

function analyzerResult(status: 'valid' | 'invalid' | 'unavailable' = 'valid'): DbtProjectAnalysis {
  return {
    status,
    projectRevision: {
      projectRoot: 'analytics',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: '2026-07-13T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v1',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'b'.repeat(64),
    resources:
      status === 'valid'
        ? [
            {
              uniqueId: 'source.analytics.raw.orders',
              resourceType: 'source' as const,
              name: 'orders',
              packageName: 'analytics',
              originalFilePath: 'models/sources.yml',
              sourceName: 'raw',
              columns: [{ name: 'order_id', dataType: 'integer' }],
              tags: ['raw'],
              codeOnlyReasons: ['phase_two_read_only_projection'],
            },
            {
              uniqueId: 'model.analytics.orders',
              resourceType: 'model' as const,
              name: 'orders',
              packageName: 'analytics',
              originalFilePath: 'models/orders.sql',
              materialized: 'table',
              columns: [],
              tags: [],
              codeOnlyReasons: ['phase_two_read_only_projection'],
            },
          ]
        : [],
    dependencies:
      status === 'valid'
        ? [
            {
              sourceUniqueId: 'source.analytics.raw.orders',
              targetUniqueId: 'model.analytics.orders',
              relation: 'dependency' as const,
            },
          ]
        : [],
    diagnostics:
      status === 'valid'
        ? []
        : [
            {
              code: status === 'invalid' ? 'dbt_project_invalid' : 'dbt_analyzer_unavailable',
              severity: 'error' as const,
              message: status === 'invalid' ? 'Invalid dbt project.' : 'dbt is unavailable.',
            },
          ],
  };
}

describe('ProjectDbtGraphFromFilesUseCase', () => {
  it('projects analyzer resources by dbt unique_id without draft semantic input', async () => {
    const analyze = vi.fn().mockResolvedValue(analyzerResult());
    const useCase = new ProjectDbtGraphFromFilesUseCase({
      analyzer: { analyze } as IDbtProjectAnalyzerPort,
    });

    const projection = await useCase.execute({ scope: SCOPE, authorityBinding: FILE_AUTHORITY });

    expect(analyze).toHaveBeenCalledWith({ scope: SCOPE, projectRoot: 'analytics' });
    expect(projection.nodes.map((node) => node.uniqueId)).toEqual([
      'model.analytics.orders',
      'source.analytics.raw.orders',
    ]);
    expect(projection.edges).toEqual([
      {
        id: 'source.analytics.raw.orders->model.analytics.orders:dependency',
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
      },
    ]);
    expect(projection.nodes.every((node) => node.visualEditability.status === 'code_only')).toBe(
      true
    );
    expect(projection.capabilities).toEqual({
      canPreview: false,
      canRun: false,
      codeOnlyResourceCount: 2,
    });
  });

  it.each(['invalid', 'unavailable'] as const)(
    'returns explicit %s projection without executable fallback',
    async (status) => {
      const useCase = new ProjectDbtGraphFromFilesUseCase({
        analyzer: { analyze: vi.fn().mockResolvedValue(analyzerResult(status)) },
      });

      const projection = await useCase.execute({ scope: SCOPE, authorityBinding: FILE_AUTHORITY });

      expect(projection.freshness).toBe(status);
      expect(projection.nodes).toEqual([]);
      expect(projection.capabilities.canPreview).toBe(false);
      expect(projection.capabilities.canRun).toBe(false);
      expect(projection.diagnostics).toHaveLength(1);
    }
  );

  it('rejects graph-draft authority instead of inferring file authority', async () => {
    const analyze = vi.fn();
    const useCase = new ProjectDbtGraphFromFilesUseCase({ analyzer: { analyze } });

    await expect(
      useCase.execute({
        scope: SCOPE,
        authorityBinding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: 'canvas-orders',
          authority: { kind: 'graph-draft' },
        },
      })
    ).rejects.toThrow('dbt-project-files authority');
    expect(analyze).not.toHaveBeenCalled();
  });
});
