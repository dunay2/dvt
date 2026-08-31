import { sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  SaveWorkspaceFileContentInput,
} from '../../ports/workspace';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitPilotFunction,
  createDvtSubstraitPilotDraft,
  encodeDvtSubstraitPilotDocument,
  renameDvtSubstraitPilotOutput,
} from './canvasDvtSubstraitPilot';
import { applyDvtSubstraitPilotAggregation } from './canvasDvtSubstraitAggregation';
import { resolvePreviewProvenance } from './canvasPreviewProvenance';
import { buildTestPostgresConnectionRef } from './useCanvasExecutionActions.test.support';

type SubstraitPreviewSourceBinding = Readonly<{
  schema: string;
  table: string;
  alias: string;
}>;

type SubstraitPreviewWorkspacePorts = Readonly<{
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  savedContents: string[];
}>;

type ResolveGraphPreviewResult = SubstraitPreviewWorkspacePorts &
  Readonly<{
    result: Awaited<ReturnType<typeof resolvePreviewProvenance>>;
  }>;

const DEFAULT_SOURCE_BINDING: SubstraitPreviewSourceBinding = {
  schema: 'public',
  table: 'customers',
  alias: 'customers',
};

function buildSubstraitPreviewGraph(
  outputName = 'customer_name',
  sourceBinding: SubstraitPreviewSourceBinding = DEFAULT_SOURCE_BINDING
): {
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
          config: sourceBinding,
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

function buildSubstraitJoinPreviewGraph(): ReturnType<typeof buildSubstraitPreviewGraph> {
  const transformPath = 'models/customer_orders.sql';
  const connectionRef = buildTestPostgresConnectionRef();
  const draft = createDvtSubstraitInnerJoinDraft({
    left: {
      nodeId: 'source-customers',
      schema: 'public',
      table: 'customers',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef,
        sourceObjectId: 'public.customers',
      },
    },
    right: {
      nodeId: 'source-orders',
      schema: 'public',
      table: 'orders',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef,
        sourceObjectId: 'public.orders',
      },
    },
    targetNodeId: 'transform',
  });
  const transform = applyDvtSubstraitSemanticDocument(
    {
      id: 'transform',
      name: 'Customer orders',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      role: 'transform',
      status: 'idle',
      tags: ['authoring'],
      path: transformPath,
      metadata: { config: { dialect: 'postgres' } },
    },
    encodeDvtSubstraitInnerJoinDocument(draft)
  );
  const source = (id: string, table: string): CanonicalNode => ({
    id,
    name: table,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      sourceName: table,
      schema: 'public',
      tableName: table,
      columns: (table === 'customers' ? ['customer_id', 'name'] : ['order_id', 'customer_id']).map(
        (name) => ({ name, type: 'string' })
      ),
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef,
        sourceObjectId: `public.${table}`,
      },
    },
  });
  const sink: CanonicalNode = {
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
        table: 'customer_orders',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  };

  return {
    transformPath,
    nodes: [
      source('source-customers', 'customers'),
      source('source-orders', 'orders'),
      transform,
      sink,
    ],
    edges: [
      {
        id: 'customers-transform',
        sourceId: 'source-customers',
        targetId: 'transform',
        relation: 'lineage',
      },
      {
        id: 'orders-transform',
        sourceId: 'source-orders',
        targetId: 'transform',
        relation: 'lineage',
      },
      { id: 'transform-sink', sourceId: 'transform', targetId: 'sink', relation: 'lineage' },
    ],
  };
}

function buildSubstraitAggregatePreviewGraph(): ReturnType<typeof buildSubstraitPreviewGraph> {
  const graph = buildSubstraitPreviewGraph();
  let draft = createDvtSubstraitPilotDraft({
    sourceNodeId: 'source',
    targetNodeId: 'transform',
  });
  draft = applyDvtSubstraitPilotAggregation(draft, {
    groupFieldId: 'field:transform:country',
    countOutputName: 'customer_count',
  });
  const transformIndex = graph.nodes.findIndex((node) => node.id === 'transform');
  const transform = graph.nodes[transformIndex];
  if (transform == null) throw new Error('Expected transform fixture.');
  graph.nodes[transformIndex] = applyDvtSubstraitSemanticDocument(
    transform,
    encodeDvtSubstraitPilotDocument(draft)
  );
  return graph;
}

function buildWorkspacePorts(
  transformPath: string,
  staleSql?: string
): SubstraitPreviewWorkspacePorts {
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
        disposition:
          staleSql !== undefined && input.path === transformPath
            ? ('updated' as const)
            : ('created' as const),
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
): Promise<ResolveGraphPreviewResult> {
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
      /^select upper\(trim\(name\)\) as customer_name, email, country from public\.customers;?$/
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

  it('binds generated SQL to the scoped PostgreSQL schema and table', async () => {
    const graph = buildSubstraitPreviewGraph('customer_name', {
      schema: 'tenant-data',
      table: 'customer-ledger',
      alias: 'customers',
    });

    const { result } = await resolveGraphPreview(graph);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.sqlText?.toLowerCase()).toContain('from "tenant-data"."customer-ledger"');
    expect(result.sqlText?.toLowerCase()).not.toMatch(/from customers;?\s*$/);
  });

  it('routes the two-source INNER JOIN revision through the existing Preview artifact rail', async () => {
    const graph = buildSubstraitJoinPreviewGraph();

    const { result, savedContents } = await resolveGraphPreview(graph);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    const normalized = result.sqlText?.replaceAll(/\s+/g, ' ').trim().toLowerCase();
    expect(normalized).toMatch(
      /^select left_source\.customer_id as customer_id, left_source\.name as name, right_source\.order_id as order_id from public\.customers as left_source join public\.orders as right_source on left_source\.customer_id = right_source\.customer_id;?$/
    );
    expect(savedContents).toContain(result.sqlText);
  });

  it('routes the grouped Substrait revision through the existing Preview artifact rail', async () => {
    const { result, savedContents } = await resolveGraphPreview(
      buildSubstraitAggregatePreviewGraph()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    const normalized = result.sqlText?.replaceAll(/\s+/g, ' ').trim().toLowerCase();
    expect(normalized).toMatch(
      /^select country as country, count\(\*\) as customer_count from public\.customers group by country;?$/
    );
    expect(savedContents).toContain(result.sqlText);
  });

  it('fails closed when a scoped dataset identity diverges from the INNER JOIN sidecar', async () => {
    const graph = buildSubstraitJoinPreviewGraph();
    const nodes = graph.nodes.map((node) =>
      node.id !== 'source-orders'
        ? node
        : {
            ...node,
            metadata: {
              ...node.metadata,
              tableName: 'other_orders',
            },
          }
    );

    const { result } = await resolveGraphPreview({ ...graph, nodes });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected scoped source mismatch to fail closed.');
    expect(result.message).toMatch(/source identities/i);
  });

  it('fails closed when a scoped dataset connection provider diverges from the sidecar', async () => {
    const graph = buildSubstraitJoinPreviewGraph();
    const nodes = graph.nodes.map((node) =>
      node.id !== 'source-orders'
        ? node
        : {
            ...node,
            metadata: {
              ...node.metadata,
              connectedSourceRef: {
                ...(node.metadata?.connectedSourceRef as Record<string, unknown>),
                connectionRef: {
                  ...((node.metadata?.connectedSourceRef as { connectionRef: object })
                    .connectionRef ?? {}),
                  provider: 'mysql',
                },
              },
            },
          }
    );

    const { result } = await resolveGraphPreview({ ...graph, nodes });

    expect(result.ok).toBe(false);
  });
});
