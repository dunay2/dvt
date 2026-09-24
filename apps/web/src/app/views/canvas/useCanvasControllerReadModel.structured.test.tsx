// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitStructuredFieldDocument } from './canvasDvtSubstraitStructuredField';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { createDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import {
  type ReadModelArgs,
  type ReadModelNodeData,
  testNode,
  buildReadModelArgs,
  renderReadModel,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model structured', () => {
  it('keeps structured output toggles and root reorder after a second Source is connected', async () => {
    const sourceRef = {
      schemaVersion: 'connected-source-ref.v1' as const,
      connectionRef: {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'warehouse-main',
        provider: 'postgres' as const,
      },
      sourceObjectId: 'raw.orders',
    };
    const sourceNode = {
      ...testNode,
      metadata: {
        schema: 'raw',
        tableName: 'orders',
        connectedSourceRef: sourceRef,
        columns: [
          { name: 'order_id', type: 'integer' },
          { name: 'customer', type: 'text' },
          { name: 'amount', type: 'numeric' },
        ],
      },
    } satisfies CanonicalNode;
    const secondSourceNode = {
      ...sourceNode,
      id: 'source-health-check',
      name: 'Health check',
      metadata: {
        ...sourceNode.metadata,
        schema: 'core',
        tableName: 'health_check',
        connectedSourceRef: { ...sourceRef, sourceObjectId: 'core.health_check' },
        columns: [{ name: 'id', type: 'integer' }],
      },
    } satisfies CanonicalNode;
    const flatDraft = createDvtSubstraitProjectionDraft({
      source: {
        nodeId: sourceNode.id,
        schema: 'raw',
        table: 'orders',
        sourceRef,
        fields: sourceNode.metadata.columns.map((column) => ({
          name: column.name,
          dataType: column.type,
        })),
      },
      targetNodeId: 'transform-orders',
      outputs: sourceNode.metadata.columns.map((column) => ({
        fieldId: 'output:' + column.name,
        name: column.name,
        sourceFieldName: column.name,
      })),
    });
    const structuredDraft = composeDvtSubstraitProjectionFields(flatDraft, {
      draggedFieldId: 'output:customer',
      targetFieldId: 'output:order_id',
      parentFieldId: 'output:identity',
      parentName: 'identity',
    });
    const transformNode = applyDvtSubstraitSemanticDocument(
      {
        ...testNode,
        id: 'transform-orders',
        name: 'Transform orders',
        kind: 'dvt:transform',
        role: 'transform',
      },
      encodeDvtSubstraitStructuredFieldDocument(structuredDraft)
    );
    const dependencies = [
      {
        id: 'source-to-transform',
        sourceId: sourceNode.id,
        targetId: transformNode.id,
        relation: 'lineage' as const,
      },
      {
        id: 'second-source-to-transform',
        sourceId: secondSourceNode.id,
        targetId: transformNode.id,
        relation: 'lineage' as const,
      },
    ];
    const presentationTruth = await projectCanvasNodePresentationTruth({
      node: transformNode,
      nodes: [sourceNode, secondSourceNode, transformNode],
      edges: dependencies,
    });
    const graphNodes = [sourceNode, secondSourceNode, transformNode].map((node, index) =>
      mapCanonicalNodeToCanvasNode({
        canonicalNode: node,
        index,
        showColumns: true,
        ...(node.id === transformNode.id ? { presentationTruth } : {}),
      })
    );
    const base = buildReadModelArgs({ canMutateGraph: true });
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: dependencies.map((dependency) => ({
          id: dependency.id,
          source: dependency.sourceId,
          target: dependency.targetId,
        })),
        canonicalNodesById: new Map(
          [sourceNode, secondSourceNode, transformNode].map((node) => [node.id, node])
        ),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes: [sourceNode, secondSourceNode, transformNode],
        canonicalEdges: dependencies,
      },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: [sourceNode.id, secondSourceNode.id, transformNode.id],
      },
    };
    const mounted = await renderReadModel(args);

    try {
      const modelData = mounted
        .readState()
        ?.nodesWithImpact.find((node) => node.id === transformNode.id)?.data as ReadModelNodeData;
      expect(modelData.onToggleCanvasColumnOutput).toBe(
        args.columnActions.onToggleCanvasColumnOutput
      );
      expect(modelData.onReorderCanvasColumnOutput).toBe(
        args.columnActions.onReorderCanvasColumnOutput
      );
    } finally {
      await mounted.cleanup();
    }
  });
});
