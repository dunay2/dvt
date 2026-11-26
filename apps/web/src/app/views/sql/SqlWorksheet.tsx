/** Own the scoped worksheet lifetime and compose independently bounded UI concerns. */
import { useState } from 'react';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { useWarehouseConnectionsQuery } from '../../queries/warehouseConnectionQueries';
import {
  useSqlWorksheetPort,
  useWarehouseSourceImportPort,
} from '../../services/AppServicesContext';
import { useAuthorizationStore } from '../../stores/authorizationStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { SqlWorksheetHeader } from './SqlWorksheetHeader';
import { SqlWorksheetActions } from './SqlWorksheetActions';
import { SqlWorksheetWorkbench } from './SqlWorksheetWorkbench';
import { SqlWorksheetOutputPanel, type SqlWorksheetPanel } from './SqlWorksheetOutputPanel';
import { SqlWorksheetNotices } from './SqlWorksheetNotices';
import { resolveSqlWorksheetCopy } from './sqlWorksheetCopy';
import type { SqlWorksheetConnection, SqlWorksheetDragReference } from './sqlWorksheet.types';
import { useSqlWorksheet } from './useSqlWorksheet';
import { useSqlWorksheetCatalogue } from './useSqlWorksheetCatalogue';
import { useSqlWorksheetReferences } from './useSqlWorksheetReferences';
import styles from './SqlWorksheet.module.css';

const NO_CONNECTIONS: readonly SqlWorksheetConnection[] = [];
type Props = Readonly<{ scope: WorkspaceScope; scopeKey: string }>;

export function SqlWorksheet(props: Props): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveSqlWorksheetCopy(language);
  const authorization = useAuthorizationStore((state) => state.userPermissions);
  const [panel, setPanel] = useState<SqlWorksheetPanel>(null);
  const warehouse = useWarehouseSourceImportPort();
  const connections = useWarehouseConnectionsQuery(warehouse);
  const port = useSqlWorksheetPort();
  const worksheet = useSqlWorksheet({
    scopeKey: props.scopeKey,
    port,
    canExecute: authorization.canExecuteSql === true,
    canViewHistory: authorization.canViewSqlHistory === true,
    historyOpen: panel === 'history',
    connections: connections.data ?? NO_CONNECTIONS,
  });
  const explorerOpen = useUiLayoutStore((state) => state.canvasExplorer.mode === 'expanded');
  const dispatchExplorer = useUiLayoutStore((state) => state.dispatchCanvasExplorer);
  const catalogue = useSqlWorksheetCatalogue(props.scope, worksheet.connection, explorerOpen);
  const references = useSqlWorksheetReferences(props, worksheet, catalogue);
  const { state } = worksheet;
  const run = (): void => {
    if (!worksheet.canRun) return;
    setPanel('results');
    void worksheet.execute();
  };
  const insertReference = (value: SqlWorksheetDragReference): void => {
    void references.insert(value);
  };
  return (
    <div className={styles.root} data-slot="sql-worksheet">
      <SqlWorksheetHeader
        controls={{
          copy,
          connections: connections.data ?? NO_CONNECTIONS,
          connectionId: state.connectionId,
          onConnectionChange: worksheet.setConnection,
          busy: state.pending != null,
          canRun: worksheet.canRun,
          limit: state.limit,
          onLimitChange: worksheet.setLimit,
          onRun: run,
          onToggleExplorer: () => dispatchExplorer({ type: 'toggle' }),
        }}
        actions={
          <SqlWorksheetActions
            conversion={{
              scope: props.scope,
              sql: state.sql,
              connection: worksheet.connection,
              record: catalogue.record,
              insertions: state.insertions,
            }}
            onSqlChange={worksheet.setSql}
            historyOpen={panel === 'history'}
            onToggleHistory={() => setPanel(panel === 'history' ? null : 'history')}
            copy={copy}
          />
        }
        connectionError={connections.isError}
        onRetryConnections={() => {
          void connections.refetch();
        }}
      />
      <SqlWorksheetNotices
        denied={!worksheet.canExecute}
        tooLong={worksheet.tooLong}
        connectionMissing={state.connectionId != null && worksheet.connection == null}
        insertionPending={references.pending}
        insertionFailed={references.failed}
        copy={copy}
      />
      <SqlWorksheetWorkbench
        editor={{
          ref: references.editor,
          scopeKey: props.scopeKey,
          dragScopeKey: props.scopeKey,
          sql: state.sql,
          onChange: worksheet.setSql,
          onRun: run,
          onReference: insertReference,
          copy,
        }}
        explorer={{
          catalogue,
          scopeKey: props.scopeKey,
          enabled: worksheet.connection?.type === 'postgres',
          busy: references.pending,
          onReference: insertReference,
          copy,
        }}
      >
        <SqlWorksheetOutputPanel
          state={state}
          history={worksheet.history}
          canViewHistory={worksheet.canViewHistory}
          onRestore={worksheet.restore}
          panel={panel}
          onPanelChange={setPanel}
          copy={copy}
          locale={language}
        />
      </SqlWorksheetWorkbench>
    </div>
  );
}
