/** Owned concern: stage the visible order of active and inactive graph-node fields. */
import { useMemo, useState } from 'react';

type OrderableColumn = Readonly<{
  id?: string;
  name: string;
  output?: boolean;
}>;

export type ActiveColumnPlacement = Readonly<{
  targetColumnId: string;
  placement: 'before' | 'after';
}>;

function columnOrderKey(column: OrderableColumn): string {
  return column.id ?? column.name;
}

function columnCommandId(column: OrderableColumn): string {
  return column.id ?? column.name;
}

function reorderIds(
  orderedIds: readonly string[],
  movedId: string,
  targetId: string,
  placement: ActiveColumnPlacement['placement']
): string[] {
  if (movedId === targetId || !orderedIds.includes(movedId) || !orderedIds.includes(targetId)) {
    return [...orderedIds];
  }
  const next = orderedIds.filter((id) => id !== movedId);
  const targetIndex = next.indexOf(targetId);
  next.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, movedId);
  return next;
}

function resolveActivePlacement(
  orderedIds: readonly string[],
  movedId: string,
  columnsById: ReadonlyMap<string, OrderableColumn>
): ActiveColumnPlacement | undefined {
  const movedIndex = orderedIds.indexOf(movedId);
  if (movedIndex < 0) return undefined;
  const nextActiveKey = orderedIds
    .slice(movedIndex + 1)
    .find((id) => columnsById.get(id)?.output !== false);
  if (nextActiveKey != null) {
    return {
      targetColumnId: columnCommandId(columnsById.get(nextActiveKey)!),
      placement: 'before',
    };
  }
  const previousActiveKey = orderedIds
    .slice(0, movedIndex)
    .reverse()
    .find((id) => columnsById.get(id)?.output !== false);
  return previousActiveKey == null
    ? undefined
    : {
        targetColumnId: columnCommandId(columnsById.get(previousActiveKey)!),
        placement: 'after',
      };
}

export function useGraphNodeColumnOrder<TColumn extends OrderableColumn>(
  columns: readonly TColumn[]
) {
  const currentIds = columns.map(columnOrderKey);
  const columnsById = useMemo(
    () => new Map(columns.map((column) => [columnOrderKey(column), column] as const)),
    [columns]
  );
  const [order, setOrder] = useState(() => ({
    columnsById,
    orderedIds: currentIds,
    rowKeys: new Map(currentIds.map((id, index) => [id, index])),
    nextRowKey: currentIds.length,
  }));

  // Reconcile before children commit: a passive effect would briefly omit fields
  // whose input/output command identity changed, then remount their controls.
  if (order.columnsById !== columnsById) {
    const previousColumnsById = order.columnsById;
    const rowKeys = new Map<string, number>();
    let nextRowKey = order.nextRowKey;
    const reconciled = (() => {
      const reconciledIds: string[] = [];
      const usedIds = new Set<string>();
      let unmatchedPreviousCount = 0;
      for (const existingId of order.orderedIds) {
        if (columnsById.has(existingId)) {
          reconciledIds.push(existingId);
          usedIds.add(existingId);
          rowKeys.set(existingId, order.rowKeys.get(existingId)!);
          continue;
        }

        const previousName = previousColumnsById.get(existingId)?.name;
        if (previousName == null) {
          unmatchedPreviousCount += 1;
          continue;
        }
        const previousNameCount = [...previousColumnsById.values()].filter(
          (column) => column.name === previousName
        ).length;
        const currentMatches = currentIds.filter(
          (currentId) =>
            !previousColumnsById.has(currentId) && columnsById.get(currentId)?.name === previousName
        );
        if (previousNameCount !== 1 || currentMatches.length !== 1) {
          unmatchedPreviousCount += 1;
          continue;
        }
        const replacementId = currentMatches[0]!;
        if (usedIds.has(replacementId)) {
          unmatchedPreviousCount += 1;
          continue;
        }
        reconciledIds.push(replacementId);
        usedIds.add(replacementId);
        rowKeys.set(replacementId, order.rowKeys.get(existingId)!);
      }
      const unmatchedCurrentIds = currentIds.filter((currentId) => !usedIds.has(currentId));
      for (const id of unmatchedCurrentIds) rowKeys.set(id, nextRowKey++);
      if (unmatchedPreviousCount > 0 && unmatchedCurrentIds.length > 0) {
        return currentIds;
      }
      return [...reconciledIds, ...unmatchedCurrentIds];
    })();
    setOrder({ columnsById, orderedIds: reconciled, rowKeys, nextRowKey });
  }

  const { orderedIds, rowKeys } = order;

  const orderedColumns = orderedIds.flatMap((id) => {
    const column = columnsById.get(id);
    return column == null ? [] : [column];
  });

  return {
    orderedColumns,
    orderedColumnIds: orderedIds,
    rowKey: (column: TColumn): number => rowKeys.get(columnOrderKey(column))!,
    moveColumn(
      movedId: string,
      targetId: string,
      placement: ActiveColumnPlacement['placement']
    ): ActiveColumnPlacement | undefined {
      const next = reorderIds(orderedIds, movedId, targetId, placement);
      setOrder((current) => ({ ...current, orderedIds: next }));
      if (columnsById.get(movedId)?.output === false) return undefined;
      return columnsById.get(targetId)?.output === false
        ? resolveActivePlacement(next, movedId, columnsById)
        : { targetColumnId: columnCommandId(columnsById.get(targetId)!), placement };
    },
    resolveActivationPlacement(id: string): ActiveColumnPlacement | undefined {
      return resolveActivePlacement(orderedIds, id, columnsById);
    },
  };
}
