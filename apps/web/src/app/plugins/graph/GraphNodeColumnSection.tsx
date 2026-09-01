/** Owned concern: render recorded graph-node columns as a compact disclosure. */
import { useEffect, useId, useState, type ReactElement } from 'react';
import { Check, ChevronDown, ChevronUp, Table } from 'lucide-react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { CanvasNodePortHandle } from '../../components/canvas/CanvasNodePortHandle';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
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
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { graphNodeColumnClasses } from './graphVisualTokens';

export type GraphNodeColumnFunction = Readonly<{
  capabilityId: string;
  name: string;
}>;

export type GraphNodeColumn = Readonly<{
  id?: string;
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  output?: boolean;
  sourceNodeName?: string;
  reference?: string;
  sourceHandleId?: string;
  targetHandleId?: string;
  functionMenu?: Readonly<{
    category: 'text' | 'numeric' | 'date-time' | 'conversion' | 'aggregate' | 'window';
    items: readonly GraphNodeColumnFunction[];
  }>;
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
  onColumnFunctionApply?: (identity: {
    nodeId: string;
    columnId: string;
    capabilityId: string;
  }) => void;
  onColumnOutputToggle?: (identity: {
    nodeId: string;
    columnId: string;
    columnType: string;
    output: boolean;
  }) => void;
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
    onColumnFunctionApply:
      args.nodeRole === 'transform' && typeof data.onApplyDvtSubstraitColumnFunction === 'function'
        ? (data.onApplyDvtSubstraitColumnFunction as (identity: {
            nodeId: string;
            columnId: string;
            capabilityId: string;
          }) => void)
        : undefined,
    onColumnOutputToggle:
      args.nodeRole === 'transform' && typeof data.onToggleDvtSubstraitColumnOutput === 'function'
        ? (data.onToggleDvtSubstraitColumnOutput as (identity: {
            nodeId: string;
            columnId: string;
            columnType: string;
            output: boolean;
          }) => void)
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
  onColumnFunctionApply,
  onColumnOutputToggle,
  onDisclosureChange,
  onColumnLayoutChange,
  onAutomap,
}: GraphNodeColumnSectionProps): ReactElement {
  const [columnsExpanded, setColumnsExpanded] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [keyboardFunctionMenuColumnId, setKeyboardFunctionMenuColumnId] = useState<string | null>(
    null
  );
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
              const isOutput = column.output !== false;
              const metadataRows = [
                { label: copy.columnTypeLabel, value: column.type },
                ...(column.nullable == null
                  ? []
                  : [
                      {
                        label: copy.columnNullabilityLabel,
                        value: column.nullable ? copy.columnNullableValue : copy.columnNotNullValue,
                      },
                    ]),
                ...(column.sourceNodeName == null
                  ? []
                  : [{ label: copy.columnOriginLabel, value: column.sourceNodeName }]),
                ...(column.reference == null
                  ? []
                  : [{ label: copy.columnReferenceLabel, value: column.reference }]),
                {
                  label: copy.columnsLabel,
                  value: isOutput ? copy.columnOutputValue : copy.columnAvailableInputValue,
                },
              ];
              const columnPiece = (
                <div
                  data-slot="graph-node-column-piece"
                  data-output={String(isOutput)}
                  tabIndex={0}
                  aria-label={(isOutput
                    ? copy.columnOutputAriaLabelTemplate
                    : copy.columnAvailableInputAriaLabelTemplate
                  ).replace('{column}', column.name)}
                  className={graphNodeColumnClasses.piece}
                >
                  <span className={graphNodeColumnClasses.name}>{column.name}</span>
                  <span className={graphNodeColumnClasses.metadata}>
                    <span className={graphNodeColumnClasses.type}>{column.type}</span>
                    {column.primaryKey === true ? (
                      <span className={graphNodeColumnClasses.constraint}>PK</span>
                    ) : null}
                    {column.nullable === false ? (
                      <span className={graphNodeColumnClasses.constraint}>NN</span>
                    ) : null}
                    <button
                      type="button"
                      data-slot="graph-node-column-output-state"
                      {...canvasNodeEmbeddedControlProps}
                      aria-label={(isOutput
                        ? copy.columnOutputAriaLabelTemplate
                        : copy.columnAvailableInputAriaLabelTemplate
                      ).replace('{column}', column.name)}
                      aria-pressed={isOutput}
                      disabled={nodeId == null || onColumnOutputToggle == null}
                      className={graphNodeColumnClasses.outputState}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (nodeId == null) return;
                        onColumnOutputToggle?.({
                          nodeId,
                          columnId,
                          columnType: column.type,
                          output: !isOutput,
                        });
                      }}
                    >
                      {isOutput ? (
                        <Check
                          data-slot="graph-node-column-output-check"
                          className={graphNodeColumnClasses.outputCheck}
                        />
                      ) : null}
                    </button>
                  </span>
                </div>
              );
              const tooltipContent = (
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className={graphNodeColumnClasses.tooltip}
                >
                  <dl className={graphNodeColumnClasses.tooltipRows}>
                    {metadataRows.map((row) => (
                      <div key={row.label} className={graphNodeColumnClasses.tooltipRow}>
                        <dt className={graphNodeColumnClasses.tooltipLabel}>{row.label}</dt>
                        <dd className={graphNodeColumnClasses.tooltipValue}>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </TooltipContent>
              );
              return (
                <div
                  key={columnId}
                  data-slot="graph-node-column-row"
                  className={graphNodeColumnClasses.row}
                  onKeyDownCapture={(event) => {
                    if (
                      column.functionMenu != null &&
                      onColumnFunctionApply != null &&
                      ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu')
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      setKeyboardFunctionMenuColumnId(columnId);
                    }
                  }}
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
                  {nodeId != null &&
                  column.functionMenu != null &&
                  onColumnFunctionApply != null ? (
                    <Tooltip>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <TooltipTrigger asChild>{columnPiece}</TooltipTrigger>
                        </ContextMenuTrigger>
                        <ContextMenuContent data-slot="graph-node-column-function-menu">
                          <ContextMenuLabel>
                            {copy.columnFunctionCategoryLabels[column.functionMenu.category]}
                          </ContextMenuLabel>
                          <ContextMenuGroup>
                            {column.functionMenu.items.length === 0 ? (
                              <ContextMenuItem disabled>
                                {copy.noCompatibleColumnFunctionsLabel}
                              </ContextMenuItem>
                            ) : (
                              column.functionMenu.items.map((item) => (
                                <ContextMenuItem
                                  key={item.capabilityId}
                                  data-slot="graph-node-column-function"
                                  data-capability-id={item.capabilityId}
                                  onSelect={() =>
                                    onColumnFunctionApply({
                                      nodeId,
                                      columnId,
                                      capabilityId: item.capabilityId,
                                    })
                                  }
                                >
                                  {item.name.toUpperCase()}
                                </ContextMenuItem>
                              ))
                            )}
                          </ContextMenuGroup>
                        </ContextMenuContent>
                      </ContextMenu>
                      <DropdownMenu
                        open={keyboardFunctionMenuColumnId === columnId}
                        onOpenChange={(open) =>
                          setKeyboardFunctionMenuColumnId(open ? columnId : null)
                        }
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden="true"
                            className={graphNodeColumnClasses.keyboardMenuAnchor}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          data-slot="graph-node-column-function-menu"
                          side="right"
                          align="start"
                        >
                          <DropdownMenuLabel>
                            {copy.columnFunctionCategoryLabels[column.functionMenu.category]}
                          </DropdownMenuLabel>
                          <DropdownMenuGroup>
                            {column.functionMenu.items.length === 0 ? (
                              <DropdownMenuItem disabled>
                                {copy.noCompatibleColumnFunctionsLabel}
                              </DropdownMenuItem>
                            ) : (
                              column.functionMenu.items.map((item) => (
                                <DropdownMenuItem
                                  key={item.capabilityId}
                                  data-slot="graph-node-column-function"
                                  data-capability-id={item.capabilityId}
                                  onSelect={() =>
                                    onColumnFunctionApply({
                                      nodeId,
                                      columnId,
                                      capabilityId: item.capabilityId,
                                    })
                                  }
                                >
                                  {item.name.toUpperCase()}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {tooltipContent}
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>{columnPiece}</TooltipTrigger>
                      {tooltipContent}
                    </Tooltip>
                  )}
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
