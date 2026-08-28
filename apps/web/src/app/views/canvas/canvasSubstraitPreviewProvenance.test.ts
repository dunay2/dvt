import { sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it, vi } from 'vitest';

import type { SaveWorkspaceFileContentInput } from '../../ports/workspace';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  applyDvtSubstraitPilotFunction,
  createDvtSubstraitPilotDraft,
  encodeDvtSubstraitPilotDocument,
  renameDvtSubstraitPilotOutput,
} from './canvasDvtSubstraitPilot';
import { resolvePreviewProvenance } from './canvasPreviewProvenance';
import { buildTestPostgresConnectionRef } from './useCanvasExecutionActions.test.support';

function buildSubstraitPreviewGraph(outputName = 'customer_name'): {
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  transformPath: string;
} {
  const transformPath = 'models/customers_transform.sql';
  let draft = createDvtSubstraitPilotDraft({
    sourceNodeId: 'source',
    targetNodeId: 'transform',
  });
  draft = applyDvtSubstraitPilotFunction(draft, 'trim');
  draft = applyDvtSubstraitPilotFunction(draft, 'upper');
  draft = renameDvtSubstraitPilotOutput(draft, outputName);

  const transform = applyDvtSubstraitSemanticDocument(
    {
      id: 'transform',
      name: 'Transform',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      path: transformPath,
      metadata: { config: { dialect: 'postgres' } },
    },
    encodeDvtSubstraitPilotDocument(draft)
  );

  return {
    transformPath,
    nodes: [
      {
        id: 'source',
        name: 'Customers',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
        metadata: {
          connectionRef: buildTestPostgresConnectionRef(),
          config: { schema: 'public', table: 'customers', alias: 'customers' },
        },
      },
      transform,
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
            table: 'customers',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      },
    ],
    edges: [
      { id: 'source-transform', sourceId: 'source', targetId: 'transform', relation: 'lineage' },
      { id: 'transform-sink', sourceId: 'transform', targetId: 'sink', relation: 'lineage' },
    ],
  };
}

function buildWorkspacePorts(transformPath: string, staleSql?: string) {
  const savedContents: string[] = [];
  const workspaceFilesQuery = {
    listFiles: vi.fn(async () => []),
    getFileContent: vi.fn(async (path: string) => {
      if (path === transformPath && staleSql !== undefined) {
        return {
          path,
          name: 'customers_transform.sql',
          language: 'sql',
          content: staleSql,
          contentSha256: sha256HexUtf8(staleSql),
          lastModified: '2026-08-28T00:00:00Z',
        };
      }
      throw new WorkspaceFileLoadError('not_found', path);
    }),
  };
  const workspaceFileContentCommand = {
    saveFileContent: vi.fn(async (input: SaveWorkspaceFileContentInput) => {
      savedContents.push(input.content);
      return {
        kind: 'saved' as const,
        disposition: staleSql !== undefined && input.path === transformPath ? ('updated' as const) : ('created' as const),
        path: input.path,
        contentSha256: sha256HexUtf8(input.content),
        lastModified: '2026-08-28T00:00:00Z',
      };
    }),
  };
  return { workspaceFilesQuery, workspaceFileContentCommand, savedContents };
}

async function resolveGraphPreview(
  graph: ReturnType<typeof buildSubstraitPreviewGraph>,
  staleSql?: string
) {
  const ports = buildWorkspacePorts(graph.transformPath, staleSql);
  const result = await resolvePreviewProvenance({
    canonicalNodes: graph.nodes,
    canonicalEdges: graph.edges,
    scopedNodeIds: graph.nodes.map((node) => node.id),
    workspaceFilesQuery: ports.workspaceFilesQuery,
    workspaceFileContentCommand: ports.workspaceFileContentCommand,
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
      graphArtifactPath: 'pipelines/customers-preview.yaml',
    },
    required: true,
  });
  return { result, ...ports };
}

describe('Substrait Preview provenance cutover', () => {
  it('regenerates Preview SQL from current Substrait authority instead of a stale SQL artifact', async () => {
    const graph = buildSubstraitPreviewGraph();
    const staleSql = 'select stale_column from customers;\n';
    const { result, workspaceFileContentCommand } = await resolveGraphPreview(graph, staleSql);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    const normalized = result.sqlText?.replaceAll(/\s+/g, ' ').trim().toLowerCase();
    expect(normalized).toMatch(
      /^select upper\(trim\(name\)\) as customer_name, email, country from customers;?$/
    );
    expect(result.sqlText).not.toBe(staleSql);
    expect(workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith(
      expect.objectContaining({
        path: graph.transformPath,
        content: result.sqlText,
        expectedRevision: { kind: 'content_sha256', value: sha256HexUtf8(staleSql) },
      })
    );
  });

  it('changes the generated Preview artifact when the Substrait recipe changes', async () => {
    const first = await resolveGraphPreview(buildSubstraitPreviewGraph('customer_name'));
    const second = await resolveGraphPreview(buildSubstraitPreviewGraph('customer_name_v2'));

    expect(first.result.ok && second.result.ok).toBe(true);
    if (!first.result.ok || !second.result.ok) throw new Error('Preview fixture failed.');
    expect(first.result.sqlText).toContain('customer_name');
    expect(second.result.sqlText).toContain('customer_name_v2');
    expect(second.result.sqlText).not.toBe(first.result.sqlText);
    expect(second.savedContents.some((content) => content.includes('customer_name_v2'))).toBe(true);
  });
});
