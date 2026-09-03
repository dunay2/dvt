/** Owned concern: coordinate graph-node column section interaction state. */
import { useEffect, useState } from 'react';

import type { GraphNodeColumn, GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import { useGraphNodeColumnReorder } from './useGraphNodeColumnReorder';

export function useGraphNodeColumnSectionState(props: GraphNodeColumnSectionProps) {
  const maxPreviewColumns = 5;
  const [columnsExpanded, setColumnsExpanded] = useState(props.expanded ?? false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [compositionRequest, setCompositionRequest] = useState<Readonly<{
    sourceColumn: GraphNodeColumn;
    targetColumn: GraphNodeColumn;
  }> | null>(null);
  const portDirectionKey = props.portDirections?.join(':') ?? '';
  const columnReorder = useGraphNodeColumnReorder({
    columns: props.columns,
    nodeId: props.nodeId,
    onColumnReorder: props.canReorderTopLevelColumns === false ? undefined : props.onColumnReorder,
    onColumnComposeRequest:
      props.onColumnFunctionApply == null && props.onStructuredFieldApply == null
        ? undefined
        : setCompositionRequest,
  });
  const visibleColumns = showAllColumns
    ? columnReorder.orderedColumns
    : columnReorder.orderedColumns.slice(0, maxPreviewColumns);
  const remainingColumnCount = Math.max(props.columns.length - maxPreviewColumns, 0);

  useEffect(() => {
    props.onColumnLayoutChange?.();
  }, [
    columnsExpanded,
    portDirectionKey,
    props.onColumnLayoutChange,
    showAllColumns,
    visibleColumns.length,
  ]);

  useEffect(() => {
    if (props.expanded != null) setColumnsExpanded(props.expanded);
  }, [props.expanded]);

  return {
    columnsExpanded,
    showAllColumns,
    compositionRequest,
    columnReorder,
    visibleColumns,
    remainingColumnCount,
    dismissComposition: () => setCompositionRequest(null),
    toggleAllColumns: () => setShowAllColumns((current) => !current),
    toggleDisclosure: () => {
      const next = !columnsExpanded;
      setColumnsExpanded(next);
      if (!next) setShowAllColumns(false);
      props.onDisclosureChange?.(next);
    },
  };
}
