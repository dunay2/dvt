import { createHash } from 'node:crypto';

import {
  DbtProjectGraphProjectionSchema,
  type CanvasAuthoringAuthorityBinding,
  type DbtProjectGraphProjection,
  type SourceObject,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

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

function createWorkspaceFiles(): IWorkspaceFileRepository {
  return {
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (_scope, filePath) => {
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

function createProjection(): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: AUTHORITY,
    freshness: 'fresh',
    projectRevision: {
      projectRoot: 'analytics',
      contentSetSha256: 'c'.repeat(64),
      analyzedAt: '2026-07-14T00:00:00.000Z',
      analyzerVersion: 'test-analyzer',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'b'.repeat(64),
    nodes: [
      {
        uniqueId: 'source.analytics.warehouse_prod_analytics_erp.orders',
        resourceType: 'source',
        name: 'orders',
        packageName: 'analytics',
        sourceName: 'warehouse_prod_analytics_erp',
        originalFilePath: 'models/sources/src_erp.yml',
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
