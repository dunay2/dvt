// @vitest-environment jsdom

import { asSha256HexString, type ConnectedSourceRef } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
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

  it('plans the persisted two-source Substrait INNER JOIN through the real Canvas action', async () => {
    const connectionRef = buildTestPostgresConnectionRef();
    const connectedSourceRef = (table: string): ConnectedSourceRef => ({
      schemaVersion: 'connected-source-ref.v1' as const,
      connectionRef,
      sourceObjectId: `public.${table}`,
    });
    const source = (id: string, table: string, columns: readonly string[]): CanonicalNode => ({
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
        columns: columns.map((name) => ({ name, type: 'string' })),
        connectedSourceRef: connectedSourceRef(table),
      },
    });
    const draft = createDvtSubstraitInnerJoinDraft({
      left: {
        nodeId: 'source-customers',
        schema: 'public',
        table: 'customers',
        sourceRef: connectedSourceRef('customers'),
      },
      right: {
        nodeId: 'source-orders',
        schema: 'public',
        table: 'orders',
        sourceRef: connectedSourceRef('orders'),
      },
      targetNodeId: 'join',
    });
    const transform = applyDvtSubstraitSemanticDocument(
      {
        id: 'join',
        name: 'Customer orders',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        path: 'models/customer-orders.sql',
        metadata: { config: { dialect: 'postgres' } },
      },
      encodeDvtSubstraitInnerJoinDocument(draft)
    );
    const canonicalNodes: CanonicalNode[] = [
      source('source-customers', 'customers', ['customer_id', 'name']),
      source('source-orders', 'orders', ['order_id', 'customer_id']),
      transform,
      {
        id: 'sink',
        name: 'Customer orders sink',
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
      },
    ];
    const canonicalEdges: CanonicalEdge[] = [
      {
        id: 'customers-join',
        sourceId: 'source-customers',
        targetId: 'join',
        relation: 'lineage',
      },
      {
        id: 'orders-join',
        sourceId: 'source-orders',
        targetId: 'join',
        relation: 'lineage',
      },
      { id: 'join-sink', sourceId: 'join', targetId: 'sink', relation: 'lineage' },
    ];
    const plansService = createPlansServiceMock();
    const workspaceFilePorts = createWorkspaceFilePortMocks({});

    harness = renderExecutionActionsHarness({
      plansService,
      runsService: createRunsServiceMock(),
      ...workspaceFilePorts,
      canonicalNodes,
      canonicalEdges,
      previewProvenanceConfig: {
        gitBranch: 'main',
        gitSha: 'abc123',
        gitRepo: 'dunay2/dvt',
        graphArtifactPath: 'pipelines/customer-orders.yaml',
      },
    });
    await harness.render();

    await harness.clickPlan();

    expect(plansService.previewPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        previewProfile: 'transformation-sql-first-v2',
        selection: {
          mode: 'explicit',
          nodeIds: ['source-customers', 'source-orders', 'join', 'sink'],
        },
        graphSource: expect.objectContaining({
          nodes: [
            expect.objectContaining({ nodeId: 'source-customers', dependsOn: [] }),
            expect.objectContaining({ nodeId: 'source-orders', dependsOn: [] }),
            expect.objectContaining({
              nodeId: 'join',
              dependsOn: ['source-customers', 'source-orders'],
              stepTypeConfig: expect.objectContaining({
                sql: expect.stringMatching(/join public\.orders as right_source/i),
              }),
            }),
            expect.objectContaining({ nodeId: 'sink', dependsOn: ['join'] }),
          ],
        }),
      })
    );
    expect(harness.shellFeedback.success).toHaveBeenCalledWith(canvasViewCopy.planCreatedMessage);
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
