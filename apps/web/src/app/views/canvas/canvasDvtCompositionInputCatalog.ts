/** Owned concern: resolve connected source relations available for canonical DVT composition. */
import type { ConnectedSourceRef, ConnectionRef, DvtInputBindingsV1 } from '@dvt/contracts';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInputBindingEdge } from './canvasInputBindings';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { resolveCanvasModelCompositionInput } from './canvasModelCompositionInput';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';

export type CanvasDvtCompositionField = Readonly<{
  id?: string;
  name: string;
  dataType: string;
  joinDataType: DvtSubstraitJoinDataType | null;
  nullable?: boolean;
}>;

export type CanvasDvtCompositionInput = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  fields: readonly CanvasDvtCompositionField[];
  inputBindings?: DvtInputBindingsV1;
}> &
  (
    | Readonly<{ sourceRef: ConnectedSourceRef; producer?: never }>
    | Readonly<{
        sourceRef: null;
        producer: Readonly<{
          nodeId: string;
          name: string;
          document: SubstraitDocument;
          connection: ConnectionRef;
        }>;
      }>
  );

export function resolveCanvasDvtCompositionInputs(
  args: Readonly<{
    targetNodeId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanvasInputBindingEdge[];
  }>
): readonly CanvasDvtCompositionInput[] {
  const sourceIds = new Set(
    args.edges.filter((edge) => edge.targetId === args.targetNodeId).map((edge) => edge.sourceId)
  );
  return args.nodes
    .filter((node) => sourceIds.has(node.id))
    .map((node) => {
      const edge = args.edges.find(
        (candidate) => candidate.sourceId === node.id && candidate.targetId === args.targetNodeId
      )!;
      return (
        resolveCanvasPhysicalCompositionInput(node, edge) ??
        resolveCanvasModelCompositionInput(node, args.nodes, edge, args.edges)
      );
    })
    .filter((input): input is CanvasDvtCompositionInput => input != null);
}
