/** Owned concern: render recorded graph-node columns as a compact disclosure. */
import { ChevronDown, ChevronUp, Table } from 'lucide-react';
import { useEffect, useId, useState, type ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { GraphNodeColumnRow } from './GraphNodeColumnRow';
import { GraphNodeCalculatedColumnForm } from './GraphNodeCalculatedColumnForm';
import { graphNodeColumnClasses } from './graphVisualTokens';
import { useGraphNodeColumnReorder } from './useGraphNodeColumnReorder';

const MAX_PREVIEW_COLUMNS = 5;

export function GraphNodeColumnSection({
  columns,
  expanded,
  nodeId,
  portDirections = [],
  activeColumnHandleId,
  onColumnPortActivate,
  onColumnFunctionApply,
  onStructuredFieldApply,
  onCalculatedColumnAdd,
  onColumnOutputToggle,
  onColumnReorder,
  canReorderTopLevelColumns,
  onDisclosureChange,
  onColumnLayoutChange,
  onAutomap,
}: GraphNodeColumnSectionProps): ReactElement {
  const [columnsExpanded, setColumnsExpanded] = useState(expanded ?? false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [compositionRequest, setCompositionRequest] = useState<Readonly<{
    sourceColumn: (typeof columns)[number];
    targetColumn: (typeof columns)[number];
  }> | null>(null);
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeCardCopy(applicationLanguage);
  const columnListId = useId();
  const portDirectionKey = portDirections.join(':');
  const columnReorder = useGraphNodeColumnReorder({
    columns,
    nodeId,
    onColumnReorder: canReorderTopLevelColumns === false ? undefined : onColumnReorder,
    onColumnComposeRequest:
      onColumnFunctionApply == null && onStructuredFieldApply == null
        ? undefined
        : setCompositionRequest,
  });
  const visibleColumns = showAllColumns
    ? columnReorder.orderedColumns
    : columnReorder.orderedColumns.slice(0, MAX_PREVIEW_COLUMNS);
  const remainingColumnCount = Math.max(columns.length - MAX_PREVIEW_COLUMNS, 0);
  const remainderActionLabel = copy.remainingColumnsLabelTemplate.replace(
    '{count}',
    String(remainingColumnCount)
  );
  const setDisclosure = (expanded: boolean) => {
    setColumnsExpanded(expanded);
    if (!expanded) setShowAllColumns(false);
    onDisclosureChange?.(expanded);
  };

  useEffect(() => {
    onColumnLayoutChange?.();
  }, [
    columnsExpanded,
    onColumnLayoutChange,
    portDirectionKey,
    showAllColumns,
    visibleColumns.length,
  ]);

  useEffect(() => {
    if (expanded != null) setColumnsExpanded(expanded);
  }, [expanded]);

  return (
    <div data-slot="graph-node-column-section" className={graphNodeColumnClasses.shell}>
      <button
        type="button"
        data-slot="graph-node-column-toggle"
        {...canvasNodeEmbeddedControlProps}
        aria-expanded={columnsExpanded}
        aria-controls={columnListId}
        onClick={() => setDisclosure(!columnsExpanded)}
        className={graphNodeColumnClasses.toggle}
      >
        <span className={graphNodeColumnClasses.toggleLabel}>
          <Table className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
          {copy.columnsLabel} ({columns.length})
        </span>
        {columnsExpanded ? (
          <ChevronUp className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
        ) : (
          <ChevronDown className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
        )}
      </button>

      {columnsExpanded ? (
        <div className={graphNodeColumnClasses.disclosure}>
          <div
            id={columnListId}
            data-slot="graph-node-column-list"
            className={graphNodeColumnClasses.list}
          >
            {visibleColumns.map((column) => (
              <GraphNodeColumnRow
                key={column.id ?? column.name}
                column={column}
                nodeId={nodeId}
                portDirections={portDirections}
                activeColumnHandleId={activeColumnHandleId}
                copy={copy}
                reorder={columnReorder}
                unavailableAliases={columnReorder.orderedColumns
                  .filter(
                    (candidate) => (candidate.id ?? candidate.name) !== (column.id ?? column.name)
                  )
                  .map((candidate) => candidate.name)}
                compositionRequest={
                  compositionRequest != null &&
                  (compositionRequest.targetColumn.id ?? compositionRequest.targetColumn.name) ===
                    (column.id ?? column.name)
                    ? compositionRequest
                    : undefined
                }
                onCompositionDismiss={() => setCompositionRequest(null)}
                onColumnPortActivate={onColumnPortActivate}
                onColumnFunctionApply={onColumnFunctionApply}
                onStructuredFieldApply={onStructuredFieldApply}
                onColumnOutputToggle={onColumnOutputToggle}
                onColumnReorder={onColumnReorder}
              />
            ))}
          </div>
          {nodeId != null && onCalculatedColumnAdd != null && columns.length > 0 ? (
            <GraphNodeCalculatedColumnForm
              nodeId={nodeId}
              columns={columnReorder.orderedColumns}
              onSubmit={onCalculatedColumnAdd}
            />
          ) : null}
          {remainingColumnCount > 0 ? (
            <button
              type="button"
              data-slot="graph-node-column-remainder-toggle"
              {...canvasNodeEmbeddedControlProps}
              aria-expanded={showAllColumns}
              aria-controls={columnListId}
              onClick={() => setShowAllColumns(!showAllColumns)}
              className={graphNodeColumnClasses.remainderToggle}
            >
              {showAllColumns ? copy.showFirstFiveColumnsLabel : remainderActionLabel}
            </button>
          ) : null}
          {onAutomap != null ? (
            <button
              type="button"
              data-slot="graph-node-column-automap"
              {...canvasNodeEmbeddedControlProps}
              onClick={onAutomap}
              className={graphNodeColumnClasses.automap}
            >
              {copy.automapColumnsLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
