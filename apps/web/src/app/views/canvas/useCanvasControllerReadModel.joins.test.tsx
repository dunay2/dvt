// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitJoinDraft,
  encodeDvtSubstraitJoinDocument,
  type DvtSubstraitJoinSource,
} from './canvasDvtSubstraitJoinComposition';
import {
  type ReadModelArgs,
  testNode,
  buildReadModelArgs,
  renderReadModel,
  readProjectedNodeData,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model joins', () => {
  it.each([true, false])(
    'projects JOIN output controls without enabling input remapping (editable=%s)',
    async (editable) => {
      const source = (table: string): DvtSubstraitJoinSource => ({
        nodeId: table,
        schema: 'raw',
        table,
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1' as const,
          sourceObjectId: `raw.${table}`,
          connectionRef: {
            schemaVersion: 'connection-ref.v1' as const,
            connectionId: 'pg',
            provider: 'postgres' as const,
          },
        },
      });
      const join = applyDvtSubstraitSemanticDocument(
        {
          ...testNode,
          id: 'joined',
          kind: 'dvt:transform',
          role: 'transform',
        },
        encodeDvtSubstraitJoinDocument(
          createDvtSubstraitJoinDraft({
            left: source('customers'),
            right: source('orders'),
            targetNodeId: 'joined',
          })
        )
      );
      const base = buildReadModelArgs({ canMutateGraph: editable });
      const mapped = mapCanonicalNodeToCanvasNode({
        canonicalNode: join,
        index: 0,
        showColumns: true,
      });
      const args: ReadModelArgs = {
        ...base,
        graphModel: {
          ...base.graphModel,
          nodes: [mapped],
          canonicalNodesById: new Map([[join.id, join]]),
        },
        visibleScope: { canonicalNodes: [join], canonicalEdges: [] },
      };
      const mounted = await renderReadModel(args);
      try {
        const data = readProjectedNodeData(mounted.readState())!;
        expect(data.onToggleCanvasColumnOutput).toBe(
          editable ? args.columnActions.onToggleCanvasColumnOutput : undefined
        );
        expect(data.onReorderCanvasColumnOutput).toBe(
          editable ? args.columnActions.onReorderCanvasColumnOutput : undefined
        );
        expect(data.onColumnPortActivate).toBeUndefined();
        expect(data.onApplyCanvasColumnFunction).toBeUndefined();
        expect(data.onAddCanvasCalculatedColumn).toBeUndefined();
      } finally {
        await mounted.cleanup();
      }
    }
  );
});
