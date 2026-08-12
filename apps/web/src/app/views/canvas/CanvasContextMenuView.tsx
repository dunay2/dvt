/** Owned concern: render the Canvas contextual surfaces without owning interaction decisions. */
import type { CSSProperties, ReactElement, RefObject } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import type {
  CanvasContextMenuCanvasAction,
  CanvasContextMenuCatalogAction,
  CanvasContextMenuCreateNodeAction,
  CanvasContextMenuEdgeAction,
  CanvasContextMenuModel,
  CanvasContextMenuPosition,
} from './canvasInteractionCommandSurface';
import { buildCanvasAddNodeCatalogItems } from './canvasAddNodeCatalogModel';
import { CanvasAddNodeCatalogView } from './CanvasAddNodeCatalogView';
import { canvasViewCopy } from './copy';
import { CanvasContextMenuSurface } from './CanvasContextMenuPrimitives';
import {
  buildCanvasContextMenuSections,
  type CanvasContextMenuViewItem,
} from './canvasContextMenuViewModel';

type CanvasContextMenuViewProps = Readonly<{
  children: ReactElement;
  model: CanvasContextMenuModel | null;
  menuRef: RefObject<HTMLDivElement>;
  ariaLabel?: string;
  onClose: () => void;
  onCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  onCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
  onEdgeAction: (action: CanvasContextMenuEdgeAction) => void;
}>;

const CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX = 12;
const CANVAS_CONTEXT_MENU_SURFACE_WIDTH_PX = 288;
const CANVAS_CONTEXT_MENU_MIN_VISIBLE_HEIGHT_PX = 160;

type CanvasContextMenuViewport = Readonly<{
  width: number;
  height: number;
}>;

function resolveBrowserViewport(): CanvasContextMenuViewport {
  if (typeof window === 'undefined') {
    return {
      width: CANVAS_CONTEXT_MENU_SURFACE_WIDTH_PX + CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX * 2,
      height:
        CANVAS_CONTEXT_MENU_MIN_VISIBLE_HEIGHT_PX + CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX * 2,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function resolveCanvasContextMenuSurfaceStyle(
  screenPosition: CanvasContextMenuPosition,
  viewport: CanvasContextMenuViewport = resolveBrowserViewport()
): CSSProperties {
  const maxLeft =
    viewport.width - CANVAS_CONTEXT_MENU_SURFACE_WIDTH_PX - CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX;
  const maxTop =
    viewport.height -
    CANVAS_CONTEXT_MENU_MIN_VISIBLE_HEIGHT_PX -
    CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX;
  const left = Math.max(
    CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX,
    Math.min(screenPosition.x, maxLeft)
  );
  const top = Math.max(CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX, Math.min(screenPosition.y, maxTop));

  return {
    left,
    top,
    maxHeight: `calc(100vh - ${top + CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX}px)`,
  };
}

export function CanvasContextMenuView({
  children,
  model,
  menuRef,
  ariaLabel = canvasViewCopy.canvasContextMenuLabel,
  onClose,
  onCanvasAction,
  onCreateNodeAction,
  onEdgeAction,
}: CanvasContextMenuViewProps): JSX.Element {
  const commandSurfaceOpen = model != null && model.surface !== 'add-node-catalog';
  const commandSections = commandSurfaceOpen ? buildCanvasContextMenuSections(model) : [];
  const catalogItems =
    model?.surface === 'add-node-catalog'
      ? buildCanvasAddNodeCatalogItems({ actions: model.catalogActions })
      : [];

  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      >
        <ContextMenuTrigger asChild>
          <div data-slot="canvas-context-menu-trigger" className="h-full w-full">
            {children}
          </div>
        </ContextMenuTrigger>

        {commandSurfaceOpen ? (
          <ContextMenuContent
            aria-label={ariaLabel}
            className="w-72 max-w-[calc(100vw-1.5rem)]"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <div ref={menuRef} data-slot="canvas-context-menu">
              {commandSections.map((section) => (
                <ContextMenuGroup
                  key={section.id}
                  data-slot={`canvas-context-menu-${section.id}-group`}
                >
                  {section.title == null ? null : (
                    <ContextMenuLabel>{section.title}</ContextMenuLabel>
                  )}
                  {section.items.map((item) => (
                    <ContextMenuItem
                      key={item.id}
                      data-slot="canvas-context-menu-item"
                      data-menu-item-kind={item.kind}
                      data-menu-action={item.action.action}
                      onSelect={() => {
                        selectCanvasContextMenuItem({
                          item,
                          onCanvasAction,
                          onCreateNodeAction,
                          onEdgeAction,
                        });
                      }}
                    >
                      {item.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuGroup>
              ))}
            </div>
          </ContextMenuContent>
        ) : null}
      </ContextMenu>

      {model?.surface === 'add-node-catalog' ? (
        <CanvasContextMenuSurface
          ariaLabel={ariaLabel}
          menuRef={menuRef}
          style={resolveCanvasContextMenuSurfaceStyle(model.screenPosition)}
        >
          <CanvasAddNodeCatalogView
            items={catalogItems}
            onSelectItem={(item) => {
              const action = model.catalogActions.find((candidate) => {
                const candidateId = `${candidate.action}:${candidate.registration.kind}`;
                return candidateId === item.actionId;
              });
              if (action) {
                selectCanvasCatalogAction({ action, onCanvasAction, onCreateNodeAction });
              }
            }}
          />
        </CanvasContextMenuSurface>
      ) : null}
    </>
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
    selectCanvasCatalogAction({ action: item.action, onCanvasAction, onCreateNodeAction });
    return;
  }

  onEdgeAction(item.action);
}
