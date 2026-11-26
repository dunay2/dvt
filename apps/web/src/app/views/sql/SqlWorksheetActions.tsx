/** Explicit file/conversion actions and history disclosure; never execute SQL. */
import { History } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { SqlWorksheetFiles } from '../code/SqlWorksheetFiles';
import { SqlWorksheetConversion } from './SqlWorksheetConversion';
import type { SqlWorksheetConversionProps } from './sqlWorksheet.types';
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import styles from './SqlWorksheet.module.css';

type Props = Readonly<{
  conversion: SqlWorksheetConversionProps;
  onSqlChange: (sql: string) => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
  copy: Pick<SqlWorksheetCopy, 'history'>;
}>;

export function SqlWorksheetActions({
  conversion,
  onSqlChange,
  historyOpen,
  onToggleHistory,
  copy,
}: Props): JSX.Element {
  return (
    <>
      <SqlWorksheetFiles scope={conversion.scope} sql={conversion.sql} onSqlChange={onSqlChange} />
      <SqlWorksheetConversion {...conversion} />
      <Button
        size="sm"
        variant="ghost"
        aria-label={copy.history}
        aria-pressed={historyOpen}
        onClick={onToggleHistory}
      >
        <History className={styles.icon} aria-hidden="true" />
        {copy.history}
      </Button>
    </>
  );
}
