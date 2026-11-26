/** Present independent connection and execution controls with shared action slots. */
import type { ReactNode } from 'react';
import { LoaderCircle, PanelLeft, Play } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { SqlWorksheetConnection } from './sqlWorksheet.types';
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import styles from './SqlWorksheet.module.css';

export type SqlWorksheetToolbarProps = Readonly<{
  copy: SqlWorksheetCopy;
  connections: readonly SqlWorksheetConnection[];
  connectionId: string | null;
  onConnectionChange: (id: string | null) => void;
  busy: boolean;
  canRun: boolean;
  limit: number;
  onLimitChange: (limit: number) => void;
  onRun: () => void;
  onToggleExplorer: () => void;
  actions?: ReactNode;
}>;

function SqlWorksheetConnectionPicker({
  copy,
  connections,
  connectionId,
  onConnectionChange,
}: Pick<
  SqlWorksheetToolbarProps,
  'copy' | 'connections' | 'connectionId' | 'onConnectionChange'
>): JSX.Element {
  return (
    <label className={styles.field}>
      <span>{copy.connection}</span>
      <select
        className={styles.select}
        value={connectionId ?? ''}
        onChange={(event) => {
          const id = event.target.value;
          if (id === '') onConnectionChange(null);
          else if (connections.some((item) => item.id === id && item.type === 'postgres'))
            onConnectionChange(id);
        }}
      >
        <option value="">{copy.chooseConnection}</option>
        {connections.map((connection) => (
          <option
            key={connection.id}
            value={connection.id}
            disabled={connection.type !== 'postgres'}
          >
            {connection.name} · {connection.database} ({connection.type})
          </option>
        ))}
      </select>
    </label>
  );
}

export function SqlWorksheetToolbar(props: SqlWorksheetToolbarProps): JSX.Element {
  const { copy, busy, canRun, limit, onLimitChange, onRun, onToggleExplorer, actions } = props;
  const selected = props.connections.find((connection) => connection.id === props.connectionId);
  const unavailable = [busy, !canRun, selected?.type !== 'postgres'].some(Boolean);
  return (
    <div className={styles.toolbar} role="toolbar" aria-label={copy.toolbar}>
      <Button
        id="sql-worksheet-explorer-toggle"
        variant="ghost"
        size="sm"
        onClick={onToggleExplorer}
        aria-label={copy.explorer}
      >
        <PanelLeft aria-hidden="true" className={styles.icon} />
      </Button>
      <SqlWorksheetConnectionPicker {...props} />
      <label className={styles.field}>
        <span>{copy.rowLimit}</span>
        <input
          className={styles.limit}
          type="number"
          min={1}
          max={1000}
          value={limit}
          onChange={(event) => {
            if (event.target.validity.valid) onLimitChange(event.target.valueAsNumber);
          }}
        />
      </label>
      <Button size="sm" disabled={unavailable} onClick={onRun} title={copy.runHint}>
        {busy ? (
          <LoaderCircle aria-hidden="true" className={styles.pendingIcon} />
        ) : (
          <Play aria-hidden="true" className={styles.icon} />
        )}
        {busy ? copy.running : copy.run}
      </Button>
      <div className={styles.fileActions}>{actions}</div>
    </div>
  );
}
