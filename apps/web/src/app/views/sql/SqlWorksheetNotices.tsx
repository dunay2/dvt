/** Authorization, connection and insertion notices without owning requests. */
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import styles from './SqlWorksheet.module.css';

type Props = Readonly<{
  denied: boolean;
  tooLong: boolean;
  connectionMissing: boolean;
  insertionPending: boolean;
  insertionFailed: boolean;
  copy: Pick<
    SqlWorksheetCopy,
    'denied' | 'tooLong' | 'noConnection' | 'projectionPending' | 'insertionFailed'
  >;
}>;

export function SqlWorksheetNotices({
  denied,
  tooLong,
  connectionMissing,
  insertionPending,
  insertionFailed,
  copy,
}: Props): JSX.Element {
  return (
    <>
      {denied ? <p className={styles.message}>{copy.denied}</p> : null}
      {tooLong ? (
        <p className={styles.error} role="alert">
          {copy.tooLong}
        </p>
      ) : null}
      {connectionMissing ? (
        <p className={styles.error} role="status">
          {copy.noConnection}
        </p>
      ) : null}
      {insertionPending ? (
        <p className={styles.message} role="status">
          {copy.projectionPending}
        </p>
      ) : null}
      {insertionFailed ? (
        <p className={styles.error} role="alert">
          {copy.insertionFailed}
        </p>
      ) : null}
    </>
  );
}
