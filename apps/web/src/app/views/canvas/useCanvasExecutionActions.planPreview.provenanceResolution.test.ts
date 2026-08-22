import { sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it, vi } from 'vitest';

import type { SaveWorkspaceFileContentInput } from '../../ports/workspace';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolvePreviewProvenance } from './canvasPreviewProvenance';
import { buildTestPostgresConnectionRef } from './useCanvasExecutionActions.test.support';

describe('resolvePreviewProvenance', () => {
  it('materializes draft SQL as the preview artifact for file-backed transforms', async () => {
    const transformPath = 'models/preview_transform.sql';
    const graphArtifactPath = 'pipelines/preview_graph.yaml';
    const draftSql = 'select order_id from raw_orders';
    const sqlArtifactContent = `${draftSql}\n`;
    const canonicalNodes: CanonicalNode[] = [
      {
        id: 'source',
        name: 'Source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
        metadata: {
          connectionRef: buildTestPostgresConnectionRef(),
          config: { schema: 'raw', table: 'orders', alias: 'raw_orders' },
        },
      },
      {
        id: 'transform',
        name: 'Transform',
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        path: transformPath,
        metadata: { sql: draftSql, config: { dialect: 'postgres' } },
      },
      {
        id: 'sink',
        name: 'Sink',
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output',
        status: 'idle',
        tags: [],
        metadata: {
          config: {
            schema: 'analytics',
            table: 'orders',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      },
    ];
    const canonicalEdges: CanonicalEdge[] = [
      { id: 'source-transform', sourceId: 'source', targetId: 'transform', relation: 'lineage' },
      { id: 'transform-sink', sourceId: 'transform', targetId: 'sink', relation: 'lineage' },
    ];
    const workspaceFilesQuery = {
      listFiles: vi.fn(async () => []),
      getFileContent: vi.fn(async (path: string) => {
        if (path !== transformPath) {
          throw new WorkspaceFileLoadError('not_found', path);
        }
        const content = 'select stale_column from old_workspace_file';
        return {
          path: transformPath,
          name: 'preview_transform.sql',
          language: 'sql',
          content,
          contentSha256: sha256HexUtf8(content),
          lastModified: '2026-04-08T00:00:00Z',
        };
      }),
    };
    const workspaceFileContentCommand = {
      saveFileContent: vi.fn(async (input: SaveWorkspaceFileContentInput) => ({
        kind: 'saved' as const,
        disposition: 'updated' as const,
        path: input.path,
        contentSha256: sha256HexUtf8(input.content),
        lastModified: '2026-04-08T00:00:00Z',
      })),
    };

    const resolution = await resolvePreviewProvenance({
      canonicalNodes,
      canonicalEdges,
      scopedNodeIds: canonicalNodes.map((node) => node.id),
      workspaceFilesQuery,
      workspaceFileContentCommand,
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'temporal',
      },
      previewProvenanceConfig: {
        gitBranch: 'main',
        gitSha: 'abc123',
        gitRepo: 'dunay2/dvt',
        graphArtifactPath,
      },
      required: true,
    });

    expect(resolution).toEqual(
      expect.objectContaining({
        ok: true,
        sqlText: sqlArtifactContent,
        sqlArtifact: expect.objectContaining({
          path: transformPath,
          contentSha256: sha256HexUtf8(sqlArtifactContent),
        }),
      })
    );
    expect(workspaceFileContentCommand.saveFileContent).toHaveBeenNthCalledWith(1, {
      path: transformPath,
      content: sqlArtifactContent,
      expectedRevision: {
        kind: 'content_sha256',
        value: sha256HexUtf8('select stale_column from old_workspace_file'),
      },
    });
    expect(workspaceFilesQuery.getFileContent).toHaveBeenCalledWith(transformPath);
  });

  it('fails closed when generated authoring transforms carry draft and compiled SQL together', async () => {
    const rawDraftSql = "{{ source('raw', 'orders') }}";
    const rawConfigSql = 'select * from {{ ref("raw_orders") }}';
    const compiledSql = 'select order_id from raw.orders';
    const canonicalNodes: CanonicalNode[] = [
      {
        id: 'source',
        name: 'Source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['authoring'],
        metadata: {
          connectionRef: buildTestPostgresConnectionRef(),
          config: { schema: 'raw', table: 'orders', alias: 'raw_orders' },
        },
      },
      {
        id: 'transform',
        name: 'Transform',
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        metadata: {
          sql: rawDraftSql,
          compiledSql,
          config: { dialect: 'postgres', sql: rawConfigSql },
        },
      },
      {
        id: 'sink',
        name: 'Sink',
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output',
        status: 'idle',
        tags: ['authoring'],
        metadata: {
          config: {
            schema: 'analytics',
            table: 'orders',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      },
    ];
    const canonicalEdges: CanonicalEdge[] = [
      { id: 'source-transform', sourceId: 'source', targetId: 'transform', relation: 'lineage' },
      { id: 'transform-sink', sourceId: 'transform', targetId: 'sink', relation: 'lineage' },
    ];

    const resolution = await resolvePreviewProvenance({
      canonicalNodes,
      canonicalEdges,
      scopedNodeIds: canonicalNodes.map((node) => node.id),
      workspaceFilesQuery: {
        listFiles: vi.fn(async () => []),
        getFileContent: vi.fn(),
      },
      workspaceFileContentCommand: {
        saveFileContent: vi.fn(),
      },
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'temporal',
      },
      previewProvenanceConfig: {
        gitBranch: 'detached',
        gitSha: 'unknown',
      },
      required: true,
    });

    expect(resolution).toEqual(
      expect.objectContaining({
        ok: false,
        message: expect.stringContaining('cannot choose between draft SQL and compiled SQL'),
      })
    );
  });
});
