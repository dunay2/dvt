/**
 * Owned concern: render the passive, accessible sample grid and local toolbar.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Receive projected values and actions; layout lives in a CSS module.
 * @consequence No query, clipboard or table-state policy is owned by markup.
 * @version 1.0.0
 */
import { AlignJustify, Copy, Search, WrapText } from 'lucide-react';
import type { useOperationalDrawerDataTable } from './useOperationalDrawerDataTable';
import type { OperationalDrawerDataTableCopy } from './operationalDrawerDataTableCopy';
import styles from './OperationalDrawerDataTable.module.css';

export function OperationalDrawerDataTableTemplate({
  model,
  copy,
}: Readonly<{
  model: ReturnType<typeof useOperationalDrawerDataTable>;
  copy: OperationalDrawerDataTableCopy;
}>): JSX.Element {
  return (
    <section
      className={styles.grid}
      data-slot="bottom-operational-data-grid"
      data-density={model.comfortable ? 'comfortable' : 'compact'}
      data-wrap={model.wrap}
      aria-label={model.caption}
    >
      <div className={styles.toolbar}>
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
            title={copy.copy}
            aria-label={copy.copy}
            disabled={!model.canCopy}
            onClick={() => void model.copyCell()}
          >
            <Copy aria-hidden="true" />
          </button>
        </div>
      </div>
      <div data-slot="bottom-operational-data-table-frame" className={styles.frame}>
        <table data-slot="bottom-operational-data-table" className={styles.table}>
          <caption className={styles.srOnly}>{model.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.rowNumber} aria-label={copy.rowNumber}>
                #
              </th>
              {model.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={header.sort}
                  data-drop-edge={header.movement.edge}
                >
                  <div className={styles.heading}>
                    <button
                      type="button"
                      data-column-id={header.id}
                      data-sort={header.sort}
                      title={`${header.id} · ${copy.columnHint}`}
                      aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                      {...header.movement.events}
                      onClick={header.toggleSort}
                    >
                      {header.id}
                    </button>
                    {header.type == null ? null : (
                      <span className={styles.type} title={header.type}>
                        {header.type}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
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
                      onClick={cell.select}
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
        {model.rows.length === 0 && model.search !== '' ? (
          <p className={styles.empty}>{copy.noMatches}</p>
        ) : null}
      </div>
      <div className={styles.footer}>
        <span>{copy.scope}</span>
        <span role="status">{model.feedback == null ? '' : copy[model.feedback]}</span>
      </div>
    </section>
  );
}
