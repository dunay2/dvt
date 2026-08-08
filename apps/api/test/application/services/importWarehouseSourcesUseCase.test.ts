import {
  DbtProjectGraphProjectionSchema,
  type CanvasAuthoringAuthorityBinding,
  type SourceObject,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  ImportWarehouseSourcesInput,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import {
  InvalidWarehouseSourceImportRequestError,
  SourceObjectNotFoundError,
  UnsupportedSourceObjectImportError,
} from '../../../src/application/ports/warehouseSourceImport.js';
import { CanvasAuthoringAuthorityMissingError } from '../../../src/application/services/canvasAuthoringAuthorityPolicy.js';
import { ImportWarehouseSourcesUseCase } from '../../../src/application/services/importWarehouseSourcesUseCase.js';
import type { WarehouseSourceImportStrategyResult } from '../../../src/application/services/warehouseSourceImportPlan.js';
import { InvalidWarehouseSourceYamlError } from '../../../src/application/services/warehouseSourceYaml.js';

const SCOPE = {
  tenantId: 'tenant-source',
  projectId: 'project-source',
  environmentId: 'environment-source',
} as const;

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
  columns: [{ name: 'order_id', type: 'integer', nullable: false }],
  metricEvidence: {
    observedAt: '2026-07-14T00:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: 42,
      provenance: 'measured',
      method: 'data-scan',
      confidence: 'exact',
    },
    byteSize: {
      value: 2048,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  },
};

const CONNECTION: WarehouseConnectionCatalogEntry = {
  id: 'warehouse-prod',
  name: 'Production warehouse',
  type: 'postgres',
  database: 'analytics',
  credentialRef: 'env:DVT_WAREHOUSE_URL',
  sourceObjects: [SOURCE_OBJECT],
};

const INPUT: ImportWarehouseSourcesInput = {
  schemaVersion: 'source-import-request.v2',
  scope: SCOPE,
  canvasId: 'orders-canvas',
  idempotencyKey: 'source-import-1',
  connectionId: CONNECTION.id,
  objects: [{ objectId: SOURCE_OBJECT.objectId }],
  groupingStrategy: 'schema',
  includeColumns: true,
  addTests: false,
  addFreshness: false,
};

const GRAPH_AUTHORITY: CanvasAuthoringAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: INPUT.canvasId,
  authority: { kind: 'graph-draft' },
};

const FILE_AUTHORITY: CanvasAuthoringAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: INPUT.canvasId,
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
};

const DBT_PROJECTION = DbtProjectGraphProjectionSchema.parse({
  schemaVersion: 'dbt-project-graph-projection.v1',
  authorityBinding: FILE_AUTHORITY,
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
  nodes: [],
  edges: [],
  diagnostics: [],
  capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 0 },
});

