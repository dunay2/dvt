import {
  buildRelationalSourceObjectId,
  type SourceObject,
  type SourceObjectMetricEvidence,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { WarehouseConnectionNotFoundError } from '../../../src/application/ports/warehouseSourceImport.js';
import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import type {
  IWorkspaceFileRepository,
  WorkspaceFileContent,
  WorkspaceFileEntry,
  WorkspaceStorageScope,
} from '../../../src/application/ports/workspaceFiles.js';
import {
  WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
  WorkspaceWarehouseConnectionCatalog,
} from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';

const SCOPE_A = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'environment-a',
} as const satisfies WorkspaceGraphDraftScope;

const SCOPE_B = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'environment-b',
} as const satisfies WorkspaceGraphDraftScope;

class MemoryWorkspaceFileRepository implements IWorkspaceFileRepository {
  private readonly files = new Map<string, string>();

  public constructor(initialFiles: Record<string, string>) {
    for (const [path, content] of Object.entries(initialFiles)) {
      this.files.set(this.key(SCOPE_A, path), content);
    }
  }

  public async listFiles(_scope: WorkspaceStorageScope): Promise<readonly WorkspaceFileEntry[]> {
    return [];
  }

  public async getFileContent(
    scope: WorkspaceStorageScope,
    path: string
  ): Promise<WorkspaceFileContent> {
    const content = this.files.get(this.key(scope, path));
    if (content === undefined) throw new WorkspaceFileNotFoundError(path);
    return {
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content,
      lastModified: '2026-05-31T00:00:00.000Z',
    };
  }

  public async saveFileContent(
    scope: WorkspaceStorageScope,
    path: string,
    content: string
  ): Promise<WorkspaceFileContent> {
    this.files.set(this.key(scope, path), content);
    return {
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content,
      lastModified: '2026-05-31T00:00:01.000Z',
    };
  }

  public async deleteFileContent(scope: WorkspaceStorageScope, path: string): Promise<void> {
    this.files.delete(this.key(scope, path));
  }

  public readSavedFile(scope: WorkspaceStorageScope, path: string): string | undefined {
    return this.files.get(this.key(scope, path));
  }

  private key(scope: WorkspaceStorageScope, path: string): string {
    return `${scope.tenantId}\u0000${scope.projectId}\u0000${scope.environmentId}\u0000${path}`;
  }
}

function repositoryWithCatalog(catalog: unknown): IWorkspaceFileRepository {
  return new MemoryWorkspaceFileRepository({
    [WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH]: JSON.stringify(catalog),
  });
}

function measuredMetrics(rowCount = 128, byteSize = 4096000): SourceObjectMetricEvidence {
  return {
    observedAt: '2026-07-10T21:00:00.000Z',
    observationScope: { kind: 'snapshot' },
    rowCount: {
      value: rowCount,
      provenance: 'estimated',
      method: 'provider-statistics',
      confidence: 'medium',
    },
    byteSize: {
      value: byteSize,
      provenance: 'measured',
      method: 'provider-storage-metadata',
      confidence: 'exact',
      basis: 'physical-allocation',
    },
  };
}

function relationSourceObject(
  metricEvidence: SourceObjectMetricEvidence = measuredMetrics()
): SourceObject {
  const locator = {
    kind: 'relation' as const,
    catalog: 'analytics',
    schema: 'erp',
    name: 'orders',
    relationType: 'table' as const,
  };
  return {
    objectId: buildRelationalSourceObjectId(locator),
    displayName: 'orders',
    locator,
    metricEvidence,
    columns: [{ name: 'id', type: 'integer', nullable: false }],
  };
}

function catalogDocument(sourceObjects: readonly unknown[]): unknown {
  return {
    connections: [
      {
        id: 'finance-prod',
        name: 'Finance production',
        type: 'postgres',
        database: 'analytics',
        sourceObjects,
      },
    ],
  };
}

