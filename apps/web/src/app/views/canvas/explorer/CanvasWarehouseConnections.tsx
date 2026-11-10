/** Bind shared connection metadata to the passive project explorer, with an explicit unavailable boundary. */
import { useWarehouseConnectionsQuery } from '../../../queries/warehouseConnectionQueries';
import { useOptionalWarehouseSourceImportPort } from '../../../services/AppServicesContext';
import type { IWarehouseSourceImportPort } from '../../../ports/workspace';
import { useSourceImportLocalization } from '../../../components/sourceImportWizard/copy';
import {
  CanvasExplorerConnections,
  type CanvasExplorerConnectionState,
} from './CanvasExplorerConnections';

type Props = Readonly<{ onManage?: () => void }>;

export function CanvasWarehouseConnections(props: Props): JSX.Element {
  const port = useOptionalWarehouseSourceImportPort();
  return port == null ? (
    <CanvasExplorerConnections state={{ status: 'unavailable' }} {...props} />
  ) : (
    <ConnectedWarehouseConnections port={port} {...props} />
  );
}

function ConnectedWarehouseConnections({
  port,
  onManage,
}: Props & Readonly<{ port: IWarehouseSourceImportPort }>): JSX.Element {
  const query = useWarehouseConnectionsQuery(port);
  const { copy } = useSourceImportLocalization();
  const state: CanvasExplorerConnectionState =
    query.data !== undefined
      ? {
          status: 'ready',
          connections: query.data,
          refreshing: query.isFetching,
          ...(query.isError ? { refreshErrorMessage: copy.loadConnectionsError } : {}),
        }
      : query.isError
        ? { status: 'error', message: copy.loadConnectionsError }
        : { status: query.fetchStatus === 'idle' ? 'idle' : 'loading' };
  return (
    <CanvasExplorerConnections
      state={state}
      {...(onManage == null ? {} : { onManage })}
      onRetry={() => {
        void query.refetch();
      }}
    />
  );
}
