/** Owned concern: render recorded graph-node columns as a compact disclosure. */
import { useEffect, useId, useState, type ReactElement } from 'react';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { CanvasNodePortHandle } from '../../components/canvas/CanvasNodePortHandle';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { graphNodeColumnClasses } from './graphVisualTokens';

export type GraphNodeColumn = Readonly<{
  id?: string;
  name: string;
  type: string;
  sourceHandleId?: string;
  targetHandleId?: string;
}>;
export type GraphNodeColumnPortDirection = 'source' | 'target';
export type GraphNodeColumnPortIdentity = Readonly<{
  direction: GraphNodeColumnPortDirection;
  nodeId: string;
  columnId: string;
}>;

export type GraphNodeColumnSectionProps = Readonly<{
  columns: readonly GraphNodeColumn[];
  nodeId?: string;
  portDirections?: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onDisclosureChange?: (expanded: boolean) => void;
  onColumnLayoutChange?: () => void;
  onAutomap?: () => void;
}>;

export function resolveGraphNodeColumnInteractionProps(args: {
  nodeId: string;
  nodeRole: string;
  data: Record<string, unknown>;
}) {
  const { data } = args;
  return {
    nodeId: args.nodeId,
    columnPortDirections: Array.isArray(data.columnPortDirections)
      ? (data.columnPortDirections as readonly GraphNodeColumnPortDirection[])
      : [],
    activeColumnHandleId:
      typeof data.activeColumnHandleId === 'string' ? data.activeColumnHandleId : null,
    onColumnPortActivate:
      typeof data.onColumnPortActivate === 'function'
        ? (data.onColumnPortActivate as (identity: GraphNodeColumnPortIdentity) => void)
        : undefined,
    onColumnDisclosureChange:
      typeof data.onColumnDisclosureChange === 'function'
        ? (data.onColumnDisclosureChange as (nodeId: string, expanded: boolean) => void)
        : undefined,
    onColumnLayoutChange:
      typeof data.onColumnLayoutChange === 'function'
        ? (data.onColumnLayoutChange as () => void)
        : undefined,
    onAutomapColumns:
      args.nodeRole === 'transform' && typeof data.onAutomapColumns === 'function'
        ? (data.onAutomapColumns as (nodeId: string, columns: readonly GraphNodeColumn[]) => void)
        : undefined,
  };
}

const MAX_PREVIEW_COLUMNS = 5;

export function GraphNodeColumnSection({
  columns,
  nodeId,
  portDirections = [],
  activeColumnHandleId,
  onColumnPortActivate,
  onDisclosureChange,
  onColumnLayoutChange,
  onAutomap,
}: GraphNodeColumnSectionProps): ReactElement {
  const [columnsExpanded, setColumnsExpanded] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeCardCopy(applicationLanguage);
  const columnListId = useId();
  const portDirectionKey = portDirections.join(':');
  const visibleColumns = showAllColumns ? columns : columns.slice(0, MAX_PREVIEW_COLUMNS);
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
  const setRemainderDisclosure = (expanded: boolean) => {
    setShowAllColumns(expanded);
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

      {columnsExpanded && (
        <div className={graphNodeColumnClasses.disclosure}>
          <div
            id={columnListId}
            data-slot="graph-node-column-list"
            className={graphNodeColumnClasses.list}
          >
            {visibleColumns.map((column) => {
              const columnId = column.id ?? column.name;
              return (
                <div
                  key={columnId}
                  data-slot="graph-node-column-row"
                  className={graphNodeColumnClasses.row}
                >
                  {nodeId != null &&
                    column.targetHandleId != null &&
                    portDirections.includes('target') && (
                      <CanvasNodePortHandle
                        kind="target"
                        id={column.targetHandleId}
                        tone="model"
                        variant="column"
                        active={activeColumnHandleId === column.targetHandleId}
                        label={copy.targetColumnPortLabelTemplate.replace('{column}', column.name)}
                        onActivate={() =>
                          onColumnPortActivate?.({ direction: 'target', nodeId, columnId })
                        }
                      />
                    )}
                  <span className={graphNodeColumnClasses.name}>{column.name}</span>
                  <span className={graphNodeColumnClasses.type}>{column.type}</span>
                  {nodeId != null &&
                    column.sourceHandleId != null &&
                    portDirections.includes('source') && (
                      <CanvasNodePortHandle
                        kind="source"
                        id={column.sourceHandleId}
                        tone="source"
                        variant="column"
                        active={activeColumnHandleId === column.sourceHandleId}
                        label={copy.sourceColumnPortLabelTemplate.replace('{column}', column.name)}
                        onActivate={() =>
                          onColumnPortActivate?.({ direction: 'source', nodeId, columnId })
                        }
                      />
                    )}
                </div>
              );
            })}
          </div>
          {remainingColumnCount > 0 && (
            <button
              type="button"
              data-slot="graph-node-column-remainder-toggle"
              {...canvasNodeEmbeddedControlProps}
              aria-expanded={showAllColumns}
              aria-controls={columnListId}
              onClick={() => setRemainderDisclosure(!showAllColumns)}
              className={graphNodeColumnClasses.remainderToggle}
            >
              {showAllColumns ? copy.showFirstFiveColumnsLabel : remainderActionLabel}
            </button>
          )}
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
      )}
    </div>
  );
}
