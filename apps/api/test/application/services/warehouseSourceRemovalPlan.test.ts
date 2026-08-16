import { createHash } from 'node:crypto';

import type { WorkspaceGraphAuthoringDraft, WorkspaceGraphAuthoringNode } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchMutation,
  WorkspaceFileContent,
} from '../../../src/application/ports/workspaceFiles.js';
import { WorkspaceFileRevisionConflictError } from '../../../src/application/ports/workspaceFiles.js';
import {
  applyWarehouseSourceRemovalFilePlan,
  buildWarehouseSourceRemovalFilePlan,
  rollbackWarehouseSourceRemovalFilePlan,
} from '../../../src/application/services/warehouseSourceRemovalPlan.js';

const SCOPE = {
  tenantId: 'tenant-source-removal',
  projectId: 'project-source-removal',
  environmentId: 'environment-source-removal',
} as const;

const SOURCE_PATH = 'models/sources/src_raw.yml';
const SOURCE_NAME = 'postgres_local_dvt_raw';

describe('buildWarehouseSourceRemovalFilePlan', () => {
  it('removes only the deleted table and preserves sibling tables and metadata', async () => {
    const previousDraft = buildDraft([
      buildImportedSourceNode('source-orders', 'orders'),
      buildImportedSourceNode('source-customers', 'customers'),
    ]);
    const workspaceFiles = createWorkspaceFiles(`version: 2
owner: data-platform

sources:
  - name: ${SOURCE_NAME}
    database: dvt
    schema: raw
    meta:
      governed: true
    tables:
      - name: orders
        description: Orders imported from the warehouse
      - name: customers
        description: Customers imported from the warehouse
`);

    const plan = await buildWarehouseSourceRemovalFilePlan({
      scope: SCOPE,
      previousDraft,
      nextDraft: buildDraft([buildImportedSourceNode('source-customers', 'customers')]),
      workspaceFiles,
    });

    expect(workspaceFiles.getFileContent).toHaveBeenCalledWith(SCOPE, SOURCE_PATH);
    expect(plan.deletes).toEqual([]);
    expect(plan.writes).toHaveLength(1);
    expect(plan.writes[0]?.path).toBe(SOURCE_PATH);
    expect(plan.writes[0]?.content).not.toContain('name: orders');
    expect(plan.writes[0]?.content).toContain('name: customers');
    expect(plan.writes[0]?.content).toContain('owner: data-platform');
    expect(plan.writes[0]?.content).toContain('governed: true');
    expect(plan.writes[0]?.content).toContain('description: Customers imported from the warehouse');
  });

  it('deletes the generated YAML when its last imported table is removed', async () => {
    const previousDraft = buildDraft([buildImportedSourceNode('source-orders', 'orders')]);
    const workspaceFiles = createWorkspaceFiles(`version: 2

sources:
  - name: ${SOURCE_NAME}
    database: dvt
    schema: raw
    tables:
      - name: orders
`);

    const plan = await buildWarehouseSourceRemovalFilePlan({
      scope: SCOPE,
      previousDraft,
      nextDraft: buildDraft([]),
      workspaceFiles,
    });

    expect(plan.writes).toEqual([]);
    expect(plan.deletes).toEqual([SOURCE_PATH]);
    expect(plan.previousFiles.get(SOURCE_PATH)?.content).toContain('name: orders');
  });
});

