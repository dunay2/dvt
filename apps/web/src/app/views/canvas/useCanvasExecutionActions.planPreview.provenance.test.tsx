// @vitest-environment jsdom

import { asSha256HexString } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { canvasViewCopy } from './copy';
import { buildPreviewDesignGraphArtifactContent } from './previewGraphSource';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  buildTestPostgresConnectionRef,
  createPlansServiceMock,
  createRunsServiceMock,
  createSessionContext,
  createWorkspaceFilePortMocks,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

describe('useCanvasExecutionActions plan preview provenance', () => {
  let harness: ReturnType<typeof renderExecutionActionsHarness> | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('projects canvas-authored transformation nodes into workspace artifacts before preview', async () => {
    const plansService = createPlansServiceMock();
    const authoringNodes: CanonicalNode[] = [
      {
        id: 'source-2',
        name: 'Source 2',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: {
          typeLabel: 'Source',
          connectionRef: buildTestPostgresConnectionRef(),
        },
      },
      {
        id: 'dvt-sql-transform-1',
        name: 'SQL transform 1',
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        role: 'transform' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: { typeLabel: 'SQL transform' },
      },
      {
        id: 'sink-1',
        name: 'Sink 1',
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: { typeLabel: 'Sink' },
      },
    ];
    const authoringEdges: CanonicalEdge[] = [
      {
        id: 'edge-source-transform',
        sourceId: 'source-2',
        targetId: 'dvt-sql-transform-1',
        relation: 'lineage' as const,
      },
      {
        id: 'edge-transform-sink',
        sourceId: 'dvt-sql-transform-1',
        targetId: 'sink-1',
        relation: 'lineage' as const,
      },
    ];
    const workspaceFilePorts = createWorkspaceFilePortMocks({});

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      ...workspaceFilePorts,
      canonicalNodes: authoringNodes,
      canonicalEdges: authoringEdges,
      previewProvenanceConfig: {
        gitBranch: 'detached',
        gitSha: 'unknown',
      },
    });
    await harness.render();

    await harness.clickPlan();

    expect(workspaceFilePorts.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith({
      path: 'models/dvt-sql-transform-1.sql',
      content: 'select *\nfrom public.source_2;\n',
      expectedRevision: { kind: 'absent' },
    });
    expect(workspaceFilePorts.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'pipelines/project-transformation-preview.yaml',
        content: expect.stringContaining('entrypoint: "models/dvt-sql-transform-1.sql"'),
        expectedRevision: { kind: 'absent' },
      })
    );
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        previewProfile: 'transformation-sql-first-v2',
        graphSource: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: 'source-2',
              stepTypeConfig: expect.objectContaining({
                sourceSchema: 'public',
                sourceTable: 'source_2',
                sourceAlias: 'source_2',
              }),
            }),
            expect.objectContaining({
              nodeId: 'dvt-sql-transform-1',
              stepTypeConfig: expect.objectContaining({
                entrypoint: 'models/dvt-sql-transform-1.sql',
                sql: 'select *\nfrom public.source_2;\n',
              }),
            }),
            expect.objectContaining({
              nodeId: 'sink-1',
              stepTypeConfig: expect.objectContaining({
                sinkSchema: 'public',
                sinkTable: 'sink_1',
              }),
            }),
          ]),
        }),
        provenance: {
          kind: 'transformation-git-artifacts',
          graphArtifact: expect.objectContaining({
            repo: 'workspace://tenant/project',
            path: 'pipelines/project-transformation-preview.yaml',
          }),
          sqlArtifact: expect.objectContaining({
            repo: 'workspace://tenant/project',
            path: 'models/dvt-sql-transform-1.sql',
          }),
        },
      })
    );
    expect(harness.shellFeedback.success).toHaveBeenCalledWith(canvasViewCopy.planCreatedMessage);
  });

  it('previews exactly the SQL compiled from the visual recipe authority', async () => {
    const plansService = createPlansServiceMock();
    const sourceNode: CanonicalNode = {
      id: 'source-orders',
      name: 'Orders',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: ['authoring'],
      metadata: {
        connectionRef: buildTestPostgresConnectionRef(),
        config: { schema: 'raw', table: 'orders', alias: 'orders_source' },
      },
    };
    const transformNode: CanonicalNode = {
      id: 'visual-orders',
      name: 'Visual orders',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      role: 'transform',
      status: 'idle',
      tags: ['authoring'],
      path: 'models/visual-orders.sql',
      metadata: {
        transformAuthoring: {
          version: 'v1',
          mode: 'visual',
          recipe: {
            version: 'v1',
            outputs: [
              {
                id: 'output:order_id',
                name: 'order_id',
                dataType: 'integer',
                expression: {
                  inputs: [{ nodeId: sourceNode.id, columnName: 'order_id' }],
                  operations: [{ kind: 'passthrough' }],
                },
              },
              {
                id: 'output:customer_name',
                name: 'customer_name',
                dataType: 'text',
                expression: {
                  inputs: [{ nodeId: sourceNode.id, columnName: 'customer' }],
                  operations: [{ kind: 'function', functionId: 'upper', args: [] }],
                },
              },
            ],
            filters: [
              {
                id: 'filter:active',
                input: { nodeId: sourceNode.id, columnName: 'active' },
                operator: 'equals',
                value: true,
              },
            ],
          },
        },
      },
    };
    const sinkNode: CanonicalNode = {
      id: 'sink-orders',
      name: 'Orders output',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: ['authoring'],
      metadata: { typeLabel: 'Sink' },
    };
    const canonicalNodes = [sourceNode, transformNode, sinkNode];
    const canonicalEdges: CanonicalEdge[] = [
      {
        id: 'source-transform',
        sourceId: sourceNode.id,
        targetId: transformNode.id,
        relation: 'lineage',
      },
      {
        id: 'transform-sink',
        sourceId: transformNode.id,
        targetId: sinkNode.id,
        relation: 'lineage',
      },
    ];
    const staleWorkspaceSql = 'select stale_column from old_authority';
    const workspaceFilePorts = createWorkspaceFilePortMocks({
      'models/visual-orders.sql': staleWorkspaceSql,
    });
    const expectedSql = [
      'select',
      '  "orders_source"."order_id" as "order_id",',
      '  upper("orders_source"."customer") as "customer_name"',
      'from "raw"."orders" as "orders_source"',
      'where "orders_source"."active" = true;',
      '',
    ].join('\n');

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      ...workspaceFilePorts,
      canonicalNodes,
      canonicalEdges,
      workspaceNodeIds: canonicalNodes.map((node) => node.id),
      previewProvenanceConfig: { gitBranch: 'detached', gitSha: 'unknown' },
    });
    await harness.render();
    await harness.clickPlan();

    expect(workspaceFilePorts.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith({
      path: 'models/visual-orders.sql',
      content: expectedSql,
      expectedRevision: {
        kind: 'content_sha256',
        value: sha256HexUtf8(staleWorkspaceSql),
      },
    });
    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              nodeId: transformNode.id,
              stepTypeConfig: expect.objectContaining({ sql: expectedSql }),
            }),
          ]),
        }),
      })
    );
  });

  it('validates the flushed draft graph before previewing an authoring-generated workflow', async () => {
    const plansService = createPlansServiceMock();
    const authoringNodes: CanonicalNode[] = [
      {
        id: 'source-1',
        name: 'Source 1',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: {
          typeLabel: 'Source',
          connectionRef: buildTestPostgresConnectionRef(),
        },
      },
      {
        id: 'dvt-sql-transform-1',
        name: 'SQL transform 1',
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        role: 'transform' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: { typeLabel: 'SQL transform' },
      },
      {
        id: 'sink-1',
        name: 'Sink 1',
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output' as const,
        status: 'idle' as const,
        tags: ['authoring'],
        metadata: { typeLabel: 'Sink' },
      },
    ];
    const authoringEdges: CanonicalEdge[] = [
      {
        id: 'edge-source-transform',
        sourceId: 'source-1',
        targetId: 'dvt-sql-transform-1',
        relation: 'lineage' as const,
      },
      {
        id: 'edge-transform-sink',
        sourceId: 'dvt-sql-transform-1',
        targetId: 'sink-1',
        relation: 'lineage' as const,
      },
    ];
    const workspaceFilePorts = createWorkspaceFilePortMocks({});

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      ...workspaceFilePorts,
      canonicalNodes: [],
      canonicalEdges: [],
      workspaceNodeIds: [],
      flushDraftForExecution: async () => ({
        ok: true,
        canonicalNodes: authoringNodes,
        canonicalEdges: authoringEdges,
        workspaceNodeIds: authoringNodes.map((node) => node.id),
      }),
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(workspaceFilePorts.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith({
      path: 'models/dvt-sql-transform-1.sql',
      content: 'select *\nfrom public.source_1;\n',
      expectedRevision: { kind: 'absent' },
    });
    expect(harness.shellFeedback.error).not.toHaveBeenCalled();
  });

  it('adds preview provenance for temporal targets when workspace files resolve', async () => {
    const canonicalNodes = buildCanonicalNodes();
    const canonicalEdges = buildCanonicalEdges();
    const nodesWithTransformPath = canonicalNodes.map((node) =>
      node.id === 'transform-node' ? { ...node, path: 'models/transform.sql' } : node
    );
    const plansService = createPlansServiceMock();
    const workspaceFilePorts = createWorkspaceFilePortMocks({
      'pipelines/sales_pipeline.yaml': 'name: sales_pipeline\nsteps: []',
      'models/transform.sql': 'select * from analytics.orders',
    });

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      ...workspaceFilePorts,
      sessionContext: createSessionContext('temporal'),
      canonicalNodes: nodesWithTransformPath,
      canonicalEdges,
      previewProvenanceConfig: {
        gitBranch: 'main',
        gitSha: 'abc123',
        gitRepo: 'dunay2/dvt',
        graphArtifactPath: 'pipelines/sales_pipeline.yaml',
      },
    });
    await harness.render();

    await harness.clickPlan();

    const expectedGraphArtifactContent = buildPreviewDesignGraphArtifactContent({
      nodes: nodesWithTransformPath,
      edges: canonicalEdges,
      scopedNodeIds: ['source-node', 'transform-node', 'sink-node'],
      sqlArtifact: {
        repo: 'dunay2/dvt',
        path: 'models/transform.sql',
        ref: 'refs/heads/main',
        commitSha: 'abc123',
        contentSha256: asSha256HexString(sha256HexUtf8('select * from analytics.orders')),
      },
      context: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
      },
    });

    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        previewProfile: 'transformation-sql-first-v2',
        provenance: {
          kind: 'transformation-git-artifacts',
          graphArtifact: {
            repo: 'dunay2/dvt',
            path: 'pipelines/sales_pipeline.yaml',
            ref: 'refs/heads/main',
            commitSha: 'abc123',
            contentSha256: sha256HexUtf8(expectedGraphArtifactContent),
          },
          sqlArtifact: {
            repo: 'dunay2/dvt',
            path: 'models/transform.sql',
            ref: 'refs/heads/main',
            commitSha: 'abc123',
            contentSha256: sha256HexUtf8('select * from analytics.orders'),
          },
        },
      })
    );
    expect(workspaceFilePorts.workspaceFileContentCommand.saveFileContent).toHaveBeenCalledWith({
      path: 'pipelines/sales_pipeline.yaml',
      content: expectedGraphArtifactContent,
      expectedRevision: {
        kind: 'content_sha256',
        value: sha256HexUtf8('name: sales_pipeline\nsteps: []'),
      },
    });
  });
});
