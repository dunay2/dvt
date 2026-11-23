/**
 * Owned concern: render the passive, accessible sample grid and local toolbar.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Receive projected values and actions; layout lives in a CSS module.
 * @consequence No query, clipboard or table-state policy is owned by markup.
 * @version 1.0.0
 */
import { Info } from 'lucide-react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { OperationalDrawerDataToolbar } from './OperationalDrawerDataToolbar';
import { OperationalDrawerDataColumnHeader } from './OperationalDrawerDataColumnHeader';
import type { useOperationalDrawerDataTable } from './useOperationalDrawerDataTable';
import type { OperationalDrawerDataTableCopy } from './operationalDrawerDataTableCopy';
import styles from './OperationalDrawerDataTable.module.css';

type DataTable = ReturnType<typeof useOperationalDrawerDataTable>;

function handleCellKey(
  event: KeyboardEvent<HTMLTableSectionElement>,
  selection: DataTable['selection']
) {
  const target = event.target;
  if (event.altKey || !(target instanceof HTMLButtonElement)) return;
  const control = event.ctrlKey || event.metaKey;
  if (control && !event.shiftKey && event.key.toLowerCase() === 'c' && selection.canCopy) {
    event.preventDefault();
    void selection.copy();
    return;
  }
  const cell = target.closest('td');
  const row = cell?.closest('tr');
  if (cell == null || row == null) return;
  const next = selection.move(
    { row: row.sectionRowIndex, column: cell.cellIndex - 1 },
    event.key,
    control
  );
  if (next == null) return;
  event.preventDefault();
  event.currentTarget.rows
    .item(next.row)
    ?.cells.item(next.column + 1)
    ?.querySelector('button')
    ?.focus();
}

function DataCell({
  cell,
  nullLabel,
  emptyLabel,
}: Readonly<{
  cell: DataTable['rows'][number]['cells'][number];
  nullLabel: string;
  emptyLabel: string;
}>): JSX.Element {
  const displayValue = cell.value ?? nullLabel;
  const label = cell.value === '' ? emptyLabel : displayValue;
  return (
    <td data-selected={cell.selected}>
      <button
        type="button"
        data-slot="bottom-operational-data-value"
        className={styles.cell}
        onClick={(event) => cell.select(event.ctrlKey || event.metaKey)}
        aria-pressed={cell.selected}
        aria-label={label}
        title={label}
      >
        <span data-null={cell.value == null} className={styles.value}>
          {displayValue}
        </span>
      </button>
    </td>
  );
}

export function OperationalDrawerDataTableTemplate({
  model,
  copy,
  toolbarActions,
  footer,
}: Readonly<{
  model: DataTable;
  copy: OperationalDrawerDataTableCopy;
  toolbarActions?: ReactNode;
  footer?: ReactNode;
}>): JSX.Element {
  const { selection } = model;
  const allColumnsHidden = model.columnVisibility.length > 0 && model.headers.length === 0;
  return (
    <section
      className={styles.grid}
      data-slot="bottom-operational-data-grid"
      data-density={model.comfortable ? 'comfortable' : 'compact'}
      data-wrap={model.wrap}
      aria-label={model.caption}
      style={{ '--grid-primary': model.backgroundColor } as CSSProperties}
    >
      <OperationalDrawerDataToolbar model={model} copy={copy}>
        {toolbarActions}
      </OperationalDrawerDataToolbar>
      <div data-slot="bottom-operational-data-table-frame" className={styles.frame}>
        <table
          data-slot="bottom-operational-data-table"
          className={styles.table}
          hidden={allColumnsHidden}
        >
          <caption className={styles.srOnly}>{model.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.rowNumber} aria-label={copy.rowNumber}>
                #
              </th>
              {model.headers.map((header) => (
                <OperationalDrawerDataColumnHeader key={header.id} header={header} copy={copy} />
              ))}
            </tr>
          </thead>
          <tbody onKeyDown={(event) => handleCellKey(event, selection)}>
            {model.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className={styles.rowNumber}>
                  {row.number}
                </th>
                {row.cells.map((cell) => (
                  <DataCell
                    key={cell.id}
                    cell={cell}
                    nullLabel={model.nullValueLabel}
                    emptyLabel={copy.emptyText}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {allColumnsHidden && <p className={styles.empty}>{copy.allColumnsHidden}</p>}
        {!allColumnsHidden && model.rows.length === 0 && model.hasFilters ? (
          <p className={styles.empty}>{copy.noMatches}</p>
        ) : null}
      </div>
      <footer className={styles.footer}>
        <span role="status">{selection.feedback == null ? '' : copy[selection.feedback]}</span>
        <div className={styles.footerFacts}>
          {footer}
          <span className={styles.help} tabIndex={0} aria-label={copy.scope} title={copy.scope}>
            <Info aria-hidden="true" />
          </span>
        </div>
      </footer>
    </section>
  );
}
