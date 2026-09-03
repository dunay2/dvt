/** Owned concern: stage the visible order of active and inactive graph-node fields. */
import { useEffect, useMemo, useState } from 'react';

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
  return column.name;
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
  const currentIdsKey = currentIds.join('\u0000');
  const columnsById = useMemo(
    () => new Map(columns.map((column) => [columnOrderKey(column), column] as const)),
    [columns]
  );
  const [orderedIds, setOrderedIds] = useState(currentIds);

  useEffect(() => {
    setOrderedIds((existing) => {
      const schemaChanged =
        existing.some((id) => !columnsById.has(id)) &&
        currentIds.some((id) => !existing.includes(id));
      return schemaChanged
        ? currentIds
        : [
            ...existing.filter((id) => columnsById.has(id)),
            ...currentIds.filter((id) => !existing.includes(id)),
          ];
    });
  }, [columnsById, currentIdsKey]);

  const orderedColumns = orderedIds.flatMap((id) => {
    const column = columnsById.get(id);
    return column == null ? [] : [column];
  });

  return {
    orderedColumns,
    orderedColumnIds: orderedIds,
    moveColumn(
      movedId: string,
      targetId: string,
      placement: ActiveColumnPlacement['placement']
    ): ActiveColumnPlacement | undefined {
      const next = reorderIds(orderedIds, movedId, targetId, placement);
      setOrderedIds(next);
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