describe('WorkspaceWarehouseConnectionCatalog', () => {
  it('persists a governed connection and its provider-neutral source objects', async () => {
    const repository = new MemoryWorkspaceFileRepository({});
    const catalog = new WorkspaceWarehouseConnectionCatalog({ repository });
    const sourceObject = relationSourceObject();

    const created = await catalog.createConnection(SCOPE_A, {
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'finance',
      credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
      sourceObjects: [sourceObject],
    });

    expect(created).toEqual({
      id: 'finance-warehouse',
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'finance',
    });
    const persisted =
      repository.readSavedFile(SCOPE_A, WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH) ?? '';
    expect(persisted).toContain('"credentialRef": "env:DVT_FINANCE_WAREHOUSE_URL"');
    expect(persisted).not.toContain('password');
    await expect(catalog.listSourceObjects(SCOPE_A, 'finance-warehouse')).resolves.toEqual([
      sourceObject,
    ]);
  });

  it('reads connection summaries separately from complete source-object metadata', async () => {
    const sourceObject = relationSourceObject();
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: repositoryWithCatalog(catalogDocument([sourceObject])),
    });

    await expect(catalog.listConnections(SCOPE_A)).resolves.toEqual([
      {
        id: 'finance-prod',
        name: 'Finance production',
        type: 'postgres',
        database: 'analytics',
      },
    ]);
    await expect(catalog.listSourceObjects(SCOPE_A, 'finance-prod')).resolves.toEqual([
      sourceObject,
    ]);
  });

  it('returns no connections when the governed catalog file is absent', async () => {
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: new MemoryWorkspaceFileRepository({}),
    });

    await expect(catalog.listConnections(SCOPE_A)).resolves.toEqual([]);
    await expect(catalog.listSourceObjects(SCOPE_A, 'missing')).rejects.toBeInstanceOf(
      WarehouseConnectionNotFoundError
    );
  });

  it('fails closed on duplicate object identities', async () => {
    const duplicate = relationSourceObject();
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: repositoryWithCatalog(catalogDocument([duplicate, duplicate])),
    });

    await expect(catalog.listConnections(SCOPE_A)).rejects.toThrow(/Duplicate source object/);
  });

  it('fails closed when a persisted object omits mandatory metric evidence', async () => {
    const sourceObject = relationSourceObject() as unknown as Record<string, unknown>;
    const { metricEvidence: _metricEvidence, ...withoutEvidence } = sourceObject;
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: repositoryWithCatalog(catalogDocument([withoutEvidence])),
    });

    await expect(catalog.listSourceObjects(SCOPE_A, 'finance-prod')).rejects.toThrow(
      /metricEvidence/
    );
  });

  it('fails closed when metric provenance contradicts the canonical method', async () => {
    const sourceObject = relationSourceObject({
      ...measuredMetrics(),
      rowCount: {
        value: 128,
        provenance: 'measured',
        method: 'provider-statistics',
        confidence: 'exact',
      },
    } as unknown as SourceObjectMetricEvidence);
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: repositoryWithCatalog(catalogDocument([sourceObject])),
    });

    await expect(catalog.listSourceObjects(SCOPE_A, 'finance-prod')).rejects.toThrow();
  });

  it('preserves estimated metric provenance from the governed catalog', async () => {
    const estimatedMetrics: SourceObjectMetricEvidence = {
      observedAt: '2026-07-10T21:00:00.000Z',
      observationScope: { kind: 'snapshot' },
      rowCount: {
        value: 128,
        provenance: 'estimated',
        method: 'query-plan',
        confidence: 'low',
      },
      byteSize: {
        value: 11904,
        provenance: 'estimated',
        method: 'schema-width',
        confidence: 'low',
        basis: 'logical-payload',
      },
    };
    const sourceObject = relationSourceObject(estimatedMetrics);
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: repositoryWithCatalog(catalogDocument([sourceObject])),
    });

    await expect(catalog.listSourceObjects(SCOPE_A, 'finance-prod')).resolves.toEqual([
      sourceObject,
    ]);
  });

  it('does not expose a connection catalog across workspace scopes', async () => {
    const repository = new MemoryWorkspaceFileRepository({});
    const catalog = new WorkspaceWarehouseConnectionCatalog({ repository });

    await catalog.createConnection(SCOPE_A, {
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'finance',
      credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
      sourceObjects: [relationSourceObject()],
    });

    await expect(catalog.listConnections(SCOPE_A)).resolves.toHaveLength(1);
    await expect(catalog.listConnections(SCOPE_B)).resolves.toEqual([]);
  });
});
