/** Owned concern: render the Canvas contextual surfaces without owning interaction decisions. */
import type { ReactElement, RefObject } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
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
} from './canvasInteractionCommandSurface';
import { buildCanvasAddNodeCatalogItems } from './canvasAddNodeCatalogModel';
import { CanvasAddNodeCatalogView } from './CanvasAddNodeCatalogView';
import { canvasViewCopy } from './copy';
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
  onCatalogClose: () => void;
  onCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  onCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
  onEdgeAction: (action: CanvasContextMenuEdgeAction) => void;
}>;

export function CanvasContextMenuView({
  children,
  model,
  menuRef,
  ariaLabel = canvasViewCopy.canvasContextMenuLabel,
  onClose,
  onCatalogClose,
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

      <Dialog
        open={model?.surface === 'add-node-catalog'}
        onOpenChange={(open) => {
          if (!open && model?.surface === 'add-node-catalog') {
            onCatalogClose();
          }
        }}
      >
        {model?.surface === 'add-node-catalog' ? (
          <DialogContent
            ref={menuRef}
            aria-modal="true"
            closeLabel={canvasViewCopy.canvasAddNodeCatalogCloseLabel}
            className="grid max-h-[calc(100vh-2rem)] w-[42rem] max-w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-(--surface-panel) p-5 sm:max-w-[42rem]"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{canvasViewCopy.canvasAddNodeCatalogTitle}</DialogTitle>
              <DialogDescription>
                {canvasViewCopy.canvasAddNodeCatalogDescription}
              </DialogDescription>
            </DialogHeader>
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
          </DialogContent>
        ) : null}
      </Dialog>
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
