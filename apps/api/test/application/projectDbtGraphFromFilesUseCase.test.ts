import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
} from '../../src/application/ports/dbtProjectAnalysis.js';
import { WarehouseConnectionNotFoundError } from '../../src/application/ports/warehouseSourceImport.js';
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
    adapterType: 'postgres',
    projectRevision: {
      projectRoot: 'analytics',
      projectName: 'analytics',
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
              descriptionFilePath: 'models/sources.yml',
              sourceName: 'raw',
              sourceIdentityRef: {
                database: 'analytics',
                connectionId: 'warehouse-prod',
                schema: 'raw',
                databaseUser: 'warehouse_reader',
              },
              sourceTableDeclaration: {
                uniqueId: 'source.analytics.raw.orders',
                filePath: 'models/sources.yml',
                sourceName: 'raw',
                tableName: 'orders',
                database: 'analytics',
                schema: 'raw',
              },
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
              descriptionFilePath: 'models/schema.yml',
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
    semanticEvidence: {
      files: [],
      identities: [],
      regions: [],
      diagnostics: [],
    },
  };
}

function buildUseCase(
  analyze: IDbtProjectAnalyzerPort['analyze'],
  binding = FILE_AUTHORITY,
  executionTarget: {
    readonly provider: string;
    readonly adapter: string;
    readonly targetName: string;
    readonly connectionRef: {
      readonly schemaVersion: 'connection-ref.v1';
      readonly connectionId: string;
      readonly provider: string;
    };
    readonly resolutionSource: 'environment-default';
    readonly credentialRef: string;
  } | null = {
    provider: 'temporal',
    adapter: 'postgres',
    targetName: 'production',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'execution-warehouse',
      provider: 'postgres',
    },
    resolutionSource: 'environment-default',
    credentialRef: 'env:DBT_PROFILES_DIR',
  },
  verifyExecutionBinding: () => Promise<boolean> = async () => true
): {
  readonly useCase: ProjectDbtGraphFromFilesUseCase;
  readonly resolve: ReturnType<typeof vi.fn>;
  readonly getConnection: ReturnType<typeof vi.fn>;
} {
  const resolve = vi.fn().mockResolvedValue(binding);
  const getConnection = vi.fn(async (_scope, connectionId: string) => ({
    id: connectionId,
    name:
      connectionId === 'execution-warehouse'
        ? 'DBT execution warehouse'
        : 'Current production warehouse',
    type: 'postgres' as const,
    database: 'analytics',
    credentialRef: 'env:DBT_PROFILES_DIR',
    sourceObjects: [],
  }));
  return {
    useCase: new ProjectDbtGraphFromFilesUseCase({
      analyzer: { analyze },
      authorityPolicy: { resolve },
      executionConnectionBindingVerifier: { verify: vi.fn(verifyExecutionBinding) },
      executionTargetResolver: { resolve: () => executionTarget },
      connectionCatalog: { getConnection },
    }),
    resolve,
    getConnection,
  };
}