describe('warehouse source removal file mutation', () => {
  it('applies writes and deletes with the exact previous revisions', async () => {
    const ordersFile = buildWorkspaceFile('models/sources/src_raw.yml', 'orders-before');
    const auditFile = buildWorkspaceFile('models/sources/src_audit.yml', 'audit-before');
    const batchMutation = createBatchMutation();

    await applyWarehouseSourceRemovalFilePlan({
      scope: SCOPE,
      idempotencyKey: 'remove-source-1',
      plan: {
        writes: [{ path: ordersFile.path, content: 'orders-after' }],
        deletes: [auditFile.path],
        previousFiles: new Map([
          [ordersFile.path, ordersFile],
          [auditFile.path, auditFile],
        ]),
      },
      batchMutation,
    });

    expect(batchMutation.apply).toHaveBeenCalledWith(SCOPE, {
      idempotencyKey: 'remove-source-1:source-removal:apply',
      expectedFiles: [
        { path: auditFile.path, expectedContentSha256: auditFile.contentSha256 },
        { path: ordersFile.path, expectedContentSha256: ordersFile.contentSha256 },
      ],
      writes: [{ path: ordersFile.path, content: 'orders-after' }],
      deletes: [auditFile.path],
    });
  });

  it('reports a compare-and-swap conflict without overwriting the workspace file', async () => {
    const file = buildWorkspaceFile(SOURCE_PATH, 'before');
    const batchMutation = createBatchMutation({
      kind: 'conflict',
      conflicts: [{ path: SOURCE_PATH, currentContentSha256: 'f'.repeat(64) }],
    });

    await expect(
      applyWarehouseSourceRemovalFilePlan({
        scope: SCOPE,
        idempotencyKey: 'remove-source-conflict',
        plan: {
          writes: [],
          deletes: [SOURCE_PATH],
          previousFiles: new Map([[SOURCE_PATH, file]]),
        },
        batchMutation,
      })
    ).rejects.toEqual(new WorkspaceFileRevisionConflictError(SOURCE_PATH, 'f'.repeat(64)));
  });

  it('restores updated and deleted files after a later draft-save failure', async () => {
    const updatedFile = buildWorkspaceFile('models/sources/src_raw.yml', 'raw-before');
    const deletedFile = buildWorkspaceFile('models/sources/src_audit.yml', 'audit-before');
    const batchMutation = createBatchMutation();

    await rollbackWarehouseSourceRemovalFilePlan({
      scope: SCOPE,
      idempotencyKey: 'remove-source-rollback',
      plan: {
        writes: [{ path: updatedFile.path, content: 'raw-after' }],
        deletes: [deletedFile.path],
        previousFiles: new Map([
          [updatedFile.path, updatedFile],
          [deletedFile.path, deletedFile],
        ]),
      },
      appliedReceipt: {
        kind: 'applied',
        idempotencyKey: 'remove-source-rollback:source-removal:apply',
        requestHash: 'a'.repeat(64),
        deduplicated: false,
        writes: [{ path: updatedFile.path, contentSha256: 'b'.repeat(64) }],
        deletes: [deletedFile.path],
      },
      batchMutation,
    });

    expect(batchMutation.apply).toHaveBeenCalledWith(SCOPE, {
      idempotencyKey: 'remove-source-rollback:source-removal:rollback',
      expectedFiles: [
        { path: deletedFile.path },
        { path: updatedFile.path, expectedContentSha256: 'b'.repeat(64) },
      ],
      writes: [
        { path: deletedFile.path, content: 'audit-before' },
        { path: updatedFile.path, content: 'raw-before' },
      ],
      deletes: [],
    });
  });
});

function buildImportedSourceNode(id: string, tableName: string): WorkspaceGraphAuthoringNode {
  return {
    id,
    name: tableName,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'raw'],
    path: SOURCE_PATH,
    metadata: {
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'postgresql-local',
          provider: 'postgres',
        },
        sourceObjectId: `relation/dvt/raw/${tableName}`,
      },
      sourceName: SOURCE_NAME,
      tableName,
      tableIdentifier: tableName,
      database: 'dvt',
      schema: 'raw',
    },
  };
}

function buildDraft(nodes: readonly WorkspaceGraphAuthoringNode[]): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { id: 'canvas-source-removal', kind: 'dbt', title: 'Sources' },
    nodeIds: nodes.map((node) => node.id),
    nodePositions: Object.fromEntries(
      nodes.map((node, index) => [node.id, { x: index * 240, y: 0 }])
    ),
    nodes: [...nodes],
    edges: [],
  };
}

function createWorkspaceFiles(content: string): IWorkspaceFileRepository & {
  getFileContent: ReturnType<typeof vi.fn>;
} {
  const file: WorkspaceFileContent = {
    path: SOURCE_PATH,
    name: 'src_raw.yml',
    language: 'yaml',
    content,
    contentSha256: createHash('sha256').update(content).digest('hex'),
    lastModified: '2026-08-16T10:00:00.000Z',
  };
  return {
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async () => file),
    saveFileContent: vi.fn(),
    deleteFileContent: vi.fn(),
  };
}

function buildWorkspaceFile(path: string, content: string): WorkspaceFileContent {
  return {
    path,
    name: path.split('/').at(-1) ?? path,
    language: 'yaml',
    content,
    contentSha256: createHash('sha256').update(content).digest('hex'),
    lastModified: '2026-08-16T10:00:00.000Z',
  };
}

function createBatchMutation(
  result: Awaited<ReturnType<IWorkspaceFileBatchMutationPort['apply']>> | undefined = undefined
): IWorkspaceFileBatchMutationPort & {
  apply: ReturnType<typeof vi.fn>;
} {
  return {
    apply: vi.fn(
      async (_scope: typeof SCOPE, mutation: WorkspaceFileBatchMutation) =>
        result ?? {
          kind: 'applied' as const,
          idempotencyKey: mutation.idempotencyKey,
          requestHash: 'a'.repeat(64),
          deduplicated: false,
          writes: mutation.writes.map((write) => ({
            path: write.path,
            contentSha256: createHash('sha256').update(write.content).digest('hex'),
          })),
          deletes: mutation.deletes,
        }
    ),
  };
}
