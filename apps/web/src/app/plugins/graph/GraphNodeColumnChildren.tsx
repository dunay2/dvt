/** Owned concern: render and reorder nested field members inside one structured column piece. */
import { GripVertical } from 'lucide-react';
import { useState, type DragEvent, type KeyboardEvent, type ReactElement } from 'react';

import {
  buildCanvasColumnContextMenuModel,
  type CanvasColumnContextMenuAction,
} from '../../components/canvas/canvasNodeContextMenuModel';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { GraphNodeColumn, GraphNodeColumnReorderIdentity } from './graphNodeColumnContracts';
import { resolveGraphNodeStructuredFieldCopy } from './graphNodeStructuredFieldCopy';

export function GraphNodeColumnChildren(props: {
  nodeId?: string;
  parentColumnId?: string;
  children: readonly GraphNodeColumn[];
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
}): ReactElement {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeStructuredFieldCopy(language);
  const [dropTarget, setDropTarget] = useState<Readonly<{
    fieldId: string;
    placement: 'before' | 'after';
  }> | null>(null);
  const canReorder =
    props.nodeId != null && props.parentColumnId != null && props.onColumnReorder != null;
  const reorder = (fieldId: string, targetFieldId: string, placement: 'before' | 'after') => {
    if (!canReorder || fieldId === targetFieldId) return;
    props.onColumnReorder?.({
      nodeId: props.nodeId!,
      parentColumnId: props.parentColumnId!,
      columnId: fieldId,
      targetColumnId: targetFieldId,
      placement,
    });
  };

  return (
    <div
      data-slot="graph-node-column-children"
      className="ml-2 basis-full space-y-1 border-l border-blue-500/40 pl-2"
    >
      {props.children.map((child, index) => {
        const previous = props.children[index - 1];
        const next = props.children[index + 1];
        const menuModel =
          props.nodeId == null || props.parentColumnId == null || child.id == null
            ? null
            : buildCanvasColumnContextMenuModel({
                target: {
                  kind: 'column',
                  nodeId: props.nodeId,
                  columnId: child.id,
                  columnName: child.name,
                  parentColumnId: props.parentColumnId,
                },
                label: copy.childActions.replace('{column}', child.name),
                move: {
                  upLabel: copy.moveUp,
                  downLabel: copy.moveDown,
                  canMoveUp: canReorder && previous?.id != null,
                  canMoveDown: canReorder && next?.id != null,
                },
                unavailableLabel: copy.unavailable,
              });
        const openOwnMenu = (event: KeyboardEvent<HTMLDivElement>) => {
          if (
            menuModel == null ||
            !((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu')
          ) {
            return false;
          }
          event.preventDefault();
          event.stopPropagation();
          const target = event.currentTarget;
          const bounds = target.getBoundingClientRect();
          target.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              button: 2,
              clientX: bounds.left + 8,
              clientY: bounds.top + 8,
            })
          );
          return true;
        };
        const selectAction = (action: CanvasColumnContextMenuAction) => {
          if (action.disabled || child.id == null) return;
          if (action.id === 'move-field-up' && previous?.id != null) {
            reorder(child.id, previous.id, 'before');
          }
          if (action.id === 'move-field-down' && next?.id != null) {
            reorder(child.id, next.id, 'after');
          }
        };
        const childContent = (
          <div
            key={child.id ?? child.name}
            data-slot="graph-node-nested-column"
            data-field-id={child.id}
            data-parent-field-id={props.parentColumnId}
            data-drop-placement={
              dropTarget != null && dropTarget.fieldId === child.id
                ? dropTarget.placement
                : undefined
            }
            draggable={canReorder && child.id != null}
            tabIndex={0}
            className="relative flex min-w-0 items-center gap-1 rounded px-1 text-[11px] data-[drop-placement=after]:border-b-2 data-[drop-placement=before]:border-t-2 data-[drop-placement]:border-blue-400"
            onContextMenu={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              if (child.id == null) return;
              event.stopPropagation();
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('application/x-dvt-nested-field', child.id);
            }}
            onDragOver={(event) => {
              if (!canReorder || child.id == null) return;
              const fieldId = event.dataTransfer.getData('application/x-dvt-nested-field');
              if (fieldId.length === 0 || fieldId === child.id) return;
              event.preventDefault();
              event.stopPropagation();
              const bounds = event.currentTarget.getBoundingClientRect();
              setDropTarget({
                fieldId: child.id,
                placement: event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after',
              });
            }}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              if (child.id == null || dropTarget?.fieldId !== child.id) return;
              event.preventDefault();
              event.stopPropagation();
              reorder(
                event.dataTransfer.getData('application/x-dvt-nested-field'),
                child.id,
                dropTarget.placement
              );
              setDropTarget(null);
            }}
            onKeyDown={(event) => {
              if (openOwnMenu(event)) return;
              if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
              const target = event.key === 'ArrowUp' ? previous : next;
              if (child.id == null || target?.id == null) return;
              event.preventDefault();
              event.stopPropagation();
              reorder(child.id, target.id, event.key === 'ArrowUp' ? 'before' : 'after');
            }}
          >
            {canReorder ? (
              <GripVertical
                data-slot="graph-node-nested-column-drag-handle"
                aria-hidden="true"
                className="size-3 shrink-0 text-slate-500"
              />
            ) : null}
            <span className="truncate font-mono text-slate-200">{child.name}</span>
            <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
              {child.type}
            </span>
            {child.children == null ? null : (
              <GraphNodeColumnChildren
                nodeId={props.nodeId}
                parentColumnId={child.id}
                children={child.children}
                onColumnReorder={props.onColumnReorder}
              />
            )}
          </div>
        );

        if (menuModel == null) return childContent;
        return (
          <ContextMenu key={child.id ?? child.name}>
            <ContextMenuTrigger asChild>{childContent}</ContextMenuTrigger>
            <ContextMenuContent data-slot="graph-node-nested-column-menu">
              <ContextMenuLabel>{menuModel.label}</ContextMenuLabel>
              {menuModel.actions.map((action) => (
                <ContextMenuItem
                  key={action.id}
                  data-slot={
                    action.id === 'move-field-up'
                      ? 'nested-column-move-up'
                      : action.id === 'move-field-down'
                        ? 'nested-column-move-down'
                        : undefined
                  }
                  disabled={action.disabled}
                  onSelect={() => selectAction(action)}
                >
                  {action.label}
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
