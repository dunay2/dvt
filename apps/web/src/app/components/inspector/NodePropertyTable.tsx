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
}: Pick<NodePropertyTableProps, 'section' | 'renderTableCell'> &
  Readonly<{
    row: NodePropertyTableRow;
    columnKey: string;
  }>): JSX.Element {
  const content =
    renderTableCell?.({
      sectionId: section.id,
      rowId: row.id,
      columnKey,
      value: row.cells[columnKey] ?? '',
    }) ?? row.cells[columnKey];
  return <>{content || <span className={inspectorVisualClasses.inspectorSubtle}>-</span>}</>;
}

function PropertyRecords({
  section,
  renderTableCell,
  columnKeys,
}: NodePropertyTableProps & Readonly<{ columnKeys: readonly string[] }>): JSX.Element {
  const columns = section.id === 'columns';
  const detailKeys = columns ? columnKeys.filter((key) => key !== 'name') : columnKeys;
  const records = (
    <ul
      data-slot={columns ? 'node-property-column-list' : 'node-property-relationship-list'}
      aria-label={columns ? undefined : section.label}
      className={columns ? styles.records.column : styles.records.relationship}
    >
      {section.tableRows.map((row) => {
        const fields =
          detailKeys.length === 0 ? null : (
            <dl className={columns ? styles.records.details : styles.records.divided}>
              {detailKeys.map((key) => (
                <div key={key} className={columns ? styles.fact : styles.records.field}>
                  <dt className={inspectorVisualClasses.inspectorLabel}>
                    {columnLabel(section, key)}
                  </dt>
                  <dd className={columns ? styles.value.workbench : styles.records.value}>
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
          <li
            key={row.id}
            data-slot={
              columns ? 'node-property-column-record' : 'node-property-relationship-record'
            }
            className={columns ? undefined : styles.records.card}
          >
            {columns ? (
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
            ) : (
              fields
            )}
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
  );
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
