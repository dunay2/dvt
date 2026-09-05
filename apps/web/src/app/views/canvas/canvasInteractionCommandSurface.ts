/** Owned concern: derive Canvas context-menu command models without owning graph mutation. */
import type { Edge, EdgeChange } from '@xyflow/react';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { canvasViewCopy, type CanvasViewCopy } from './copy';
import type { CanvasDependencyEdgeData } from './canvasDependencyEdgeModel';
import type { WorkspaceGraphAuthoringEdgeExecutionGateCommand } from '@dvt/contracts';

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
      removable?: boolean;
      sourceId?: string;
      targetId?: string;
      execution?: CanvasDependencyEdgeData['execution'];
      screenPosition: CanvasContextMenuPosition;
    }>;

export type CanvasContextMenuCreateNodeAction = Readonly<{
  action: 'create-node';
  label: string;
  registration: NodeKindRegistration;
}>;

export type CanvasContextMenuSourceImportCatalogAction = Readonly<{
  action: 'open-source-import';
  label: string;
  registration: NodeKindRegistration;
}>;

export type CanvasContextMenuCatalogAction =
  CanvasContextMenuCreateNodeAction | CanvasContextMenuSourceImportCatalogAction;

export type CanvasContextMenuCanvasAction = Readonly<{
  action: 'open-add-node-catalog' | 'open-source-import' | 'open-canvas-settings';
  label: string;
}>;

export type CanvasContextMenuEdgeAction =
  | Readonly<{
      action: 'remove-edge';
      label: string;
    }>
  | Readonly<{
      action: 'set-execution-gate';
      label: string;
      sourceId: string;
      targetId: string;
      gate: WorkspaceGraphAuthoringEdgeExecutionGateCommand;
    }>;

export type CanvasContextMenuModel = Readonly<{
  surface: 'root' | 'add-node-catalog' | 'edge';
  kind: CanvasContextMenuTarget['kind'];
  screenPosition: CanvasContextMenuPosition;
  flowPosition?: CanvasContextMenuPosition;
  edgeId?: string;
  canvasActions: readonly CanvasContextMenuCanvasAction[];
  catalogActions: readonly CanvasContextMenuCatalogAction[];
  createNodeActions: readonly CanvasContextMenuCreateNodeAction[];
  edgeActions: readonly CanvasContextMenuEdgeAction[];
}>;

type BuildCanvasContextMenuModelArgs = Readonly<{
  target: CanvasContextMenuTarget;
  canMutateGraph: boolean;
  canOpenSourceImport?: boolean;
  canOpenCanvasSettings?: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
  copy?: CanvasViewCopy;
}>;

function isSourceNodeKind(registration: NodeKindRegistration): boolean {
  return registration.kind.endsWith(':source');
}

