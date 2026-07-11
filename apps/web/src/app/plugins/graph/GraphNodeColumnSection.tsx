/** Owned concern: render recorded graph-node columns as a compact disclosure. */
import { useState, type ReactElement } from 'react';
import { ChevronDown, ChevronUp, Table } from 'lucide-react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
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

  return (
    <div data-slot="graph-node-column-section" className={graphNodeColumnClasses.shell}>
      <button
        type="button"
        data-slot="graph-node-column-toggle"
        {...canvasNodeEmbeddedControlProps}
        aria-expanded={columnsExpanded}
        onClick={() => setColumnsExpanded((value) => !value)}
        className={graphNodeColumnClasses.toggle}
      >
        <span className={graphNodeColumnClasses.toggleLabel}>
          <Table className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
          Columnas ({columns.length})
        </span>
        {columnsExpanded ? (
          <ChevronUp className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
        ) : (
          <ChevronDown className={graphNodeColumnClasses.toggleIcon} aria-hidden="true" />
        )}
      </button>

      {columnsExpanded && (
        <div className={graphNodeColumnClasses.list}>
          {columns.map((column) => (
            <div key={column.name} className={graphNodeColumnClasses.row}>
              <span className={graphNodeColumnClasses.name}>{column.name}</span>
              <span className={graphNodeColumnClasses.type}>{column.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
