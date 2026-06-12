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

export type CanvasContextMenuCanvasAction = Readonly<{
  action: 'open-source-import' | 'preview-execution-plan';
  label: 'Add source' | 'Preview execution plan';
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
  canvasActions: readonly CanvasContextMenuCanvasAction[];
  createNodeActions: readonly CanvasContextMenuCreateNodeAction[];
  edgeActions: readonly CanvasContextMenuEdgeAction[];
}>;

type BuildCanvasContextMenuModelArgs = Readonly<{
  target: CanvasContextMenuTarget;
  canMutateGraph: boolean;
  canOpenSourceImport?: boolean;
  canPreviewExecutionPlan?: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
}>;

function isSourceImportCoveredNodeKind(registration: NodeKindRegistration): boolean {
  return (
    registration.role === 'input' &&
    (registration.kind.endsWith(':source') || registration.label.toLowerCase() === 'source')
  );
}

export function buildCanvasContextMenuModel({
  target,
  canMutateGraph,
  canOpenSourceImport = false,
  canPreviewExecutionPlan = false,
  authoringNodeKinds,
}: BuildCanvasContextMenuModelArgs): CanvasContextMenuModel {
  const canvasActions: CanvasContextMenuCanvasAction[] = [];
  if (target.kind === 'pane') {
    if (canMutateGraph && canOpenSourceImport) {
      canvasActions.push({ action: 'open-source-import', label: 'Add source' });
    }
    if (canPreviewExecutionPlan) {
      canvasActions.push({
        action: 'preview-execution-plan',
        label: 'Preview execution plan',
      });
    }
  }

  const baseModel = {
    kind: target.kind,
    screenPosition: target.screenPosition,
    canvasActions,
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
      createNodeActions: authoringNodeKinds
        .filter(
          (registration) => !(canOpenSourceImport && isSourceImportCoveredNodeKind(registration))
        )
        .map((registration) => ({
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