function formatCreateNodeActionLabel(
  registration: NodeKindRegistration,
  copy: CanvasViewCopy
): string {
  if (registration.kind.endsWith(':source')) {
    return copy.canvasContextMenuAddSourceLabel;
  }

  if (
    registration.role === 'transform' ||
    registration.kind.endsWith(':model') ||
    registration.kind.endsWith(':transform')
  ) {
    return copy.canvasContextMenuAddModelLabel;
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

function resolveCanvasActionLabel(
  action: CanvasContextMenuCanvasAction['action'],
  copy: CanvasViewCopy
): string {
  switch (action) {
    case 'open-add-node-catalog':
      return copy.canvasContextMenuAddLabel;
    case 'open-source-import':
      return copy.canvasContextMenuAddSourceLabel;
    case 'open-canvas-settings':
      return copy.canvasContextMenuCanvasSettingsLabel;
  }
}

function resolveCatalogActionLabel(
  action: CanvasContextMenuCatalogAction['action'],
  registration: NodeKindRegistration,
  copy: CanvasViewCopy
): string {
  return action === 'open-source-import'
    ? copy.canvasContextMenuAddSourceLabel
    : formatCreateNodeActionLabel(registration, copy);
}

export function buildCanvasContextMenuModel({
  target,
  canMutateGraph,
  canOpenSourceImport = false,
  canOpenCanvasSettings = false,
  authoringNodeKinds,
  copy = canvasViewCopy,
}: BuildCanvasContextMenuModelArgs): CanvasContextMenuModel {
  const canvasActions: CanvasContextMenuCanvasAction[] = [];
  if (target.kind === 'pane') {
    const hasSourceImportKind = authoringNodeKinds.some(isSourceNodeKind);
    if (
      (canMutateGraph && authoringNodeKinds.length > 0) ||
      (canOpenSourceImport && hasSourceImportKind)
    ) {
      canvasActions.push({
        action: 'open-add-node-catalog',
        label: resolveCanvasActionLabel('open-add-node-catalog', copy),
      });
    }
    if (canOpenCanvasSettings) {
      canvasActions.push({
        action: 'open-canvas-settings',
        label: resolveCanvasActionLabel('open-canvas-settings', copy),
      });
    }
  }

  const baseModel = {
    surface: target.kind === 'edge' ? 'edge' : 'root',
    kind: target.kind,
    screenPosition: target.screenPosition,
    canvasActions,
    catalogActions: [],
    createNodeActions: [],
    edgeActions: [],
  } satisfies CanvasContextMenuModel;

  if (target.kind === 'pane') {
    return {
      ...baseModel,
      flowPosition: target.flowPosition,
    };
  }

  if (!canMutateGraph) {
    return baseModel;
  }

  const edgeActions: CanvasContextMenuEdgeAction[] = [];
  if (target.execution?.isGateable === true && target.sourceId != null && target.targetId != null) {
    const gate = target.execution.gateState === 'open' ? 'closed' : 'open';
    edgeActions.push({
      action: 'set-execution-gate',
      label:
        gate === 'closed'
          ? copy.canvasContextMenuCloseEdgeLabel
          : copy.canvasContextMenuOpenEdgeLabel,
      sourceId: target.sourceId,
      targetId: target.targetId,
      gate,
    });
  }
  if (target.removable !== false) {
    edgeActions.push({ action: 'remove-edge', label: copy.canvasContextMenuRemoveEdgeLabel });
  }

  return {
    ...baseModel,
    edgeId: target.edgeId,
    edgeActions,
  };
}

export function buildCanvasAddNodeCatalogMenuModel({
  sourceModel,
  authoringNodeKinds,
  canOpenSourceImport = false,
  canCreateAuthoringNodes = true,
  copy = canvasViewCopy,
}: Readonly<{
  sourceModel: CanvasContextMenuModel | null;
  authoringNodeKinds: readonly NodeKindRegistration[];
  canOpenSourceImport?: boolean;
  canCreateAuthoringNodes?: boolean;
  copy?: CanvasViewCopy;
}>): CanvasContextMenuModel | null {
  if (sourceModel == null || sourceModel.kind !== 'pane' || sourceModel.flowPosition == null) {
    return null;
  }

  const sourceImportRegistration = canOpenSourceImport
    ? authoringNodeKinds.find(isSourceNodeKind)
    : undefined;
  const sourceImportActions: CanvasContextMenuSourceImportCatalogAction[] =
    sourceImportRegistration == null
      ? []
      : [
          {
            action: 'open-source-import',
            label: resolveCatalogActionLabel('open-source-import', sourceImportRegistration, copy),
            registration: sourceImportRegistration,
          },
        ];
  const createNodeActions: CanvasContextMenuCreateNodeAction[] = canCreateAuthoringNodes
    ? authoringNodeKinds
        .filter((registration) => registration !== sourceImportRegistration)
        .map((registration) => ({
          action: 'create-node',
          label: resolveCatalogActionLabel('create-node', registration, copy),
          registration,
        }))
    : [];

  return {
    ...sourceModel,
    surface: 'add-node-catalog',
    canvasActions: [],
    catalogActions: [...sourceImportActions, ...createNodeActions],
    createNodeActions,
    edgeActions: [],
  };
}

export function localizeCanvasContextMenuModel(
  model: CanvasContextMenuModel,
  copy: CanvasViewCopy
): CanvasContextMenuModel {
  const localizeCreateNodeAction = (
    action: CanvasContextMenuCreateNodeAction
  ): CanvasContextMenuCreateNodeAction => ({
    ...action,
    label: resolveCatalogActionLabel(action.action, action.registration, copy),
  });
  const localizeCatalogAction = (
    action: CanvasContextMenuCatalogAction
  ): CanvasContextMenuCatalogAction =>
    action.action === 'open-source-import'
      ? {
          ...action,
          label: resolveCatalogActionLabel(action.action, action.registration, copy),
        }
      : localizeCreateNodeAction(action);

  // Reproject presentation copy without rebuilding command intent or its captured target.
  return {
    ...model,
    canvasActions: model.canvasActions.map((action) => ({
      ...action,
      label: resolveCanvasActionLabel(action.action, copy),
    })),
    catalogActions: model.catalogActions.map(localizeCatalogAction),
    createNodeActions: model.createNodeActions.map(localizeCreateNodeAction),
    edgeActions: model.edgeActions.map((action) => ({
      ...action,
      label:
        action.action === 'remove-edge'
          ? copy.canvasContextMenuRemoveEdgeLabel
          : action.gate === 'closed'
            ? copy.canvasContextMenuCloseEdgeLabel
            : copy.canvasContextMenuOpenEdgeLabel,
    })),
  };
}

export function buildCanvasEdgeContextRemovalChange(edge: Pick<Edge, 'id'>): EdgeChange<Edge> {
  return {
    id: edge.id,
    type: 'remove',
  };
}
