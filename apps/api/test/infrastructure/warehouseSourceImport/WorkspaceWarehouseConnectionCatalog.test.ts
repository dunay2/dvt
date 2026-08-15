import { createHash } from 'node:crypto';

import {
  buildRelationalSourceObjectId,
  type SourceObject,
  type SourceObjectMetricEvidence,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  DuplicateWarehouseConnectionError,
  WarehouseConnectionNotFoundError,
} from '../../../src/application/ports/warehouseSourceImport.js';
import {
  WorkspaceFileNotFoundError,
  WorkspaceFileRevisionConflictError,
} from '../../../src/application/ports/workspaceFiles.js';
import type {
  DeleteWorkspaceFileContentInput,
  IWorkspaceFileRepository,
  SaveWorkspaceFileContentInput,
  WorkspaceFileContent,
  WorkspaceFileDeleteResult,
  WorkspaceFileEntry,
  WorkspaceFileSaveResult,
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
      contentSha256: sha256(content),
      lastModified: '2026-05-31T00:00:00.000Z',
    };
  }

  public async saveFileContent(
    scope: WorkspaceStorageScope,
    input: SaveWorkspaceFileContentInput
  ): Promise<WorkspaceFileSaveResult> {
    const key = this.key(scope, input.path);
    const currentContent = this.files.get(key);
    const currentContentSha256 = currentContent === undefined ? null : sha256(currentContent);
    if (currentContentSha256 === sha256(input.content)) {
      const file = this.toFileContent(input.path, input.content);
      return {
        kind: 'unchanged',
        disposition: null,
        path: file.path,
        contentSha256: file.contentSha256,
        lastModified: file.lastModified,
      };
    }
    const matches =
      input.expectedRevision.kind === 'absent'
        ? currentContentSha256 === null
        : input.expectedRevision.value === currentContentSha256;
    if (!matches) {
      return { kind: 'conflict', currentContentSha256 };
    }

    this.files.set(key, input.content);
    const file = this.toFileContent(input.path, input.content);
    return {
      kind: 'saved',
      disposition: currentContent === undefined ? 'created' : 'updated',
      path: file.path,
      contentSha256: file.contentSha256,
      lastModified: file.lastModified,
    };
  }

  public async deleteFileContent(
    scope: WorkspaceStorageScope,
    input: DeleteWorkspaceFileContentInput
  ): Promise<WorkspaceFileDeleteResult> {
    const key = this.key(scope, input.path);
    const currentContent = this.files.get(key);
    if (currentContent === undefined) {
      return { kind: 'unchanged' };
    }
    const currentContentSha256 = sha256(currentContent);
    if (currentContentSha256 !== input.expectedRevision.value) {
      return { kind: 'conflict', currentContentSha256 };
    }
    this.files.delete(key);
    return { kind: 'deleted' };
  }

  public readSavedFile(scope: WorkspaceStorageScope, path: string): string | undefined {
    return this.files.get(this.key(scope, path));
  }

  private key(scope: WorkspaceStorageScope, path: string): string {
    return `${scope.tenantId}\u0000${scope.projectId}\u0000${scope.environmentId}\u0000${path}`;
  }

  private toFileContent(path: string, content: string): WorkspaceFileContent {
    return {
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'json',
      content,
      contentSha256: sha256(content),
      lastModified: '2026-05-31T00:00:01.000Z',
    };
  }
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
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
  it('renames only the display name while preserving stable identity and governed metadata', async () => {
    const sourceObject = relationSourceObject();
    const repository = repositoryWithCatalog({
      connections: [
        {
          id: 'finance-prod',
          name: 'Finance production',
          type: 'postgres',
          database: 'analytics',
          credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
          sourceObjects: [sourceObject],
        },
      ],
    });
    const catalog = new WorkspaceWarehouseConnectionCatalog({ repository });

    await expect(
      catalog.renameConnection(SCOPE_A, 'finance-prod', { name: 'Finance warehouse' })
    ).resolves.toEqual({
      id: 'finance-prod',
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'analytics',
    });

    const persisted = JSON.parse(
      (repository as MemoryWorkspaceFileRepository).readSavedFile(
        SCOPE_A,
        WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH
      ) ?? '{}'
    ) as { connections?: readonly Record<string, unknown>[] };
    expect(persisted.connections).toEqual([
      expect.objectContaining({
        id: 'finance-prod',
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'analytics',
        credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
        sourceObjects: [sourceObject],
      }),
    ]);
  });

  it('rejects duplicate names case-insensitively without changing the catalog', async () => {
    const repository = repositoryWithCatalog({
      connections: [
        {
          id: 'finance-prod',
          name: 'Finance production',
          type: 'postgres',
          database: 'analytics',
          sourceObjects: [relationSourceObject()],
        },
        {
          id: 'operations-prod',
          name: 'Operations production',
          type: 'postgres',
          database: 'operations',
          sourceObjects: [],
        },
      ],
    });
    const catalog = new WorkspaceWarehouseConnectionCatalog({ repository });

    await expect(
      catalog.renameConnection(SCOPE_A, 'finance-prod', { name: ' operations PRODUCTION ' })
    ).rejects.toBeInstanceOf(DuplicateWarehouseConnectionError);
    await expect(catalog.getConnection(SCOPE_A, 'finance-prod')).resolves.toMatchObject({
      name: 'Finance production',
    });
  });

  it('rejects renaming an unknown connection', async () => {
    const catalog = new WorkspaceWarehouseConnectionCatalog({
      repository: repositoryWithCatalog(catalogDocument([])),
    });

    await expect(
      catalog.renameConnection(SCOPE_A, 'missing', { name: 'New name' })
    ).rejects.toBeInstanceOf(WarehouseConnectionNotFoundError);
  });

  it('does not overwrite a concurrent catalog revision during rename', async () => {
    const repository = repositoryWithCatalog(catalogDocument([]));
    const save = vi.spyOn(repository, 'saveFileContent').mockResolvedValue({
      kind: 'conflict',
      currentContentSha256: 'changed-revision',
    });
    const catalog = new WorkspaceWarehouseConnectionCatalog({ repository });

    await expect(
      catalog.renameConnection(SCOPE_A, 'finance-prod', { name: 'Finance warehouse' })
    ).rejects.toBeInstanceOf(WorkspaceFileRevisionConflictError);
    expect(save).toHaveBeenCalledWith(
      SCOPE_A,
      expect.objectContaining({
        path: WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
        expectedRevision: expect.objectContaining({ kind: 'content_sha256' }),
      })
    );
  });

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
    await expect(catalog.listConnections(SCOPE_A)).resolves.toEqual([
      {
        id: 'finance-warehouse',
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'finance',
      },
    ]);
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
