/** Owned concern: derive Canvas context-menu command models without owning graph mutation. */
import type { Edge, EdgeChange } from '@xyflow/react';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';

export type CanvasContextMenuPosition = Readonly<{
  x: number;
  y: number;
}>;

export type CanvasContextMenuTarget =
  | Readonly<{
      kind: 'pane';
      screenPosition: CanvasContextMenuPosition;
      flowPosition: CanvasContextMenuPosition;
    }>
  | Readonly<{
      kind: 'edge';
      edgeId: string;
      screenPosition: CanvasContextMenuPosition;
    }>;

export type CanvasContextMenuCreateNodeAction = Readonly<{
  action: 'create-node';
  label: string;
  registration: NodeKindRegistration;
}>;

export type CanvasContextMenuEdgeAction = Readonly<{
  action: 'remove-edge';
  label: 'Eliminar conexión';
}>;

export type CanvasContextMenuModel = Readonly<{
  kind: CanvasContextMenuTarget['kind'];
  screenPosition: CanvasContextMenuPosition;
  flowPosition?: CanvasContextMenuPosition;
  edgeId?: string;
  createNodeActions: readonly CanvasContextMenuCreateNodeAction[];
  edgeActions: readonly CanvasContextMenuEdgeAction[];
}>;

type BuildCanvasContextMenuModelArgs = Readonly<{
  target: CanvasContextMenuTarget;
  canMutateGraph: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
}>;

export function buildCanvasContextMenuModel({
  target,
  canMutateGraph,
  authoringNodeKinds,
}: BuildCanvasContextMenuModelArgs): CanvasContextMenuModel {
  const baseModel = {
    kind: target.kind,
    screenPosition: target.screenPosition,
    createNodeActions: [],
    edgeActions: [],
  } satisfies CanvasContextMenuModel;

  if (!canMutateGraph) {
    return baseModel;
  }

  if (target.kind === 'pane') {
    return {
      ...baseModel,
      flowPosition: target.flowPosition,
      createNodeActions: authoringNodeKinds.map((registration) => ({
        action: 'create-node',
        label: registration.label,
        registration,
      })),
    };
  }

  return {
    ...baseModel,
    edgeId: target.edgeId,
    edgeActions: [{ action: 'remove-edge', label: 'Eliminar conexión' }],
  };
}

export function buildCanvasEdgeContextRemovalChange(edge: Pick<Edge, 'id'>): EdgeChange<Edge> {
  return {
    id: edge.id,
    type: 'remove',
  };
}
