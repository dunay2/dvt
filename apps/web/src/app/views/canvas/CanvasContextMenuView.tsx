/** Owned concern: render the Canvas context menu template without owning interaction decisions. */
import type { CSSProperties, RefObject } from 'react';

import type {
  CanvasContextMenuCanvasAction,
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
          authoringNodeKinds: model.createNodeActions.map((action) => action.registration),
        })
      : [];

  return (
    <CanvasContextMenuSurface menuRef={menuRef} style={menuStyle}>
      {model.surface === 'add-node-catalog' ? (
        <CanvasAddNodeCatalogView
          items={catalogItems}
          onSelectItem={(item) => {
            const action = model.createNodeActions.find(
              (candidate) => candidate.registration.kind === item.registration.kind
            );
            if (action) {
              onCreateNodeAction(action);
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

  if (item.kind === 'create-node') {
    onCreateNodeAction(item.action);
    return;
  }

  onEdgeAction(item.action);
}
