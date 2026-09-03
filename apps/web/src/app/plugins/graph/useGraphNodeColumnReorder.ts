/** Owned concern: coordinate pointer and keyboard reordering for graph-node columns. */
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';

import type { GraphNodeColumn, GraphNodeColumnReorderIdentity } from './graphNodeColumnContracts';
import { useGraphNodeColumnOrder } from './useGraphNodeColumnOrder';

type DropTarget = Readonly<{
  columnId: string;
  placement: 'before' | 'compose' | 'after';
}>;

export function useGraphNodeColumnReorder(args: {
  columns: readonly GraphNodeColumn[];
  nodeId?: string;
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
  onColumnComposeRequest?: (
    request: Readonly<{
      sourceColumn: GraphNodeColumn;
      targetColumn: GraphNodeColumn;
    }> | null
  ) => void;
}) {
  const columnOrder = useGraphNodeColumnOrder(args.columns);
  const draggedColumnIdRef = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const reorderableColumnIds = columnOrder.orderedColumns.flatMap((column) =>
    column.id == null ? [] : [column.name]
  );
  const canReorder = (column: GraphNodeColumn): boolean =>
    column.id != null && args.nodeId != null && args.onColumnReorder != null;

  return {
    orderedColumns: columnOrder.orderedColumns,
    resolveActivationPlacement: columnOrder.resolveActivationPlacement,
    canReorder,
    dropPlacement(column: GraphNodeColumn): DropTarget['placement'] | undefined {
      return dropTarget?.columnId === (column.id ?? column.name) ? dropTarget.placement : undefined;
    },
    startDrag(column: GraphNodeColumn, event: DragEvent<HTMLElement>): void {
      if (!canReorder(column)) return;
      event.stopPropagation();
      args.onColumnComposeRequest?.(null);
      draggedColumnIdRef.current = column.name;
      event.dataTransfer.effectAllowed = 'linkMove';
      event.dataTransfer.setData('text/plain', column.name);
    },
    endDrag(): void {
      draggedColumnIdRef.current = null;
      setDropTarget(null);
    },
    dragOver(column: GraphNodeColumn, event: DragEvent<HTMLElement>): void {
      const draggedColumnId = draggedColumnIdRef.current;
      if (!canReorder(column) || draggedColumnId == null || draggedColumnId === column.name) return;
      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      const draggedColumn = columnOrder.orderedColumns.find(
        (candidate) => candidate.name === draggedColumnId
      );
      const offset = event.clientY - bounds.top;
      const canCompose = draggedColumn?.id != null && args.onColumnComposeRequest != null;
      const placement =
        canCompose && offset >= bounds.height / 3 && offset <= (bounds.height * 2) / 3
          ? 'compose'
          : offset < bounds.height / 2
            ? 'before'
            : 'after';
      event.dataTransfer.dropEffect = placement === 'compose' ? 'link' : 'move';
      setDropTarget({
        columnId: column.id ?? column.name,
        placement,
      });
    },
    dragLeave(event: DragEvent<HTMLElement>): void {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
    },
    drop(column: GraphNodeColumn, event: DragEvent<HTMLElement>): void {
      const draggedColumnId = draggedColumnIdRef.current;
      if (
        !canReorder(column) ||
        args.nodeId == null ||
        draggedColumnId == null ||
        draggedColumnId === column.name
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const placement =
        dropTarget?.columnId === (column.id ?? column.name) ? dropTarget.placement : null;
      if (placement === 'compose') {
        const sourceColumn = columnOrder.orderedColumns.find(
          (candidate) => candidate.name === draggedColumnId
        );
        if (sourceColumn?.id != null) {
          args.onColumnComposeRequest?.({ sourceColumn, targetColumn: column });
        }
      } else if (placement != null) {
        const activePlacement = columnOrder.moveColumn(draggedColumnId, column.name, placement);
        if (activePlacement != null) {
          const draggedColumn = columnOrder.orderedColumns.find(
            (candidate) => candidate.name === draggedColumnId
          );
          args.onColumnReorder?.({
            nodeId: args.nodeId,
            columnId: draggedColumn?.id ?? draggedColumnId,
            ...activePlacement,
          });
        }
      }
      draggedColumnIdRef.current = null;
      setDropTarget(null);
    },
    composeWithKeyboard(column: GraphNodeColumn, event: KeyboardEvent<HTMLElement>): boolean {
      if (
        !canReorder(column) ||
        args.onColumnComposeRequest == null ||
        !event.altKey ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      ) {
        return false;
      }
      const sourceIndex = columnOrder.orderedColumns.findIndex(
        (candidate) => candidate.name === column.name
      );
      const target = columnOrder.orderedColumns[sourceIndex + (event.key === 'ArrowLeft' ? -1 : 1)];
      event.preventDefault();
      event.stopPropagation();
      if (target?.id != null)
        args.onColumnComposeRequest({ sourceColumn: column, targetColumn: target });
      return true;
    },
    moveWithKeyboard(column: GraphNodeColumn, event: KeyboardEvent<HTMLElement>): boolean {
      if (
        !canReorder(column) ||
        !event.altKey ||
        (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
      ) {
        return false;
      }
      const sourceIndex = reorderableColumnIds.indexOf(column.name);
      const targetIndex = sourceIndex + (event.key === 'ArrowUp' ? -1 : 1);
      const targetColumnId = reorderableColumnIds[targetIndex];
      if (targetColumnId != null) {
        event.preventDefault();
        event.stopPropagation();
        const activePlacement = columnOrder.moveColumn(
          column.name,
          targetColumnId,
          event.key === 'ArrowUp' ? 'before' : 'after'
        );
        if (activePlacement != null && args.nodeId != null) {
          args.onColumnReorder?.({
            nodeId: args.nodeId,
            columnId: column.id ?? column.name,
            ...activePlacement,
          });
        }
      }
      return true;
    },
  };
}

export type GraphNodeColumnReorderController = ReturnType<typeof useGraphNodeColumnReorder>;
