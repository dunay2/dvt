/** Present actual completed SQL facts and bounded rows through the existing grid. */
import type { WorkspaceSqlExecution, WorkspaceSqlResult } from '@dvt/contracts';
import { OperationalDrawerDataTable } from '../../components/shell/OperationalDrawerDataTable';
import type { SqlWorksheetFailure } from '../../ports/sqlWorksheet';
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import { formatSqlWorksheetDuration } from './sqlWorksheetCopy';
import styles from './SqlWorksheet.module.css';

function SqlWorksheetExecutionFacts({
  execution,
  copy,
  locale,
}: Readonly<{
  execution: WorkspaceSqlExecution;
  copy: SqlWorksheetCopy;
  locale: string;
}>): JSX.Element {
  const fields = [
    [copy.status, execution.status === 'succeeded' ? copy.succeeded : copy.failed],
    [copy.connection, execution.connectionName],
    [copy.duration, formatSqlWorksheetDuration(execution.durationMs, locale)],
    [copy.rows, String(execution.rowCount)],
    [copy.startedAt, new Date(execution.startedAt).toLocaleString(locale)],
  ];
  return (
    <div className={styles.executionFacts}>
      <dl className={styles.facts}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <details className={styles.metadata}>
        <summary>{copy.metadata}</summary>
        <dl className={styles.facts}>
          <div>
            <dt>{copy.executionId}</dt>
            <dd>{execution.executionId}</dd>
          </div>
          <div>
            <dt>{copy.principal}</dt>
            <dd>{execution.principalId}</dd>
          </div>
          <div>
            <dt>{copy.connection}</dt>
            <dd>
              {execution.connectionRef.connectionId} ({execution.connectionRef.provider})
            </dd>
          </div>
          <div>
            <dt>{copy.rowLimit}</dt>
            <dd>{execution.limit}</dd>
          </div>
          <div>
            <dt>{copy.finishedAt}</dt>
            <dd>{new Date(execution.finishedAt).toLocaleString(locale)}</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}

export function SqlWorksheetResults({
  execution,
  result,
  busy,
  stale,
  failure,
  copy,
  locale,
}: Readonly<{
  execution: WorkspaceSqlExecution | null;
  result: WorkspaceSqlResult | null;
  busy: boolean;
  stale: boolean;
  failure: SqlWorksheetFailure | null;
  copy: SqlWorksheetCopy;
  locale: string;
}>): JSX.Element {
  return (
    <section
      className={styles.results}
      aria-label={copy.results}
      aria-busy={busy}
      data-slot="sql-worksheet-results"
    >
      {failure == null ? null : (
        <p role="alert" className={styles.error}>
          {failure === 'denied' ? copy.denied : copy.queryError}
        </p>
      )}
      {execution == null ? (
        <p role="status" className={styles.message}>
          {busy ? copy.running : copy.emptyResults}
        </p>
      ) : (
        <>
          <SqlWorksheetExecutionFacts execution={execution} copy={copy} locale={locale} />
          {stale ? (
            <p role="status" className={styles.message}>
              {copy.staleResults}
            </p>
          ) : null}
          {execution.status === 'failed' ? (
            <p role="alert" className={styles.error}>
              {execution.error.message}
            </p>
          ) : result == null ? (
            <p className={styles.message}>{copy.historyRows}</p>
          ) : (
            <OperationalDrawerDataTable
              caption={copy.results}
              nullValueLabel={copy.nullValue}
              columns={result.columns}
              rows={result.rows}
            />
          )}
          {execution.truncated ? <p className={styles.message}>{copy.truncated}</p> : null}
        </>
      )}
    </section>
  );
}
