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

describe('Canvas read model outputIdentity', () => {
  it('keeps each visible column identity when local order diverges from presentation truth', async () => {
    const model = {
      ...testNode,
      id: 'model-orders',
      name: 'Orders model',
      kind: 'dvt:transform',
      role: 'transform',
    } satisfies CanonicalNode;
    const presentationTruth: CanvasNodePresentationTruth = {
      columns: {
        declared: [
          { name: 'event_id', type: 'text', provenance: 'declared', reference: 'dvt_fld_event_id' },
          {
            name: 'event_type',
            type: 'text',
            provenance: 'declared',
            reference: 'dvt_fld_event_type',
          },
        ],
        inherited: [
          {
            name: 'request_id',
            type: 'text',
            provenance: 'inherited',
            reference: 'dvt_fld_source_request_id',
            sourceNodeId: testNode.id,
            sourceNodeName: testNode.name,
          },
        ],
        visible: [
          { name: 'event_id', type: 'text', provenance: 'declared', reference: 'dvt_fld_event_id' },
          {
            name: 'event_type',
            type: 'text',
            provenance: 'declared',
            reference: 'dvt_fld_event_type',
          },
          {
            name: 'request_id',
            type: 'text',
            provenance: 'inherited',
            reference: 'dvt_fld_source_request_id',
            sourceNodeId: testNode.id,
            sourceNodeName: testNode.name,
          },
        ],
        declaredCount: 2,
        inheritedCount: 1,
        visibleCount: 3,
        visibleProvenance: 'mixed',
      },
      code: { kind: 'unavailable' },
    };
    const mapped = mapCanonicalNodeToCanvasNode({
      canonicalNode: model,
      index: 1,
      showColumns: true,
      presentationTruth,
    });
    const originalColumns = mapped.data.columns ?? [];
    const graphNode = {
      ...mapped,
      data: {
        ...mapped.data,
        columns: [
          originalColumns[1]!,
          originalColumns[2]!,
          originalColumns[0]!,
          { id: 'dvt_fld_manual', name: 'manual', type: 'text', output: true },
        ],
      },
    };
    const base = buildReadModelArgs({ canMutateGraph: true });
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: [graphNode],
        edges: [],
        canonicalNodesById: new Map<string, CanonicalNode>([
          [testNode.id, testNode],
          [model.id, model],
        ]),
        onEdgesChange: vi.fn(),
      },
      visibleScope: { canonicalNodes: [testNode, model], canonicalEdges: [] },
      executionScope: { selectedNodeIds: [], workspaceNodeIds: [testNode.id, model.id] },
    };
    const mounted = await renderReadModel(args);

    try {
      const columns = (mounted.readState()?.nodesWithImpact[0]?.data as ReadModelNodeData)
        .columns as ReadonlyArray<{ id: string; name: string }>;
      expect(columns.map(({ id, name }) => ({ id, name }))).toEqual([
        { id: 'dvt_fld_event_type', name: 'event_type' },
        { id: 'dvt_fld_source_request_id', name: 'request_id' },
        { id: 'dvt_fld_event_id', name: 'event_id' },
        { id: 'dvt_fld_manual', name: 'manual' },
      ]);
    } finally {
      await mounted.cleanup();
    }
  });
});
