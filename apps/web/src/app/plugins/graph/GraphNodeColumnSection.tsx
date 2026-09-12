/** Owned concern: render recorded graph-node columns as a compact disclosure. */
import { ChevronDown, ChevronUp, Table } from 'lucide-react';
import { useId, type ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { GraphNodeColumnRow } from './GraphNodeColumnRow';
import { GraphNodeCalculatedColumnForm } from './GraphNodeCalculatedColumnForm';
import { graphNodeColumnClasses } from './graphVisualTokens';
import { useGraphNodeColumnSectionState } from './useGraphNodeColumnSectionState';

const compactRemainderClassName =
  'nodrag nopan mt-1 inline-flex cursor-pointer items-center rounded-sm px-1 py-1 text-left text-[11px] font-medium text-blue-300 transition-colors hover:text-blue-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400';

export function GraphNodeColumnSection(props: GraphNodeColumnSectionProps): ReactElement {
  const {
    columns,
    nodeId,
    portDirections = [],
    activeColumnHandleId,
    onColumnPortActivate,
    onColumnFunctionApply,
    resolveColumnCompositionFunctions,
    onStructuredFieldApply,
    onCalculatedColumnAdd,
    onColumnOutputToggle,
    onColumnReorder,
    onAutomap,
  } = props;
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeCardCopy(applicationLanguage);
  const columnListId = useId();
  const section = useGraphNodeColumnSectionState(props);
  const remainderActionLabel = copy.remainingColumnsLabelTemplate.replace(
    '{count}',
    String(section.remainingColumnCount)
  );
  const compactRemainderLabel = copy.compactRemainingColumnsLabelTemplate.replace(
    '{count}',
    String(section.remainingColumnCount)
  );
  const compactCollapseLabel = copy.compactCollapseColumnsLabel;

  return (
    <div data-slot="graph-node-column-section" className={graphNodeColumnClasses.shell}>
      <button
        type="button"
        data-slot="graph-node-column-toggle"
        {...canvasNodeEmbeddedControlProps}
        aria-expanded={section.columnsExpanded}
        aria-controls={columnListId}
        onClick={section.toggleDisclosure}
        className={graphNodeColumnClasses.toggle}
      >
        <span className={graphNodeColumnClasses.toggleLabel}>
          <Table className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
          {copy.columnsLabel} ({columns.length})
        </span>
        {section.columnsExpanded ? (
          <ChevronUp className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
        ) : (
          <ChevronDown className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
        )}
      </button>

      {section.columnsExpanded ? (
        <div className={graphNodeColumnClasses.disclosure}>
          <div
            id={columnListId}
            data-slot="graph-node-column-list"
            className={graphNodeColumnClasses.list}
          >
            {section.visibleColumns.map((column) => (
              <GraphNodeColumnRow
                key={column.id ?? column.name}
                column={column}
                nodeId={nodeId}
                portDirections={portDirections}
                activeColumnHandleId={activeColumnHandleId}
                copy={copy}
                reorder={section.columnReorder}
                expressionOperandCandidates={section.columnReorder.orderedColumns}
                unavailableAliases={section.columnReorder.orderedColumns
                  .filter(
                    (candidate) => (candidate.id ?? candidate.name) !== (column.id ?? column.name)
                  )
                  .map((candidate) => candidate.name)}
                structuredAppendCandidates={
                  column.children == null
                    ? []
                    : section.columnReorder.orderedColumns.filter(
                        (candidate) =>
                          candidate.children == null &&
                          candidate.output !== false &&
                          (candidate.id ?? candidate.name) !== (column.id ?? column.name) &&
                          !column.children?.some(
                            (child) =>
                              (child.id ?? child.name) === (candidate.id ?? candidate.name) ||
                              (child.sourceReference != null &&
                                child.sourceReference === candidate.sourceReference)
                          )
                      )
                }
                compositionRequest={
                  section.compositionRequest != null &&
                  (section.compositionRequest.targetColumn.id ??
                    section.compositionRequest.targetColumn.name) === (column.id ?? column.name)
                    ? section.compositionRequest
                    : undefined
                }
                onCompositionDismiss={section.dismissComposition}
                focusRequested={section.pendingFocusFieldId === (column.id ?? column.name)}
                onFocusFulfilled={section.fulfillCreatedColumnFocus}
                onFunctionApplied={section.revealCreatedColumn}
                onColumnPortActivate={onColumnPortActivate}
                onColumnFunctionApply={onColumnFunctionApply}
                resolveColumnCompositionFunctions={resolveColumnCompositionFunctions}
                onStructuredFieldApply={onStructuredFieldApply}
                onColumnOutputToggle={onColumnOutputToggle}
                onColumnReorder={onColumnReorder}
              />
            ))}
          </div>
          {nodeId != null && onCalculatedColumnAdd != null && columns.length > 0 ? (
            <GraphNodeCalculatedColumnForm
              nodeId={nodeId}
              columns={section.columnReorder.orderedColumns}
              onSubmit={onCalculatedColumnAdd}
            />
          ) : null}
          {section.remainingColumnCount > 0 ? (
            <button
              type="button"
              data-slot="graph-node-column-remainder-toggle"
              {...canvasNodeEmbeddedControlProps}
              aria-expanded={section.showAllColumns}
              aria-controls={columnListId}
              onClick={section.toggleAllColumns}
              className={compactRemainderClassName}
            >
              <span className="sr-only">
                {section.showAllColumns ? copy.showFirstFiveColumnsLabel : remainderActionLabel}
              </span>
              <span aria-hidden="true">
                {section.showAllColumns ? compactCollapseLabel : compactRemainderLabel}
              </span>
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
