/**
 * Owned concern: render the passive, accessible sample grid and local toolbar.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Receive projected values and actions; layout lives in a CSS module.
 * @consequence No query, clipboard or table-state policy is owned by markup.
 * @version 1.0.0
 */
import { AlignJustify, Copy, Eye, EyeOff, Info, Search, WrapText } from 'lucide-react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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
  const copyLabel = selection.isRange ? copy.copyRange : copy.copy;
  const VisibilityIcon = model.columnVisibility.some(({ visible }) => !visible) ? EyeOff : Eye;
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
      <div className={styles.toolbar} data-slot="data-grid-toolbar">
        <label className={styles.search}>
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label={copy.search}
            placeholder={copy.search}
            value={model.search}
            onChange={(event) => model.setSearch(event.target.value)}
          />
        </label>
        <span className={styles.count} title={copy.scope}>
          {copy.count
            .replace('{visible}', String(model.rows.length))
            .replace('{total}', String(model.total))}
        </span>
        <div className={styles.actions}>
          {toolbarActions}
          {model.columnVisibility.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" title={copy.columns} aria-label={copy.columns}>
                  <VisibilityIcon aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                aria-label={copy.columns}
                className={styles.visibilityList}
              >
                {model.columnVisibility.map((column) => {
                  const Icon = column.visible ? Eye : EyeOff;
                  return (
                    <Button
                      key={column.id}
                      variant="ghost"
                      size="sm"
                      className={styles.visibilityItem}
                      aria-label={copy.showColumn.replace('{column}', () => column.id)}
                      aria-pressed={column.visible}
                      title={column.id}
                      onClick={column.toggle}
                    >
                      <Icon aria-hidden="true" />
                      <span>{column.id}</span>
                    </Button>
                  );
                })}
              </PopoverContent>
            </Popover>
          )}
          <button
            type="button"
            title={model.comfortable ? copy.compact : copy.comfortable}
            aria-label={model.comfortable ? copy.compact : copy.comfortable}
            aria-pressed={model.comfortable}
            onClick={() => model.setComfortable(!model.comfortable)}
          >
            <AlignJustify aria-hidden="true" />
          </button>
          <button
            type="button"
            title={copy.wrap}
            aria-label={copy.wrap}
            aria-pressed={model.wrap}
            onClick={() => model.setWrap(!model.wrap)}
          >
            <WrapText aria-hidden="true" />
          </button>
          <button
            type="button"
            title={copyLabel}
            aria-label={copyLabel}
            disabled={!selection.canCopy}
            onClick={() => void selection.copy()}
          >
            <Copy aria-hidden="true" />
          </button>
          <Input
            type="color"
            className={styles.swatch}
            aria-label={copy.backgroundColor}
            title={copy.backgroundColor}
            value={model.backgroundColor}
            onChange={(event) => model.setBackgroundColor(event.currentTarget.value)}
          />
        </div>
      </div>
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
                  <td key={cell.id} data-selected={cell.selected}>
                    <button
                      type="button"
                      data-slot="bottom-operational-data-value"
                      className={styles.cell}
                      onClick={(event) => cell.select(event.ctrlKey || event.metaKey)}
                      aria-pressed={cell.selected}
                      aria-label={
                        cell.value === '' ? copy.emptyText : (cell.value ?? model.nullValueLabel)
                      }
                      title={
                        cell.value === '' ? copy.emptyText : (cell.value ?? model.nullValueLabel)
                      }
                    >
                      <span data-null={cell.value == null} className={styles.value}>
                        {cell.value ?? model.nullValueLabel}
                      </span>
                    </button>
                  </td>
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
