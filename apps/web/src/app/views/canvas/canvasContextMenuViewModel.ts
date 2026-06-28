/** Owned concern: project Canvas context-menu models into presentation sections. */
import type {
  CanvasContextMenuCanvasAction,
  CanvasContextMenuCreateNodeAction,
  CanvasContextMenuEdgeAction,
  CanvasContextMenuModel,
} from './canvasInteractionCommandSurface';

export type CanvasContextMenuViewItem =
  | Readonly<{
      id: string;
      kind: 'canvas';
      label: CanvasContextMenuCanvasAction['label'];
      action: CanvasContextMenuCanvasAction;
    }>
  | Readonly<{
      id: string;
      kind: 'create-node';
      label: string;
      action: CanvasContextMenuCreateNodeAction;
    }>
  | Readonly<{
      id: string;
      kind: 'edge';
      label: CanvasContextMenuEdgeAction['label'];
      action: CanvasContextMenuEdgeAction;
    }>;

export type CanvasContextMenuViewSection = Readonly<{
  id: 'add' | 'canvas' | 'edge';
  title?: 'Canvas';
  items: readonly CanvasContextMenuViewItem[];
}>;

function canvasActionItem(action: CanvasContextMenuCanvasAction): CanvasContextMenuViewItem {
  return {
    id: `canvas:${action.action}`,
    kind: 'canvas',
    label: action.label,
    action,
  };
}

function createNodeActionItem(
  action: CanvasContextMenuCreateNodeAction
): CanvasContextMenuViewItem {
  return {
    id: `create-node:${action.registration.kind}`,
    kind: 'create-node',
    label: action.label,
    action,
  };
}

function edgeActionItem(action: CanvasContextMenuEdgeAction): CanvasContextMenuViewItem {
  return {
    id: `edge:${action.action}`,
    kind: 'edge',
    label: action.label,
    action,
  };
}

export function buildCanvasContextMenuSections(
  model: CanvasContextMenuModel
): readonly CanvasContextMenuViewSection[] {
  const addItems = [
    ...model.canvasActions.filter(
      (action) =>
        action.action === 'open-add-node-catalog' || action.action === 'open-source-import'
    ),
    ...model.createNodeActions,
  ].map((action) =>
    action.action === 'create-node' ? createNodeActionItem(action) : canvasActionItem(action)
  );
  const canvasItems = model.canvasActions
    .filter((action) => action.action !== 'open-add-node-catalog')
    .filter((action) => action.action !== 'open-source-import')
    .map(canvasActionItem);
  const edgeItems = model.edgeActions.map(edgeActionItem);
  const sections: CanvasContextMenuViewSection[] = [];

  if (addItems.length > 0) {
    sections.push({ id: 'add', items: addItems });
  }

  if (canvasItems.length > 0) {
    sections.push({ id: 'canvas', title: 'Canvas', items: canvasItems });
  }

  if (edgeItems.length > 0) {
    sections.push({ id: 'edge', items: edgeItems });
  }

  return sections;
}
