/** Owned concern: project Canvas context-menu models into presentation sections. */
import type {
  CanvasContextMenuCanvasAction,
  CanvasContextMenuCatalogAction,
  CanvasContextMenuCreateNodeAction,
  CanvasContextMenuEdgeAction,
  CanvasContextMenuModel,
} from './canvasInteractionCommandSurface';
import { canvasViewCopy, type CanvasViewCopy } from './copy';

export type CanvasContextMenuViewItem =
  | Readonly<{
      id: string;
      kind: 'canvas';
      label: CanvasContextMenuCanvasAction['label'];
      action: CanvasContextMenuCanvasAction;
    }>
  | Readonly<{
      id: string;
      kind: 'catalog';
      label: string;
      action: CanvasContextMenuCatalogAction;
    }>
  | Readonly<{
      id: string;
      kind: 'edge';
      label: CanvasContextMenuEdgeAction['label'];
      action: CanvasContextMenuEdgeAction;
    }>;

export type CanvasContextMenuViewSection = Readonly<{
  id: 'add' | 'canvas' | 'edge';
  title?: string;
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

function catalogActionItem(action: CanvasContextMenuCatalogAction): CanvasContextMenuViewItem {
  return {
    id: `${action.action}:${action.registration.kind}`,
    kind: 'catalog',
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
  model: CanvasContextMenuModel,
  copy: CanvasViewCopy = canvasViewCopy
): readonly CanvasContextMenuViewSection[] {
  const addItems = [
    ...model.canvasActions.filter(
      (action) =>
        action.action === 'open-add-node-catalog' || action.action === 'open-source-import'
    ),
    ...model.catalogActions,
  ].map((action) =>
    'registration' in action ? catalogActionItem(action) : canvasActionItem(action)
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
    sections.push({
      id: 'canvas',
      title: copy.canvasContextMenuCanvasGroupLabel,
      items: canvasItems,
    });
  }

  if (edgeItems.length > 0) {
    sections.push({ id: 'edge', items: edgeItems });
  }

  return sections;
}