describe('ImportWarehouseSourcesUseCase', () => {
  it('resolves persisted graph authority and delegates only the graph strategy', async () => {
    const harness = createHarness(GRAPH_AUTHORITY);

    const result = await harness.useCase.execute(INPUT);

    expect(harness.authorityPolicy.resolve).toHaveBeenCalledWith({
      ...SCOPE,
      canvasId: INPUT.canvasId,
    });
    expect(harness.graphDraftStrategy.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: SCOPE,
        canvasId: INPUT.canvasId,
        idempotencyKey: INPUT.idempotencyKey,
        sourceObjects: [expect.objectContaining({ connectionId: CONNECTION.id })],
      }),
      GRAPH_AUTHORITY
    );
    expect(harness.dbtProjectFilesStrategy.execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      schemaVersion: 'source-import-result.v2',
      idempotencyKey: INPUT.idempotencyKey,
      authorityBinding: GRAPH_AUTHORITY,
      objectsImported: 1,
      outcome: { kind: 'graph-draft', importedNodeIds: ['source-node-1'] },
    });
  });

  it('delegates file authority without invoking graph-draft mutation', async () => {
    const harness = createHarness(FILE_AUTHORITY);

    const result = await harness.useCase.execute(INPUT);

    expect(harness.graphDraftStrategy.execute).not.toHaveBeenCalled();
    expect(harness.dbtProjectFilesStrategy.execute).toHaveBeenCalledWith(
      expect.objectContaining({ canvasId: INPUT.canvasId }),
      FILE_AUTHORITY
    );
    expect(result).toMatchObject({
      authorityBinding: FILE_AUTHORITY,
      yamlFiles: ['analytics/models/sources/src_erp.yml'],
      outcome: {
        kind: 'dbt-project-files',
        projectedSourceUniqueIds: ['source.analytics.erp.orders'],
      },
    });
  });

  it('rejects an invalid V2 request before catalog or authority access', async () => {
    const harness = createHarness(GRAPH_AUTHORITY);

    await expect(harness.useCase.execute({ ...INPUT, canvasId: '' })).rejects.toBeInstanceOf(
      InvalidWarehouseSourceImportRequestError
    );
    expect(harness.sourceObjectReader.read).not.toHaveBeenCalled();
    expect(harness.authorityPolicy.resolve).not.toHaveBeenCalled();
  });

  it('rejects missing Canvas authority before external source discovery', async () => {
    const harness = createHarness(GRAPH_AUTHORITY);
    harness.authorityPolicy.resolve.mockRejectedValueOnce(
      new CanvasAuthoringAuthorityMissingError(INPUT.canvasId)
    );

    await expect(harness.useCase.execute(INPUT)).rejects.toBeInstanceOf(
      CanvasAuthoringAuthorityMissingError
    );

    expect(harness.authorityPolicy.resolve).toHaveBeenCalledWith({
      ...SCOPE,
      canvasId: INPUT.canvasId,
    });
    expect(harness.sourceObjectReader.read).not.toHaveBeenCalled();
    expect(harness.graphDraftStrategy.execute).not.toHaveBeenCalled();
    expect(harness.dbtProjectFilesStrategy.execute).not.toHaveBeenCalled();
  });

  it('rejects missing and non-relational source identities before mutation', async () => {
    const missingHarness = createHarness(GRAPH_AUTHORITY);
    await expect(
      missingHarness.useCase.execute({
        ...INPUT,
        objects: [{ objectId: 'relation/analytics/erp/missing' }],
      })
    ).rejects.toBeInstanceOf(SourceObjectNotFoundError);

    const fileObject: SourceObject = {
      ...SOURCE_OBJECT,
      objectId: 'file/orders',
      locator: { kind: 'file', path: 'orders.parquet', format: 'parquet' },
    };
    const fileHarness = createHarness(GRAPH_AUTHORITY, [fileObject]);
    await expect(
      fileHarness.useCase.execute({ ...INPUT, objects: [{ objectId: fileObject.objectId }] })
    ).rejects.toBeInstanceOf(UnsupportedSourceObjectImportError);
    expect(fileHarness.graphDraftStrategy.execute).not.toHaveBeenCalled();
  });

  it('translates invalid existing YAML into the stable command error', async () => {
    const harness = createHarness(GRAPH_AUTHORITY);
    harness.graphDraftStrategy.execute.mockRejectedValueOnce(
      new InvalidWarehouseSourceYamlError(new Error('invalid YAML'))
    );

    await expect(harness.useCase.execute(INPUT)).rejects.toMatchObject({
      name: 'InvalidWarehouseSourceImportRequestError',
      reason: 'invalid_existing_source_yaml',
    });
  });
});

function createHarness(
  authorityBinding: CanvasAuthoringAuthorityBinding,
  sourceObjects: readonly SourceObject[] = [SOURCE_OBJECT]
): Readonly<{
  sourceObjectReader: { read: ReturnType<typeof vi.fn> };
  authorityPolicy: { resolve: ReturnType<typeof vi.fn> };
  graphDraftStrategy: { execute: ReturnType<typeof vi.fn> };
  dbtProjectFilesStrategy: { execute: ReturnType<typeof vi.fn> };
  useCase: ImportWarehouseSourcesUseCase;
}> {
  const sourceObjectReader = {
    read: vi.fn(async () => ({ connection: CONNECTION, sourceObjects })),
  };
  const authorityPolicy = { resolve: vi.fn(async () => authorityBinding) };
  const graphResult: WarehouseSourceImportStrategyResult = {
    sourcesCreated: 1,
    yamlFiles: ['models/sources/src_erp.yml'],
    outcome: {
      kind: 'graph-draft',
      draftRevision: 'draft-revision-2',
      importedNodeIds: ['source-node-1'],
    },
  };
  const fileResult: WarehouseSourceImportStrategyResult = {
    sourcesCreated: 1,
    yamlFiles: ['analytics/models/sources/src_erp.yml'],
    outcome: {
      kind: 'dbt-project-files',
      projectRevision: DBT_PROJECTION.projectRevision,
      analysisSha256: DBT_PROJECTION.analysisSha256,
      projectedSourceUniqueIds: ['source.analytics.erp.orders'],
    },
  };
  const graphDraftStrategy = { execute: vi.fn(async () => graphResult) };
  const dbtProjectFilesStrategy = { execute: vi.fn(async () => fileResult) };
  return {
    sourceObjectReader,
    authorityPolicy,
    graphDraftStrategy,
    dbtProjectFilesStrategy,
    useCase: new ImportWarehouseSourcesUseCase({
      sourceObjectReader,
      authorityPolicy,
      graphDraftStrategy,
      dbtProjectFilesStrategy,
    }),
  };
}
