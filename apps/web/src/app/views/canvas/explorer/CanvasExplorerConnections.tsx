/** Owned concern: display shared connection metadata without acquiring data or testing health. */
import { ChevronRight, Database, Settings2 } from 'lucide-react';
import { useId, useState } from 'react';
import type { WarehouseConnection } from '../../../ports/workspace';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerSection } from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import styles from './CanvasExplorer.module.css';

export type CanvasExplorerConnectionState =
  | Readonly<{ status: 'unavailable' | 'idle' | 'loading' }>
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{
      status: 'ready';
      connections: readonly Readonly<
        Pick<WarehouseConnection, 'id' | 'name' | 'type' | 'database'>
      >[];
      refreshing: boolean;
      refreshErrorMessage?: string;
    }>;

export type CanvasExplorerConnectionsProps = Readonly<{
  state: CanvasExplorerConnectionState;
  onManage?: () => void;
  onRetry?: () => void;
}>;

export function CanvasExplorerConnections({
  state,
  onManage,
  onRetry,
}: CanvasExplorerConnectionsProps): JSX.Element {
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((value) => value.language));
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());
  const id = useId();
  const error =
    state.status === 'error'
      ? state.message
      : state.status === 'ready'
        ? state.refreshErrorMessage
        : undefined;
  return (
    <CanvasExplorerSection
      title={copy.connections}
      slot="canvas-explorer-connections"
      count={state.status === 'ready' ? state.connections.length : undefined}
      countSlot="canvas-explorer-connection-count"
      open={open}
      onOpenChange={setOpen}
      busy={state.status === 'loading' || (state.status === 'ready' && state.refreshing)}
      action={
        <button
          type="button"
          className={styles.headerAction}
          aria-label={copy.manageConnections}
          title={copy.manageConnections}
          disabled={onManage == null}
          onClick={() => onManage?.()}
        >
          <Settings2 aria-hidden="true" />
        </button>
      }
    >
      {state.status === 'unavailable' || state.status === 'idle' ? (
        <p className={styles.empty}>
          {state.status === 'unavailable' ? copy.connectionsUnavailable : copy.connectionsIdle}
        </p>
      ) : null}
      {state.status === 'loading' ? (
        <p className={styles.empty} role="status">
          {copy.connectionsLoading}
        </p>
      ) : null}
      {state.status === 'ready' ? (
        <>
          {state.refreshing ? (
            <p className={styles.empty} role="status">
              {copy.connectionsRefreshing}
            </p>
          ) : null}
          <ul className={styles.list}>
            {state.connections.map((connection) => {
              const expanded = expandedIds.has(connection.id);
              const detailsId = `${id}-${encodeURIComponent(connection.id)}-details`;
              return (
                <li key={connection.id}>
                  <div className={styles.itemRow} data-selected={selectedId === connection.id}>
                    <button
                      type="button"
                      className={styles.item}
                      aria-pressed={selectedId === connection.id}
                      aria-label={connection.name}
                      onClick={() => setSelectedId(connection.id)}
                    >
                      <span className={styles.modelIcon}>
                        <Database aria-hidden="true" />
                      </span>
                      <span className={styles.itemText}>
                        <span className={styles.name}>{connection.name}</span>
                        <span className={styles.description}>{connection.type}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.detailsToggle}
                      aria-label={`${copy.details}: ${connection.name}`}
                      aria-expanded={expanded}
                      aria-controls={detailsId}
                      onClick={() =>
                        setExpandedIds((previous) => {
                          const next = new Set(previous);
                          if (next.has(connection.id)) next.delete(connection.id);
                          else next.add(connection.id);
                          return next;
                        })
                      }
                    >
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </div>
                  <dl id={detailsId} className={styles.details} hidden={!expanded}>
                    <div>
                      <dt>{copy.database}</dt>
                      <dd>{connection.database}</dd>
                    </div>
                    <div>
                      <dt>{copy.type}</dt>
                      <dd>{connection.type}</dd>
                    </div>
                    <div>
                      <dt>{copy.identifier}</dt>
                      <dd>{connection.id}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
          {state.connections.length === 0 ? (
            <p className={styles.empty}>{copy.connectionsEmpty}</p>
          ) : null}
        </>
      ) : null}
      {error ? (
        <div className={styles.empty}>
          <p role="alert">{error}</p>
          {onRetry ? (
            <button type="button" className={styles.retry} onClick={() => onRetry()}>
              {copy.retry}
            </button>
          ) : null}
        </div>
      ) : null}
    </CanvasExplorerSection>
  );
}