describe('ProjectDbtGraphFromFilesUseCase', () => {
  it('projects analyzer resources by dbt unique_id without draft semantic input', async () => {
    const analyze = vi.fn().mockResolvedValue(analyzerResult());
    const { useCase, resolve } = buildUseCase(analyze);

    const projection = await useCase.execute({
      scope: SCOPE,
      canvasId: FILE_AUTHORITY.canvasId,
      includeGovernedSourceIdentity: true,
    });

    expect(analyze).toHaveBeenCalledWith({ scope: SCOPE, projectRoot: 'analytics' });
    expect(resolve).toHaveBeenCalledWith({ ...SCOPE, canvasId: FILE_AUTHORITY.canvasId });
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
    expect(projection.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uniqueId: 'model.analytics.orders',
          visualEditability: expect.objectContaining({
            status: 'partially_editable',
            operations: ['yaml_description'],
          }),
        }),
        expect.objectContaining({
          uniqueId: 'source.analytics.raw.orders',
          sourceIdentity: {
            database: 'analytics',
            connectionName: 'Current production warehouse',
            schema: 'raw',
            databaseUser: 'warehouse_reader',
          },
          visualEditability: expect.objectContaining({
            status: 'partially_editable',
            operations: ['yaml_description'],
          }),
        }),
      ])
    );
    expect(projection.nodes.find((node) => node.resourceType === 'source')).toMatchObject({
      uniqueId: 'source.analytics.raw.orders',
      name: 'orders',
      sourceName: 'raw',
      originalFilePath: 'models/sources.yml',
    });
    expect(projection.capabilities).toEqual({
      canPreview: true,
      canRun: true,
      codeOnlyResourceCount: 0,
    });
    expect(projection.adapterType).toBe('postgres');
    expect(projection.executionTarget).toEqual({
      provider: 'temporal',
      adapter: 'postgres',
      targetName: 'production',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'execution-warehouse',
        provider: 'postgres',
      },
      resolutionSource: 'environment-default',
      credentialRef: 'env:DBT_PROFILES_DIR',
    });
  });

  it('resolves each stable source connection once per projection', async () => {
    const analysis = analyzerResult();
    const source = analysis.resources.find((resource) => resource.resourceType === 'source');
    expect(source).toBeDefined();
    const analyze = vi.fn().mockResolvedValue({
      ...analysis,
      resources: [
        ...analysis.resources,
        { ...source!, uniqueId: 'source.analytics.raw.customers', name: 'customers' },
      ],
    });
    const { useCase, getConnection } = buildUseCase(analyze);

    await useCase.execute({
      scope: SCOPE,
      canvasId: FILE_AUTHORITY.canvasId,
      includeGovernedSourceIdentity: true,
    });

    expect(getConnection).toHaveBeenCalledTimes(2);
    expect(getConnection).toHaveBeenCalledWith(SCOPE, 'warehouse-prod');
    expect(getConnection).toHaveBeenCalledWith(SCOPE, 'execution-warehouse');
  });

  it('resolves only the execution connection when governed source identity is omitted', async () => {
    const analyze = vi.fn().mockResolvedValue(analyzerResult());
    const { useCase, getConnection } = buildUseCase(analyze);

    const projection = await useCase.execute({
      scope: SCOPE,
      canvasId: FILE_AUTHORITY.canvasId,
    });

    expect(getConnection).toHaveBeenCalledTimes(1);
    expect(getConnection).toHaveBeenCalledWith(SCOPE, 'execution-warehouse');
    expect(projection.nodes).toEqual([
      expect.objectContaining({ uniqueId: 'model.analytics.orders' }),
      expect.not.objectContaining({ sourceIdentity: expect.anything() }),
    ]);
  });

  it.each(['invalid', 'unavailable'] as const)(
    'returns explicit %s projection without executable fallback',
    async (status) => {
      const { useCase } = buildUseCase(vi.fn().mockResolvedValue(analyzerResult(status)));

      const projection = await useCase.execute({ scope: SCOPE, canvasId: FILE_AUTHORITY.canvasId });

      expect(projection.freshness).toBe(status);
      expect(projection.nodes).toEqual([]);
      expect(projection.capabilities.canPreview).toBe(false);
      expect(projection.capabilities.canRun).toBe(false);
      expect(projection.diagnostics).toHaveLength(1);
    }
  );

  it.each([
    { target: null, diagnostic: 'dbt_execution_target_unavailable' },
    {
      target: {
        provider: 'temporal',
        adapter: 'snowflake',
        targetName: 'production',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'snowflake-execution',
          provider: 'snowflake',
        },
        resolutionSource: 'environment-default',
        credentialRef: 'env:DBT_PROFILES_DIR',
      },
      diagnostic: 'dbt_execution_target_adapter_mismatch',
    },
  ] as const)(
    'blocks execution with actionable target diagnostic $diagnostic',
    async ({ target, diagnostic }) => {
      const { useCase } = buildUseCase(
        vi.fn().mockResolvedValue(analyzerResult()),
        FILE_AUTHORITY,
        target
      );

      const projection = await useCase.execute({ scope: SCOPE, canvasId: FILE_AUTHORITY.canvasId });

      expect(projection.capabilities).toMatchObject({ canPreview: false, canRun: false });
      expect(projection.diagnostics).toContainEqual(
        expect.objectContaining({ code: diagnostic, severity: 'error' })
      );
    }
  );

  it('fails closed when the configured execution connection is absent from the workspace', async () => {
    const { useCase, getConnection } = buildUseCase(vi.fn().mockResolvedValue(analyzerResult()));
    getConnection.mockRejectedValue(new WarehouseConnectionNotFoundError('execution-warehouse'));

    const projection = await useCase.execute({ scope: SCOPE, canvasId: FILE_AUTHORITY.canvasId });

    expect(projection.capabilities).toMatchObject({ canPreview: false, canRun: false });
    expect(projection.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'dbt_execution_connection_missing',
        severity: 'error',
      })
    );
  });

  it('fails closed when the dbt profile does not resolve to the governed connection', async () => {
    const { useCase } = buildUseCase(
      vi.fn().mockResolvedValue(analyzerResult()),
      FILE_AUTHORITY,
      undefined,
      async () => false
    );

    const projection = await useCase.execute({ scope: SCOPE, canvasId: FILE_AUTHORITY.canvasId });

    expect(projection.capabilities).toMatchObject({ canPreview: false, canRun: false });
    expect(projection.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'dbt_execution_connection_binding_invalid',
        severity: 'error',
      })
    );
  });

  it('rejects graph-draft authority instead of inferring file authority', async () => {
    const analyze = vi.fn();
    const { useCase } = buildUseCase(analyze, {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas-orders',
      authority: { kind: 'graph-draft' },
    });

    await expect(
      useCase.execute({
        scope: SCOPE,
        canvasId: 'canvas-orders',
      })
    ).rejects.toThrow('dbt-project-files authority');
    expect(analyze).not.toHaveBeenCalled();
  });
});
