import { createHash } from 'node:crypto';

import {
  DbtProjectGraphProjectionSchema,
  type CanvasAuthoringAuthorityBinding,
  type DbtProjectGraphProjection,
  type SourceObject,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { InvalidWarehouseSourceImportRequestError } from '../../../src/application/ports/warehouseSourceImport.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchMutation,
  WorkspaceStorageScope,
} from '../../../src/application/ports/workspaceFiles.js';
import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import {
  DbtProjectFilesWarehouseSourceImportStrategy,
  WarehouseSourceImportProjectionError,
} from '../../../src/application/services/dbtProjectFilesWarehouseSourceImportStrategy.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../../../src/application/services/projectDbtGraphFromFilesUseCase.js';
import type { WarehouseSourceImportCommandContext } from '../../../src/application/services/warehouseSourceImportPlan.js';

const SCOPE = {
  tenantId: 'tenant-source',
  projectId: 'project-source',
  environmentId: 'environment-source',
} as const;

const AUTHORITY: CanvasAuthoringAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'orders-canvas',
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
};

describe('DbtProjectFilesWarehouseSourceImportStrategy', () => {
  it('writes beneath persisted project authority and returns analyzer-owned source identities', async () => {
    const batchMutation = createBatchMutation();
    const projectGraph = { execute: vi.fn(async () => createProjection()) };
    const strategy = createStrategy(batchMutation, projectGraph);

    const result = await strategy.execute(CONTEXT, AUTHORITY);

    expect(batchMutation.apply).toHaveBeenCalledWith(
      SCOPE,
      expect.objectContaining({
        idempotencyKey: 'source-import-1:apply',
        writes: [
          expect.objectContaining({
            path: 'analytics/models/sources/src_erp.yml',
            content: expect.stringContaining('name: orders'),
          }),
        ],
      })
    );
    expect(projectGraph.execute).toHaveBeenCalledWith({
      scope: SCOPE,
      canvasId: 'orders-canvas',
    });
    expect(result).toMatchObject({
      sourcesCreated: 1,
      yamlFiles: ['analytics/models/sources/src_erp.yml'],
      outcome: {
        kind: 'dbt-project-files',
        analysisSha256: 'b'.repeat(64),
        projectedSourceUniqueIds: ['source.analytics.warehouse_prod_analytics_erp.orders'],
      },
    });
  });

  it('enriches the exact imported source table instead of generating a parallel YAML file', async () => {
    const existingContent = [
      'version: 2',
      '',
      'sources:',
      '  - name: raw',
      '    database: analytics',
      '    schema: erp',
      '    description: Existing source metadata',
      '    tables:',
      '      - name: orders',
      '        description: Existing table metadata',
      '',
    ].join('\n');
    const batchMutation = createBatchMutation();
    const projectGraph = {
      execute: vi.fn(async () =>
        createProjection({
          uniqueId: 'source.analytics.raw.orders',
          sourceName: 'raw',
          originalFilePath: 'models/sources.yml',
        })
      ),
    };
    const strategy = new DbtProjectFilesWarehouseSourceImportStrategy({
      workspaceFiles: createWorkspaceFiles({
        'analytics/models/sources.yml': existingContent,
      }),
      batchMutation,
      projectGraph,
    });
    const context: WarehouseSourceImportCommandContext = {
      ...CONTEXT,
      databaseUser: 'warehouse_reader',
      existingDbtSourceTargets: [
        {
          objectId: SOURCE_OBJECT.objectId,
          sourceUniqueId: 'source.analytics.raw.orders',
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'orders',
        },
      ],
    };

    const result = await strategy.execute(context, AUTHORITY);

    expect(batchMutation.apply).toHaveBeenCalledWith(
      SCOPE,
      expect.objectContaining({
        writes: [
          expect.objectContaining({
            path: 'analytics/models/sources.yml',
            content: expect.stringMatching(
              /description: Existing source metadata[\s\S]*description: Existing table metadata[\s\S]*connection_id: warehouse-prod/
            ),
          }),
        ],
      })
    );
    expect(result.yamlFiles).toEqual(['analytics/models/sources.yml']);
    expect(result.outcome).toMatchObject({
      kind: 'dbt-project-files',
      projectedSourceUniqueIds: ['source.analytics.raw.orders'],
    });
  });

  it('rejects an exact dbt source binding when the governed database user is unavailable', async () => {
    const existingContent = [
      'version: 2',
      '',
      'sources:',
      '  - name: raw',
      '    database: analytics',
      '    schema: erp',
      '    tables:',
      '      - name: orders',
      '',
    ].join('\n');
    const strategy = new DbtProjectFilesWarehouseSourceImportStrategy({
      workspaceFiles: createWorkspaceFiles({
        'analytics/models/sources.yml': existingContent,
      }),
      batchMutation: createBatchMutation(),
      projectGraph: { execute: vi.fn(async () => createProjection()) },
    });
    const { databaseUser: _databaseUser, ...contextWithoutDatabaseUser } = CONTEXT;

    await expect(
      strategy.execute(
        {
          ...contextWithoutDatabaseUser,
          existingDbtSourceTargets: [
            {
              objectId: SOURCE_OBJECT.objectId,
              sourceUniqueId: 'source.analytics.raw.orders',
              filePath: 'models/sources.yml',
              sourceName: 'raw',
              tableName: 'orders',
            },
          ],
        },
        AUTHORITY
      )
    ).rejects.toBeInstanceOf(InvalidWarehouseSourceImportRequestError);
  });

  it('rolls back YAML and rejects success when the refreshed projection is not fresh', async () => {
    const batchMutation = createBatchMutation();
    const projectGraph = {
      execute: vi.fn(async () => ({ ...createProjection(), freshness: 'invalid' as const })),
    };
    const strategy = createStrategy(batchMutation, projectGraph);

    await expect(strategy.execute(CONTEXT, AUTHORITY)).rejects.toBeInstanceOf(
      WarehouseSourceImportProjectionError
    );
    expect(batchMutation.apply).toHaveBeenCalledTimes(2);
    expect(batchMutation.apply).toHaveBeenLastCalledWith(
      SCOPE,
      expect.objectContaining({
        idempotencyKey: 'source-import-1:rollback',
        writes: [],
        deletes: ['analytics/models/sources/src_erp.yml'],
      })
    );
  });

  it('does not roll back YAML owned by an earlier deduplicated import', async () => {
    const batchMutation = createBatchMutation({ deduplicated: true });
    const projectGraph = {
      execute: vi.fn(async () => ({ ...createProjection(), freshness: 'invalid' as const })),
    };
    const strategy = createStrategy(batchMutation, projectGraph);

    await expect(strategy.execute(CONTEXT, AUTHORITY)).rejects.toBeInstanceOf(
      WarehouseSourceImportProjectionError
    );

    expect(batchMutation.apply).toHaveBeenCalledTimes(1);
  });
});

