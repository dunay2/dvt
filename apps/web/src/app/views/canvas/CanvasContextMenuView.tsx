/** Owned concern: render the Canvas contextual surfaces without owning interaction decisions. */
import type { ReactElement, RefObject } from 'react';

import { usePointerGraceDismiss } from '../../components/transientSurface/usePointerGraceDismiss';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  localizeCanvasContextMenuModel,
  type CanvasContextMenuCanvasAction,
  type CanvasContextMenuCatalogAction,
  type CanvasContextMenuCreateNodeAction,
  type CanvasContextMenuEdgeAction,
  type CanvasContextMenuModel,
} from './canvasInteractionCommandSurface';
import { buildCanvasAddNodeCatalogItems } from './canvasAddNodeCatalogModel';
import { CanvasAddNodeCatalogView } from './CanvasAddNodeCatalogView';
import { resolveCanvasViewCopy } from './copy';
import {
  buildCanvasContextMenuSections,
  type CanvasContextMenuViewItem,
} from './canvasContextMenuViewModel';

type CanvasContextMenuViewProps = Readonly<{
  children: ReactElement;
  model: CanvasContextMenuModel | null;
  keyboardMenuOpen?: boolean;
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
  keyboardMenuOpen = false,
  menuRef,
  ariaLabel,
  onClose,
  onCatalogClose,
  onCanvasAction,
  onCreateNodeAction,
  onEdgeAction,
}: CanvasContextMenuViewProps): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const localizedModel = model == null ? null : localizeCanvasContextMenuModel(model, copy);
  const commandSurfaceOpen =
    localizedModel != null && localizedModel.surface !== 'add-node-catalog';
  const pointerGraceProps = usePointerGraceDismiss({
    enabled: commandSurfaceOpen && !keyboardMenuOpen,
    onDismiss: onClose,
  });
  const commandSections = commandSurfaceOpen
    ? buildCanvasContextMenuSections(localizedModel, copy)
    : [];
  const catalogItems =
    localizedModel?.surface === 'add-node-catalog'
      ? buildCanvasAddNodeCatalogItems({ actions: localizedModel.catalogActions, copy })
      : [];
  const CommandMenuGroup = keyboardMenuOpen ? DropdownMenuGroup : ContextMenuGroup;
  const CommandMenuItem = keyboardMenuOpen ? DropdownMenuItem : ContextMenuItem;
  const CommandMenuLabel = keyboardMenuOpen ? DropdownMenuLabel : ContextMenuLabel;
  const commandMenuContents = (
    <div ref={menuRef} data-slot="canvas-context-menu">
      {commandSections.map((section) => (
        <CommandMenuGroup key={section.id} data-slot={`canvas-context-menu-${section.id}-group`}>
          {section.title == null ? null : <CommandMenuLabel>{section.title}</CommandMenuLabel>}
          {section.items.map((item) => (
            <CommandMenuItem
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
            </CommandMenuItem>
          ))}
        </CommandMenuGroup>
      ))}
    </div>
  );

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

        {commandSurfaceOpen && !keyboardMenuOpen ? (
          <ContextMenuContent
            aria-label={ariaLabel ?? copy.canvasContextMenuLabel}
            className="w-72 max-w-[calc(100vw-1.5rem)]"
            onCloseAutoFocus={(event) => event.preventDefault()}
            {...pointerGraceProps}
          >
            {commandMenuContents}
          </ContextMenuContent>
        ) : null}
      </ContextMenu>

      <DropdownMenu
        open={keyboardMenuOpen && commandSurfaceOpen}
        onOpenChange={(open) => {
          if (!open && keyboardMenuOpen) {
            onClose();
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: localizedModel?.screenPosition.x ?? 0,
              top: localizedModel?.screenPosition.y ?? 0,
              width: 1,
              height: 1,
              pointerEvents: 'none',
            }}
          />
        </DropdownMenuTrigger>
        {commandSurfaceOpen && keyboardMenuOpen ? (
          <DropdownMenuContent
            aria-label={ariaLabel ?? copy.canvasContextMenuLabel}
            align="start"
            sideOffset={0}
            className="w-72 max-w-[calc(100vw-1.5rem)]"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {commandMenuContents}
          </DropdownMenuContent>
        ) : null}
      </DropdownMenu>

      <Dialog
        open={localizedModel?.surface === 'add-node-catalog'}
        onOpenChange={(open) => {
          if (!open && localizedModel?.surface === 'add-node-catalog') {
            onCatalogClose();
          }
        }}
      >
        {localizedModel?.surface === 'add-node-catalog' ? (
          <DialogContent
            ref={menuRef}
            aria-modal="true"
            closeLabel={copy.canvasAddNodeCatalogCloseLabel}
            className="grid max-h-[calc(100vh-2rem)] w-[42rem] max-w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-(--surface-panel) p-5 sm:max-w-[42rem]"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{copy.canvasAddNodeCatalogTitle}</DialogTitle>
              <DialogDescription>{copy.canvasAddNodeCatalogDescription}</DialogDescription>
            </DialogHeader>
            <CanvasAddNodeCatalogView
              items={catalogItems}
              onSelectItem={(item) => {
                const action = localizedModel.catalogActions.find((candidate) => {
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
