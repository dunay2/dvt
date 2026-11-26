/** Connection/execution chrome and its catalogue recovery affordance. */
import type { ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { SqlWorksheetToolbar, type SqlWorksheetToolbarProps } from './SqlWorksheetToolbar';
import styles from './SqlWorksheet.module.css';

type Props = Readonly<{
  controls: Omit<SqlWorksheetToolbarProps, 'actions'>;
  actions: ReactNode;
  connectionError: boolean;
  onRetryConnections: () => void;
}>;

export function SqlWorksheetHeader({
  controls,
  actions,
  connectionError,
  onRetryConnections,
}: Props): JSX.Element {
  const { copy } = controls;
  return (
    <>
      <SqlWorksheetToolbar {...controls} actions={actions} />
      <div className={styles.statusBar}>
        <h1 className={styles.title}>{copy.title}</h1>
        <span>{copy.readOnly}</span>
      </div>
      {connectionError ? (
        <p className={styles.error} role="alert">
          {copy.connectionsError}
          <Button variant="ghost" size="sm" onClick={onRetryConnections}>
            {copy.retry}
          </Button>
        </p>
      ) : null}
    </>
  );
}
