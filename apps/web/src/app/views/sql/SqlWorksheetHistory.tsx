/** Recover immutable execution SQL and metadata without replaying the query. */
import type { WorkspaceSqlExecution } from '@dvt/contracts';
import { Button } from '../../components/ui/button';
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import { formatSqlWorksheetDuration } from './sqlWorksheetCopy';
import styles from './SqlWorksheet.module.css';

export function SqlWorksheetHistory({
  executions,
  loading,
  error,
  busy,
  canView,
  hasMore,
  onRetry,
  onMore,
  onRestore,
  copy,
  locale,
}: Readonly<{
  executions: readonly WorkspaceSqlExecution[];
  loading: boolean;
  error: boolean;
  busy: boolean;
  canView: boolean;
  hasMore: boolean;
  onRetry: () => void;
  onMore: () => void;
  onRestore: (executionId: string) => void;
  copy: SqlWorksheetCopy;
  locale: string;
}>): JSX.Element {
  if (!canView) return <p className={styles.message}>{copy.historyDenied}</p>;
  return (
    <section className={styles.history} aria-label={copy.history} aria-busy={loading}>
      <div className={styles.panelActions}>
        <Button size="sm" variant="ghost" onClick={onRetry} disabled={loading}>
          {copy.refreshHistory}
        </Button>
      </div>
      {error ? (
        <p role="alert" className={styles.error}>
          {copy.historyError}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className={styles.message}>
          {copy.loading}
        </p>
      ) : null}
      {!loading && !error && executions.length === 0 ? (
        <p className={styles.message}>{copy.emptyHistory}</p>
      ) : null}
      <ol className={styles.historyList}>
        {executions.map((execution) => (
          <li key={execution.executionId} className={styles.historyEntry}>
            <div className={styles.historyHeading}>
              <strong>{execution.connectionName}</strong>
              <span>
                {execution.status === 'succeeded' ? copy.succeeded : copy.failed} ·{' '}
                {formatSqlWorksheetDuration(execution.durationMs, locale)}
              </span>
              <time dateTime={execution.startedAt}>
                {new Date(execution.startedAt).toLocaleString(locale)}
              </time>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onRestore(execution.executionId)}
                aria-label={`${copy.restore}: ${execution.executionId}`}
              >
                {copy.restore}
              </Button>
            </div>
            <pre className={styles.historySql}>{execution.sql}</pre>
          </li>
        ))}
      </ol>
      {hasMore ? (
        <Button size="sm" variant="outline" onClick={onMore} disabled={loading}>
          {copy.loadMore}
        </Button>
      ) : null}
    </section>
  );
}
