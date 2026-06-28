/** Owned concern: derive Canvas context-menu command models without owning graph mutation. */
import type { Edge, EdgeChange } from '@xyflow/react';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { canvasViewCopy, type CanvasViewCopy } from './copy';

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
  action: 'open-add-node-catalog' | 'open-source-import' | 'open-canvas-settings';
  label: string;
}>;

export type CanvasContextMenuEdgeAction = Readonly<{
  action: 'remove-edge';
  label: string;
}>;

export type CanvasContextMenuModel = Readonly<{
  surface: 'root' | 'add-node-catalog' | 'edge';
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
  canOpenCanvasSettings?: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
  copy?: CanvasViewCopy;
}>;

function isSourceNodeKind(registration: NodeKindRegistration): boolean {
  return registration.kind.endsWith(':source');
}

function formatCreateNodeActionLabel(
  registration: NodeKindRegistration,
  sourceImportVisible: boolean,
  copy: CanvasViewCopy
): string {
  if (sourceImportVisible && isSourceNodeKind(registration)) {
    return 'Create source node';
  }

  if (registration.kind.endsWith(':source')) {
    return copy.canvasContextMenuAddSourceLabel;
  }

  if (registration.kind === 'dbt:model') {
    return copy.canvasContextMenuAddModelLabel;
  }

  if (registration.kind === 'dvt:sql_transform' || registration.role === 'transform') {
    return copy.canvasContextMenuAddTransformationLabel;
  }

  if (registration.kind.endsWith(':test') || registration.role === 'check') {
    return copy.canvasContextMenuAddTestLabel;
  }

  if (registration.kind === 'dvt:sink' || registration.role === 'output') {
    return copy.canvasContextMenuAddOutputLabel;
  }

  const label = registration.label.trim();
  if (label.length === 0) {
    return copy.canvasContextMenuAddNodeLabel;
  }

  if (/^[A-Z]{2,}\b/.test(label)) {
    return `${copy.canvasContextMenuAddNodeLabel} ${label}`;
  }

  return `${copy.canvasContextMenuAddNodeLabel} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

export function buildCanvasContextMenuModel({
  target,
  canMutateGraph,
  canOpenCanvasSettings = false,
  authoringNodeKinds,
  copy = canvasViewCopy,
}: BuildCanvasContextMenuModelArgs): CanvasContextMenuModel {
  const canvasActions: CanvasContextMenuCanvasAction[] = [];
  if (target.kind === 'pane') {
    if (canMutateGraph && authoringNodeKinds.length > 0) {
      canvasActions.push({
        action: 'open-add-node-catalog',
        label: copy.canvasContextMenuAddLabel,
      });
    }
    if (canOpenCanvasSettings) {
      canvasActions.push({
        action: 'open-canvas-settings',
        label: copy.canvasContextMenuCanvasSettingsLabel,
      });
    }
  }

  const baseModel = {
    surface: target.kind === 'edge' ? 'edge' : 'root',
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
    };
  }

  return {
    ...baseModel,
    edgeId: target.edgeId,
    edgeActions: [{ action: 'remove-edge', label: 'Eliminar conexión' }],
  };
}

export function buildCanvasAddNodeCatalogMenuModel({
  sourceModel,
  authoringNodeKinds,
  canOpenSourceImport = false,
  copy = canvasViewCopy,
}: Readonly<{
  sourceModel: CanvasContextMenuModel | null;
  authoringNodeKinds: readonly NodeKindRegistration[];
  canOpenSourceImport?: boolean;
  copy?: CanvasViewCopy;
}>): CanvasContextMenuModel | null {
  if (sourceModel == null || sourceModel.kind !== 'pane' || sourceModel.flowPosition == null) {
    return null;
  }

  const sourceImportActions: CanvasContextMenuCanvasAction[] = canOpenSourceImport
    ? [{ action: 'open-source-import', label: copy.canvasContextMenuAddSourceLabel }]
    : [];

  return {
    ...sourceModel,
    surface: 'add-node-catalog',
    canvasActions: sourceImportActions,
    createNodeActions: authoringNodeKinds
      .filter((registration) => !(canOpenSourceImport && isSourceNodeKind(registration)))
      .map((registration) => ({
        action: 'create-node',
        label: formatCreateNodeActionLabel(registration, false, copy),
        registration,
      })),
    edgeActions: [],
  };
}

export function buildCanvasEdgeContextRemovalChange(edge: Pick<Edge, 'id'>): EdgeChange<Edge> {
  return {
    id: edge.id,
    type: 'remove',
  };
}
