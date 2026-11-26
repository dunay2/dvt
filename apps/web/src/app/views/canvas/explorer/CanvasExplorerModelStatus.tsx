/**
 * Owned concern: expose catalogue progress and failures without displacing populated rows.
 * @baseline ADR-0069: status presentation does not acquire or authorize model definitions.
 * @decision Reserve one header indicator and expose its single live message on hover or focus.
 * @consequence Refreshing an existing catalogue retains search geometry and announcements.
 * @version 1.0.0
 */
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import styles from './CanvasExplorer.module.css';

export function CanvasExplorerModelStatus({
  status,
  pending,
  label,
}: Readonly<{ status?: ReactNode; pending: boolean; label: string }>): JSX.Element {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  return (
    <div
      className={styles.modelStatus}
      data-slot="canvas-explorer-model-status"
      data-state={status == null ? 'ready' : pending ? 'loading' : 'error'}
      data-dismissed={dismissed}
      role={status == null ? undefined : 'group'}
      tabIndex={status == null ? -1 : 0}
      aria-label={status == null ? undefined : label}
      aria-describedby={status == null ? undefined : id}
      onPointerEnter={() => setDismissed(false)}
      onFocus={() => setDismissed(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setDismissed(true);
      }}
    >
      {status == null ? null : (
        <>
          <LoaderCircle className={styles.modelStatusLoading} aria-hidden="true" />
          <CircleAlert className={styles.modelStatusError} aria-hidden="true" />
        </>
      )}
      <div id={id} className={styles.modelStatusMessage}>
        {status}
      </div>
    </div>
  );
}