const SOURCE_OBJECT: SourceObject = {
  objectId: 'relation/analytics/erp/orders',
  displayName: 'orders',
  locator: {
    kind: 'relation',
    catalog: 'analytics',
    schema: 'erp',
    name: 'orders',
    relationType: 'table',
  },
  metricEvidence: {
    observedAt: '2026-07-14T00:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: { value: 42, provenance: 'measured', method: 'data-scan', confidence: 'exact' },
    byteSize: {
      value: 2048,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  },
};

const CONTEXT: WarehouseSourceImportCommandContext = {
  scope: SCOPE,
  canvasId: 'orders-canvas',
  idempotencyKey: 'source-import-1',
  connection: {
    id: 'warehouse-prod',
    name: 'Production warehouse',
    type: 'postgres',
    database: 'analytics',
  },
  sourceObjects: [
    {
      ...SOURCE_OBJECT,
      locator: SOURCE_OBJECT.locator as Extract<SourceObject['locator'], { kind: 'relation' }>,
      connectionId: 'warehouse-prod',
    },
  ],
  groupingStrategy: 'schema',
  includeColumns: true,
  addTests: false,
  addFreshness: false,
};

function createStrategy(
  batchMutation: IWorkspaceFileBatchMutationPort,
  projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>
): DbtProjectFilesWarehouseSourceImportStrategy {
  return new DbtProjectFilesWarehouseSourceImportStrategy({
    workspaceFiles: createWorkspaceFiles(),
    batchMutation,
    projectGraph,
  });
}

function createWorkspaceFiles(
  contents: Readonly<Record<string, string>> = {}
): IWorkspaceFileRepository {
  return {
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (_scope, filePath) => {
      const content = contents[filePath];
      if (content !== undefined) {
        return {
          path: filePath,
          name: filePath.split('/').at(-1) ?? filePath,
          language: 'yaml',
          content,
          contentSha256: sha256(content),
          lastModified: '2026-07-14T00:00:00.000Z',
        };
      }
      throw new WorkspaceFileNotFoundError(filePath);
    }),
    saveFileContent: vi.fn(),
    deleteFileContent: vi.fn(),
  };
}

function createBatchMutation(
  options: Readonly<{ deduplicated?: boolean }> = {}
): IWorkspaceFileBatchMutationPort {
  return {
    apply: vi.fn(async (_scope: WorkspaceStorageScope, mutation: WorkspaceFileBatchMutation) => ({
      kind: 'applied' as const,
      idempotencyKey: mutation.idempotencyKey,
      requestHash: 'a'.repeat(64),
      deduplicated: options.deduplicated ?? false,
      writes: mutation.writes.map((write) => ({
        path: write.path,
        contentSha256: sha256(write.content),
      })),
      deletes: [...mutation.deletes],
    })),
  };
}

function createProjection(
  source: Readonly<{
    uniqueId: string;
    sourceName: string;
    originalFilePath: string;
  }> = {
    uniqueId: 'source.analytics.warehouse_prod_analytics_erp.orders',
    sourceName: 'warehouse_prod_analytics_erp',
    originalFilePath: 'models/sources/src_erp.yml',
  }
): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: AUTHORITY,
    freshness: 'fresh',
    projectRevision: {
      projectRoot: 'analytics',
      projectName: 'analytics',
      contentSetSha256: 'c'.repeat(64),
      analyzedAt: '2026-07-14T00:00:00.000Z',
      analyzerVersion: 'test-analyzer',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'b'.repeat(64),
    nodes: [
      {
        uniqueId: source.uniqueId,
        resourceType: 'source',
        name: 'orders',
        packageName: 'analytics',
        sourceName: source.sourceName,
        originalFilePath: source.originalFilePath,
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['source definition'] },
      },
    ],
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 1 },
  });
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
