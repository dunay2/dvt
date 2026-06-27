/** Owned concern: render the Canvas context menu template without owning interaction decisions. */
import type { CSSProperties, RefObject } from 'react';

import type {
  CanvasContextMenuCanvasAction,
  CanvasContextMenuCreateNodeAction,
  CanvasContextMenuEdgeAction,
  CanvasContextMenuModel,
} from './canvasInteractionCommandSurface';
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
  const sections = buildCanvasContextMenuSections(model);

  return (
    <CanvasContextMenuSurface menuRef={menuRef} style={menuStyle}>
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
