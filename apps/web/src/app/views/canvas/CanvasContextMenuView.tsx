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
  const addCanvasActions = model.canvasActions.filter(
    (action) => action.action === 'open-source-import'
  );
  const canvasCommandActions = model.canvasActions.filter(
    (action) => action.action !== 'open-source-import'
  );
  const shouldShowAddGroup = addCanvasActions.length > 0 || model.createNodeActions.length > 0;

  return (
    <CanvasContextMenuSurface menuRef={menuRef} style={menuStyle}>
      {shouldShowAddGroup ? (
        <CanvasContextMenuSection dataSlot="canvas-context-menu-add-group" title="Add">
          {addCanvasActions.map((action) => (
            <CanvasContextMenuItem
              key={action.action}
              label={action.label}
              onSelect={() => onCanvasAction(action)}
            />
          ))}
          {model.createNodeActions.map((action) => (
            <CanvasContextMenuItem
              key={action.registration.kind}
              label={action.label}
              onSelect={() => onCreateNodeAction(action)}
            />
          ))}
        </CanvasContextMenuSection>
      ) : null}

      {canvasCommandActions.length > 0 ? (
        <CanvasContextMenuSection dataSlot="canvas-context-menu-canvas-group" title="Canvas">
          {canvasCommandActions.map((action) => (
            <CanvasContextMenuItem
              key={action.action}
              label={action.label}
              onSelect={() => onCanvasAction(action)}
            />
          ))}
        </CanvasContextMenuSection>
      ) : null}

      {model.edgeActions.map((action) => (
        <CanvasContextMenuItem
          key={action.action}
          label={action.label}
          onSelect={() => onEdgeAction(action)}
        />
      ))}
    </CanvasContextMenuSurface>
  );
}
