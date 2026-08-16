/** Owned concern: render recorded graph-node columns as a compact disclosure. */
import { useId, useState, type ReactElement } from 'react';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { graphNodeColumnClasses } from './graphVisualTokens';

export type GraphNodeColumn = Readonly<{
  name: string;
  type: string;
}>;

export type GraphNodeColumnSectionProps = Readonly<{
  columns: readonly GraphNodeColumn[];
}>;

export function GraphNodeColumnSection({ columns }: GraphNodeColumnSectionProps): ReactElement {
  const [columnsExpanded, setColumnsExpanded] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeCardCopy(applicationLanguage);
  const columnListId = useId();
  const visibleColumns = showAllColumns ? columns : columns.slice(0, 5);
  const remainingColumnCount = Math.max(columns.length - 5, 0);
  const remainderActionLabel = copy.remainingColumnsLabelTemplate.replace(
    '{count}',
    String(remainingColumnCount)
  );

  return (
    <div data-slot="graph-node-column-section" className={graphNodeColumnClasses.shell}>
      <button
        type="button"
        data-slot="graph-node-column-toggle"
        {...canvasNodeEmbeddedControlProps}
        aria-expanded={columnsExpanded}
        aria-controls={columnListId}
        onClick={() => {
          setColumnsExpanded((value) => !value);
          if (columnsExpanded) {
            setShowAllColumns(false);
          }
        }}
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
        <div id={columnListId} className={graphNodeColumnClasses.disclosure}>
          <div className={graphNodeColumnClasses.list}>
            {visibleColumns.map((column) => (
              <div
                key={column.name}
                data-slot="graph-node-column-row"
                className={graphNodeColumnClasses.row}
              >
                <span className={graphNodeColumnClasses.name}>{column.name}</span>
                <span className={graphNodeColumnClasses.type}>{column.type}</span>
              </div>
            ))}
          </div>
          {remainingColumnCount > 0 && (
            <button
              type="button"
              data-slot="graph-node-column-remainder-toggle"
              {...canvasNodeEmbeddedControlProps}
              aria-expanded={showAllColumns}
              aria-controls={columnListId}
              onClick={() => setShowAllColumns((value) => !value)}
              className={graphNodeColumnClasses.remainderToggle}
            >
              {showAllColumns ? copy.showFirstFiveColumnsLabel : remainderActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
