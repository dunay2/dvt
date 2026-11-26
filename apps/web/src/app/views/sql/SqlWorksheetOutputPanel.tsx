/** Results/history disclosure over existing receipts; restoration never runs the query. */
import { PanelBottomClose } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { SqlWorksheetResults } from './SqlWorksheetResults';
import { SqlWorksheetHistory } from './SqlWorksheetHistory';
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import type { SqlWorksheetState } from './sqlWorksheetState';
import type { useSqlWorksheet } from './useSqlWorksheet';
import styles from './SqlWorksheet.module.css';

export type SqlWorksheetPanel = 'results' | 'history' | null;
type HistoryReadModel = Pick<
  ReturnType<typeof useSqlWorksheet>['history'],
  'data' | 'isFetching' | 'isError' | 'hasNextPage' | 'refetch' | 'fetchNextPage'
>;
type Props = Readonly<{
  state: Omit<SqlWorksheetState, 'insertions'>;
  history: HistoryReadModel;
  canViewHistory: boolean;
  onRestore: (executionId: string) => Promise<void>;
  panel: SqlWorksheetPanel;
  onPanelChange: (panel: SqlWorksheetPanel) => void;
  copy: SqlWorksheetCopy;
  locale: string;
}>;

export function SqlWorksheetOutputPanel({
  state,
  history,
  canViewHistory,
  onRestore,
  panel,
  onPanelChange,
  copy,
  locale,
}: Props): JSX.Element | null {
  if (panel == null) return null;
  const busy = state.pending != null;
  const stale =
    state.execution != null &&
    [
      state.execution.sql !== state.sql,
      state.execution.connectionRef.connectionId !== state.connectionId,
      state.execution.limit !== state.limit,
    ].some(Boolean);
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={panel === 'results'}
          onClick={() => onPanelChange('results')}
        >
          {copy.results}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={panel === 'history'}
          onClick={() => onPanelChange('history')}
        >
          {copy.history}
        </Button>
        <Button
          className={styles.collapse}
          variant="ghost"
          size="sm"
          aria-label={copy.closePanel}
          onClick={() => onPanelChange(null)}
        >
          <PanelBottomClose className={styles.icon} aria-hidden="true" />
        </Button>
      </div>
      {panel === 'results' ? (
        <SqlWorksheetResults
          execution={state.execution}
          result={state.result}
          busy={busy}
          stale={stale}
          failure={state.failure}
          copy={copy}
          locale={locale}
        />
      ) : (
        <SqlWorksheetHistory
          executions={history.data?.pages.flatMap((page) => page.executions) ?? []}
          loading={history.isFetching}
          error={history.isError}
          busy={busy}
          canView={canViewHistory}
          hasMore={history.hasNextPage}
          onRetry={() => {
            void history.refetch();
          }}
          onMore={() => {
            void history.fetchNextPage();
          }}
          onRestore={(id) => {
            onPanelChange('results');
            void onRestore(id);
          }}
          copy={copy}
          locale={locale}
        />
      )}
    </div>
  );
}
