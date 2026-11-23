/** Render controls for the loaded preview rows and columns. */
import { AlignJustify, Copy, Eye, EyeOff, Search, WrapText } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import type { useOperationalDrawerDataTable } from './useOperationalDrawerDataTable';
import type { OperationalDrawerDataTableCopy } from './operationalDrawerDataTableCopy';
import styles from './OperationalDrawerDataTable.module.css';

type DataTable = ReturnType<typeof useOperationalDrawerDataTable>;

function ColumnVisibilityMenu({
  columns,
  copy,
}: Readonly<{
  columns: DataTable['columnVisibility'];
  copy: OperationalDrawerDataTableCopy;
}>): JSX.Element | null {
  if (columns.length === 0) return null;
  const VisibilityIcon = columns.some((column) => !column.visible) ? EyeOff : Eye;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" title={copy.columns} aria-label={copy.columns}>
          <VisibilityIcon aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={copy.columns} className={styles.visibilityList}>
        {columns.map((column) => {
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
  );
}

export function OperationalDrawerDataToolbar({
  model,
  copy,
  children,
}: Readonly<{
  model: DataTable;
  copy: OperationalDrawerDataTableCopy;
  children?: ReactNode;
}>): JSX.Element {
  const densityLabel = model.comfortable ? copy.compact : copy.comfortable;
  const copyLabel = model.selection.isRange ? copy.copyRange : copy.copy;
  return (
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
        {children}
        <ColumnVisibilityMenu columns={model.columnVisibility} copy={copy} />
        <button
          type="button"
          title={densityLabel}
          aria-label={densityLabel}
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
          disabled={!model.selection.canCopy}
          onClick={() => void model.selection.copy()}
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
  );
}
