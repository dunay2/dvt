/** Present the sort, filter and movement controls for one loaded-data column. */
import { ArrowDown, ArrowDownUp, ArrowUp, Filter } from 'lucide-react';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import type { OperationalDrawerDataTableCopy } from './operationalDrawerDataTableCopy';
import type { useOperationalDrawerDataTable } from './useOperationalDrawerDataTable';
import styles from './OperationalDrawerDataTable.module.css';

export function OperationalDrawerDataColumnHeader({
  header,
  copy,
}: Readonly<{
  header: ReturnType<typeof useOperationalDrawerDataTable>['headers'][number];
  copy: OperationalDrawerDataTableCopy;
}>): JSX.Element {
  const SortIndicator =
    header.sort === 'ascending' ? ArrowUp : header.sort === 'descending' ? ArrowDown : ArrowDownUp;
  const filterLabel = copy.filterColumn.replace('{column}', header.id);
  return (
    <th
      scope="col"
      aria-sort={header.sortPriority > 1 ? undefined : header.sort}
      data-drop-edge={header.movement.edge}
    >
      <div className={styles.heading}>
        <button
          type="button"
          className={styles.sort}
          data-column-id={header.id}
          data-sort={header.sort}
          data-sort-priority={header.sortPriority || undefined}
          title={`${header.id} · ${copy.columnHint}`}
          aria-description={
            header.sortPriority === 0
              ? undefined
              : copy.sortPriority
                  .replace('{priority}', String(header.sortPriority))
                  .replace(
                    '{direction}',
                    copy[header.sort === 'descending' ? 'descending' : 'ascending']
                  )
          }
          aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
          {...header.movement.events}
          onClick={header.toggleSort}
        >
          <span className={styles.columnName}>{header.id}</span>
          <SortIndicator aria-hidden="true" />
          {header.sortPriority > 0 && <sup aria-hidden="true">{header.sortPriority}</sup>}
        </button>
        {header.type && (
          <span className={styles.type} title={header.type}>
            {header.type}
          </span>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={styles.filter}
              aria-label={filterLabel}
              aria-description={
                header.filterPriority > 0
                  ? copy.filterPriority.replace('{priority}', String(header.filterPriority))
                  : undefined
              }
              title={filterLabel}
              data-active={header.filterPriority > 0}
              data-filter-priority={header.filterPriority || undefined}
            >
              <Filter aria-hidden="true" />
              {header.filterPriority > 0 && <sup aria-hidden="true">{header.filterPriority}</sup>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" aria-label={filterLabel} className="w-52 p-2">
            <Input
              type="search"
              className="h-7 text-xs"
              aria-label={filterLabel}
              placeholder={filterLabel}
              value={header.filter}
              onChange={(event) => header.setFilter(event.currentTarget.value)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </th>
  );
}
