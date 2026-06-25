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
  action:
    | 'open-source-import'
    | 'open-project-explorer'
    | 'open-project-code'
    | 'validate-graph'
    | 'preview-execution-plan'
    | 'open-canvas-settings';
  label:
    | 'Add source'
    | 'Explore project'
    | 'Open project code'
    | 'Validate graph'
    | 'Preview execution plan'
    | 'Canvas settings';
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
  canOpenProjectExplorer?: boolean;
  canOpenProjectCode?: boolean;
  canValidateGraph?: boolean;
  canPreviewExecutionPlan?: boolean;
  canOpenCanvasSettings?: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
}>;

function isSourceNodeKind(registration: NodeKindRegistration): boolean {
  return registration.kind.endsWith(':source');
}

function formatCreateNodeActionLabel(
  registration: NodeKindRegistration,
  sourceImportVisible: boolean
): string {
  if (sourceImportVisible && isSourceNodeKind(registration)) {
    return 'Create source node';
  }

  const label = registration.label.trim();
  if (label.length === 0) {
    return 'Add node';
  }

  if (/^[A-Z]{2,}\b/.test(label)) {
    return `Add ${label}`;
  }

  return `Add ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

export function buildCanvasContextMenuModel({
  target,
  canMutateGraph,
  canOpenSourceImport = false,
  canOpenProjectExplorer = false,
  canOpenProjectCode = false,
  canValidateGraph = false,
  canPreviewExecutionPlan = false,
  canOpenCanvasSettings = false,
  authoringNodeKinds,
}: BuildCanvasContextMenuModelArgs): CanvasContextMenuModel {
  const canvasActions: CanvasContextMenuCanvasAction[] = [];
  const sourceImportVisible = target.kind === 'pane' && canMutateGraph && canOpenSourceImport;
  if (target.kind === 'pane') {
    if (sourceImportVisible) {
      canvasActions.push({ action: 'open-source-import', label: 'Add source' });
    }
    if (canOpenProjectExplorer) {
      canvasActions.push({ action: 'open-project-explorer', label: 'Explore project' });
    }
    if (canOpenProjectCode) {
      canvasActions.push({ action: 'open-project-code', label: 'Open project code' });
    }
    if (canValidateGraph) {
      canvasActions.push({ action: 'validate-graph', label: 'Validate graph' });
    }
    if (canPreviewExecutionPlan) {
      canvasActions.push({
        action: 'preview-execution-plan',
        label: 'Preview execution plan',
      });
    }
    if (canOpenCanvasSettings) {
      canvasActions.push({ action: 'open-canvas-settings', label: 'Canvas settings' });
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
        .filter((registration) => !(canOpenSourceImport && isSourceNodeKind(registration)))
        .map((registration) => ({
          action: 'create-node',
          label: formatCreateNodeActionLabel(registration, sourceImportVisible),
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
