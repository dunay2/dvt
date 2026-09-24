// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import {
  type ReadModelArgs,
  type ReadModelNodeData,
  testNode,
  buildReadModelArgs,
  renderReadModel,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model inputIdentity', () => {
  it('keeps the upstream Model FieldId when an inherited output is inactive', async () => {
    const upstream = {
      ...testNode,
      id: 'upstream-model',
      name: 'Upstream model',
      kind: 'dvt:transform',
      role: 'transform',
    } satisfies CanonicalNode;
    const downstream = {
      ...upstream,
      id: 'downstream-model',
      name: 'Downstream model',
    } satisfies CanonicalNode;
    const presentationTruth: CanvasNodePresentationTruth = {
      columns: {
        declared: [],
        inherited: [
          {
            name: 'total',
            type: 'numeric',
            provenance: 'inherited',
            reference: 'upstream:total',
            sourceNodeId: upstream.id,
            sourceNodeName: upstream.name,
          },
        ],
        visible: [
          {
            name: 'total',
            type: 'numeric',
            provenance: 'inherited',
            reference: 'upstream:total',
            sourceNodeId: upstream.id,
            sourceNodeName: upstream.name,
          },
        ],
        declaredCount: 0,
        inheritedCount: 1,
        visibleCount: 1,
        visibleProvenance: 'inherited',
      },
      code: { kind: 'unavailable' },
    };
    const graphNodes = [upstream, downstream].map((node, index) =>
      mapCanonicalNodeToCanvasNode({
        canonicalNode: node,
        index,
        showColumns: true,
        ...(node.id === downstream.id ? { presentationTruth } : {}),
      })
    );
    const base = buildReadModelArgs({ canMutateGraph: true });
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: [{ id: 'model-chain', source: upstream.id, target: downstream.id }],
        canonicalNodesById: new Map([
          [upstream.id, upstream],
          [downstream.id, downstream],
        ]),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes: [upstream, downstream],
        canonicalEdges: [
          {
            id: 'model-chain',
            sourceId: upstream.id,
            targetId: downstream.id,
            relation: 'lineage',
          },
        ],
      },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: [upstream.id, downstream.id],
      },
    };
    const mounted = await renderReadModel(args);

    try {
      const downstreamData = mounted
        .readState()
        ?.nodesWithImpact.find((node) => node.id === downstream.id)?.data as ReadModelNodeData;
      expect(downstreamData.columns).toEqual([
        expect.objectContaining({ id: 'upstream:total', name: 'total', output: false }),
      ]);
    } finally {
      await mounted.cleanup();
    }
  });
});
