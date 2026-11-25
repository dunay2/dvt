/** Compose an independent buffer, protected execution and reusable project discovery. */
import { useState } from 'react';
import { History, PanelBottomClose } from 'lucide-react';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { Button } from '../../components/ui/button';
import { useWarehouseConnectionsQuery } from '../../queries/warehouseConnectionQueries';
import {
  useSqlWorksheetPort,
  useWarehouseSourceImportPort,
} from '../../services/AppServicesContext';
import { useAuthorizationStore } from '../../stores/authorizationStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { CanvasExplorer } from '../canvas/explorer/CanvasExplorer';
import { SqlWorksheetFiles } from '../code/SqlWorksheetFiles';
import { SqlWorksheetConversion } from './SqlWorksheetConversion';
import { SqlWorksheetToolbar } from './SqlWorksheetToolbar';
import { SqlWorksheetMonaco } from './SqlWorksheetMonaco';
import { SqlWorksheetExplorer } from './SqlWorksheetExplorer';
import { SqlWorksheetResults } from './SqlWorksheetResults';
import { SqlWorksheetHistory } from './SqlWorksheetHistory';
import { resolveSqlWorksheetCopy } from './sqlWorksheetCopy';
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import { useSqlWorksheet } from './useSqlWorksheet';
import { useSqlWorksheetCatalogue } from './useSqlWorksheetCatalogue';
import styles from './SqlWorksheet.module.css';
import { useSqlWorksheetReferences } from './useSqlWorksheetReferences';

const NO_CONNECTIONS: readonly import('./sqlWorksheet.types').SqlWorksheetConnection[] = [];
type Props = Readonly<{ scope: WorkspaceScope; scopeKey: string }>;
type Worksheet = ReturnType<typeof useSqlWorksheet>;
type Panel = 'results' | 'history' | null;

function SqlWorksheetOutputPanel({
  worksheet,
  panel,
  onPanelChange,
  copy,
  locale,
}: Readonly<{
  worksheet: Worksheet;
  panel: Panel;
  onPanelChange: (panel: Panel) => void;
  copy: SqlWorksheetCopy;
  locale: string;
}>): JSX.Element | null {
  if (panel == null) return null;
  const { state, history } = worksheet;
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
          canView={worksheet.canViewHistory}
          hasMore={history.hasNextPage}
          onRetry={() => {
            void history.refetch();
          }}
          onMore={() => {
            void history.fetchNextPage();
          }}
          onRestore={(id) => {
            onPanelChange('results');
            void worksheet.restore(id);
          }}
          copy={copy}
          locale={locale}
        />
      )}
    </div>
  );
}

function SqlWorksheetNotices({
  worksheet,
  references,
  copy,
}: Readonly<{
  worksheet: Worksheet;
  references: ReturnType<typeof useSqlWorksheetReferences>;
  copy: SqlWorksheetCopy;
}>): JSX.Element {
  return (
    <>
      {!worksheet.canExecute ? <p className={styles.message}>{copy.denied}</p> : null}
      {worksheet.tooLong ? (
        <p className={styles.error} role="alert">
          {copy.tooLong}
        </p>
      ) : null}
      {worksheet.state.connectionId != null && worksheet.connection == null ? (
        <p className={styles.error} role="status">
          {copy.noConnection}
        </p>
      ) : null}
      {references.pending ? (
        <p className={styles.message} role="status">
          {copy.projectionPending}
        </p>
      ) : null}
      {references.failed ? (
        <p className={styles.error} role="alert">
          {copy.insertionFailed}
        </p>
      ) : null}
    </>
  );
}

export function SqlWorksheet(props: Props): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveSqlWorksheetCopy(language);
  const authorization = useAuthorizationStore((state) => state.userPermissions);
  const canExecute = authorization.canExecuteSql === true;
  const canViewHistory = authorization.canViewSqlHistory === true;
  const [panel, setPanel] = useState<Panel>(null);
  const warehouse = useWarehouseSourceImportPort();
  const connections = useWarehouseConnectionsQuery(warehouse);
  const port = useSqlWorksheetPort();
  const worksheet = useSqlWorksheet({
    scopeKey: props.scopeKey,
    port,
    canExecute,
    canViewHistory,
    historyOpen: panel === 'history',
    connections: connections.data ?? NO_CONNECTIONS,
  });
  const explorerOpen = useUiLayoutStore((state) => state.canvasExplorer.mode === 'expanded');
  const dispatchExplorer = useUiLayoutStore((state) => state.dispatchCanvasExplorer);
  const catalogue = useSqlWorksheetCatalogue(props.scope, worksheet.connection, explorerOpen);
  const references = useSqlWorksheetReferences(props, worksheet, catalogue);
  const { state } = worksheet;
  const busy = state.pending != null;
  const run = () => {
    if (worksheet.canRun) {
      setPanel('results');
      void worksheet.execute();
    }
  };
  return (
    <div className={styles.root} data-slot="sql-worksheet">
      <SqlWorksheetToolbar
        copy={copy}
        connections={connections.data ?? NO_CONNECTIONS}
        connectionId={state.connectionId}
        onConnectionChange={worksheet.setConnection}
        busy={busy}
        canRun={worksheet.canRun}
        limit={state.limit}
        onLimitChange={worksheet.setLimit}
        onRun={run}
        onToggleExplorer={() => dispatchExplorer({ type: 'toggle' })}
        actions={
          <>
            <SqlWorksheetFiles scope={props.scope} sql={state.sql} onSqlChange={worksheet.setSql} />
            <SqlWorksheetConversion
              scope={props.scope}
              sql={state.sql}
              connection={worksheet.connection}
              record={catalogue.record}
              insertions={state.insertions}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={copy.history}
              aria-pressed={panel === 'history'}
              onClick={() => setPanel(panel === 'history' ? null : 'history')}
            >
              <History className={styles.icon} aria-hidden="true" />
              {copy.history}
            </Button>
          </>
        }
      />
      <div className={styles.statusBar}>
        <h1 className={styles.title}>{copy.title}</h1>
        <span>{copy.readOnly}</span>
      </div>
      {connections.isError ? (
        <p className={styles.error} role="alert">
          {copy.connectionsError}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void connections.refetch();
            }}
          >
            {copy.retry}
          </Button>
        </p>
      ) : null}
      <SqlWorksheetNotices worksheet={worksheet} references={references} copy={copy} />
      <div className={styles.workbench}>
        <CanvasExplorer
          openerId="sql-worksheet-explorer-toggle"
          elements={
            <SqlWorksheetExplorer
              catalogue={catalogue}
              scopeKey={props.scopeKey}
              enabled={worksheet.connection?.type === 'postgres'}
              busy={references.pending}
              onReference={(value) => {
                void references.insert(value);
              }}
              copy={copy}
            />
          }
        >
          <main className={styles.main}>
            <SqlWorksheetMonaco
              ref={references.editor}
              scopeKey={props.scopeKey}
              dragScopeKey={props.scopeKey}
              sql={state.sql}
              onChange={worksheet.setSql}
              onRun={run}
              onReference={(value) => {
                void references.insert(value);
              }}
              copy={copy}
            />
            <SqlWorksheetOutputPanel
              worksheet={worksheet}
              panel={panel}
              onPanelChange={setPanel}
              copy={copy}
              locale={language}
            />
          </main>
        </CanvasExplorer>
      </div>
    </div>
  );
}
