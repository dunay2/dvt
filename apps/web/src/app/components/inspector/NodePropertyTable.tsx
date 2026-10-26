/** Shared property cells, rendered as an Inspector table or workbench records. */
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { NodePropertySection, NodePropertyTableRow } from './nodePropertiesContracts';
import {
  inspectorPropertyClasses as styles,
  inspectorVisualClasses,
} from './inspectorVisualTokens';

export type NodePropertyTableCellRenderContext = Readonly<{
  sectionId: NodePropertySection['id'];
  rowId: string;
  columnKey: string;
  value: string;
}>;

export type NodePropertyTableProps = Readonly<{
  section: NodePropertySection;
  surface?: 'inspector' | 'workbench';
  renderTableCell?: (context: NodePropertyTableCellRenderContext) => ReactNode;
}>;

function PropertyCell({
  section,
  row,
  columnKey,
  renderTableCell,
  displayValue,
}: Pick<NodePropertyTableProps, 'section' | 'renderTableCell'> &
  Readonly<{
    row: NodePropertyTableRow;
    columnKey: string;
    displayValue?: string;
  }>): JSX.Element {
  const value = displayValue ?? row.cells[columnKey] ?? '';
  const content =
    renderTableCell?.({
      sectionId: section.id,
      rowId: row.id,
      columnKey,
      value,
    }) ?? value;
  return <>{content || <span className={inspectorVisualClasses.inspectorSubtle}>-</span>}</>;
}

function RelationshipRecord({
  section,
  row,
  renderTableCell,
}: Pick<NodePropertyTableProps, 'section' | 'renderTableCell'> &
  Readonly<{ row: NodePropertyTableRow }>): JSX.Element {
  const nodeName = row.cells.node?.trim();
  const displayName = nodeName && nodeName !== row.cells.nodeId?.trim() ? row.cells.node : '';
  return (
    <li data-slot="node-property-relationship-record" className={styles.records.relationshipCard}>
      <div
        data-slot="node-property-relationship-summary"
        className={styles.records.relationshipSummary}
      >
        <span
          data-slot="node-property-relationship-direction"
          className={styles.records.relationshipMeta}
        >
          <PropertyCell
            section={section}
            row={row}
            columnKey="direction"
            renderTableCell={renderTableCell}
          />
        </span>
        <span data-slot="node-property-relationship-node" className={styles.records.name}>
          <PropertyCell
            section={section}
            row={row}
            columnKey="node"
            displayValue={displayName}
            renderTableCell={renderTableCell}
          />
        </span>
        <span
          data-slot="node-property-relationship-relation"
          className={styles.records.relationshipMeta}
        >
          <PropertyCell
            section={section}
            row={row}
            columnKey="relation"
            renderTableCell={renderTableCell}
          />
        </span>
      </div>
      {row.cells.connection?.trim() ? (
        <p
          data-slot="node-property-relationship-connection"
          className={styles.records.relationshipConnection}
        >
          <PropertyCell
            section={section}
            row={row}
            columnKey="connection"
            renderTableCell={renderTableCell}
          />
        </p>
      ) : null}
    </li>
  );
}

function PropertyRecords({
  section,
  renderTableCell,
  columnKeys,
}: NodePropertyTableProps & Readonly<{ columnKeys: readonly string[] }>): JSX.Element {
  const columns = section.id === 'columns';
  const detailKeys = columnKeys.filter((key) => key !== 'name');
  const records = (
    <ul
      data-slot={columns ? 'node-property-column-list' : 'node-property-relationship-list'}
      aria-label={columns ? undefined : section.label}
      className={columns ? styles.records.column : styles.records.relationship}
    >
      {section.tableRows.map((row) => {
        if (!columns)
          return (
            <RelationshipRecord
              key={row.id}
              section={section}
              row={row}
              renderTableCell={renderTableCell}
            />
          );
        const fields =
          detailKeys.length === 0 ? null : (
            <dl className={styles.records.details}>
              {detailKeys.map((key) => (
                <div key={key} className={styles.fact}>
                  <dt className={inspectorVisualClasses.inspectorLabel}>
                    {columnLabel(section, key)}
                  </dt>
                  <dd className={styles.value.workbench}>
                    <PropertyCell
                      section={section}
                      row={row}
                      columnKey={key}
                      renderTableCell={renderTableCell}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          );
        return (
          <li key={row.id} data-slot="node-property-column-record">
            <details
              data-slot="node-property-column-disclosure"
              className={styles.records.disclosure}
            >
              <summary className={styles.records.trigger}>
                <ChevronRight
                  data-slot="node-property-column-disclosure-arrow"
                  className={styles.records.arrow}
                  aria-hidden="true"
                />
                <span className={styles.records.name}>{row.cells.name || row.id}</span>
              </summary>
              {fields}
            </details>
          </li>
        );
      })}
    </ul>
  );
  return columns ? (
    <div role="region" aria-label={section.label} tabIndex={0} className={styles.records.region}>
      {records}
    </div>
  ) : (
    records
  );
}

function columnLabel(section: NodePropertySection, key: string): string {
  return section.columnLabels?.[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function NodePropertyTable({
  section,
  surface = 'inspector',
  renderTableCell,
}: NodePropertyTableProps): JSX.Element {
  const columnKeys = Array.from(
    new Set(section.tableRows.flatMap((row) => Object.keys(row.cells)))
  ).filter((key) => section.id !== 'columns' || key !== 'reference');
  if (surface === 'workbench' && (section.id === 'columns' || section.id === 'inputs-outputs')) {
    return (
      <PropertyRecords
        section={section}
        columnKeys={columnKeys}
        renderTableCell={renderTableCell}
      />
    );
  }
  const table = styles.table[surface];
  return (
    <div role="region" aria-label={section.label} tabIndex={0} className={table.region}>
      <table className={table.root}>
        <thead className={table.head}>
          <tr>
            {columnKeys.map((key) => (
              <th key={key} scope="col" className={table.heading}>
                {surface === 'workbench' ? columnLabel(section, key) : key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={table.body}>
          {section.tableRows.map((row) => (
            <tr key={row.id}>
              {columnKeys.map((key) => (
                <td key={key} className={table.cell}>
                  <PropertyCell
                    section={section}
                    row={row}
                    columnKey={key}
                    renderTableCell={renderTableCell}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
