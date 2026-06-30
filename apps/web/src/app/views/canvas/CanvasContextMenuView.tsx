/** Owned concern: render the Canvas context menu template without owning interaction decisions. */
import type { CSSProperties, RefObject } from 'react';

import type {
  CanvasContextMenuCanvasAction,
  CanvasContextMenuCatalogAction,
  CanvasContextMenuCreateNodeAction,
  CanvasContextMenuEdgeAction,
  CanvasContextMenuModel,
} from './canvasInteractionCommandSurface';
import { buildCanvasAddNodeCatalogItems } from './canvasAddNodeCatalogModel';
import { CanvasAddNodeCatalogView } from './CanvasAddNodeCatalogView';
import {
  CanvasContextMenuItem,
  CanvasContextMenuSection,
  CanvasContextMenuSurface,
} from './CanvasContextMenuPrimitives';
import {
  buildCanvasContextMenuSections,
  type CanvasContextMenuViewItem,
} from './canvasContextMenuViewModel';

type CanvasContextMenuViewProps = Readonly<{
  model: CanvasContextMenuModel | null;
  menuRef: RefObject<HTMLDivElement>;
  onCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  onCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
  onEdgeAction: (action: CanvasContextMenuEdgeAction) => void;
}>;

export function CanvasContextMenuView({
  model,
  menuRef,
  onCanvasAction,
  onCreateNodeAction,
  onEdgeAction,
}: CanvasContextMenuViewProps): JSX.Element | null {
  if (model == null) {
    return null;
  }

  const menuStyle: CSSProperties = {
    left: model.screenPosition.x,
    top: model.screenPosition.y,
  };
  const sections =
    model.surface === 'add-node-catalog'
      ? buildCanvasContextMenuSections(model)
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.kind === 'canvas'),
          }))
          .filter((section) => section.items.length > 0)
      : buildCanvasContextMenuSections(model);
  const catalogItems =
    model.surface === 'add-node-catalog'
      ? buildCanvasAddNodeCatalogItems({
          actions: model.catalogActions,
        })
      : [];

  return (
    <CanvasContextMenuSurface menuRef={menuRef} style={menuStyle}>
      {model.surface === 'add-node-catalog' ? (
        <CanvasAddNodeCatalogView
          items={catalogItems}
          onSelectItem={(item) => {
            const action = model.catalogActions.find((candidate) => {
              const candidateId = `${candidate.action}:${candidate.registration.kind}`;
              return candidateId === item.actionId;
            });
            if (action) {
              selectCanvasCatalogAction({
                action,
                onCanvasAction,
                onCreateNodeAction,
              });
            }
          }}
        />
      ) : null}
      {sections.map((section) => (
        <CanvasContextMenuSection
          key={section.id}
          dataSlot={`canvas-context-menu-${section.id}-group`}
          title={section.title}
        >
          {section.items.map((item) => (
            <CanvasContextMenuItem
              key={item.id}
              label={item.label}
              onSelect={() =>
                selectCanvasContextMenuItem({
                  item,
                  onCanvasAction,
                  onCreateNodeAction,
                  onEdgeAction,
                })
              }
            />
          ))}
        </CanvasContextMenuSection>
      ))}
    </CanvasContextMenuSurface>
  );
}

function selectCanvasCatalogAction({
  action,
  onCanvasAction,
  onCreateNodeAction,
}: Readonly<{
  action: CanvasContextMenuCatalogAction;
  onCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  onCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
}>): void {
  if (action.action === 'create-node') {
    onCreateNodeAction(action);
    return;
  }

  onCanvasAction({ action: action.action, label: action.label });
}

function selectCanvasContextMenuItem({
  item,
  onCanvasAction,
  onCreateNodeAction,
  onEdgeAction,
}: Readonly<{
  item: CanvasContextMenuViewItem;
  onCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  onCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
  onEdgeAction: (action: CanvasContextMenuEdgeAction) => void;
}>): void {
  if (item.kind === 'canvas') {
    onCanvasAction(item.action);
    return;
  }

  if (item.kind === 'catalog') {
    selectCanvasCatalogAction({
      action: item.action,
      onCanvasAction,
      onCreateNodeAction,
    });
    return;
  }

  onEdgeAction(item.action);
}
