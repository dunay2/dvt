/** Own the independent worksheet lifetime for the selected protected workspace. */
import { useSyncExternalStore } from 'react';
import { useSessionContext } from '../services/AppServicesContext';
import { SqlWorksheet } from './sql/SqlWorksheet';

export default function SqlView(): JSX.Element {
  const session = useSessionContext();
  const scope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot,
    session.getWorkspaceScopeSnapshot
  );
  const key = JSON.stringify([
    scope.tenantId,
    scope.projectId,
    scope.environmentId,
    scope.targetAdapter,
  ]);
  return <SqlWorksheet key={key} scope={scope} scopeKey={key} />;
}
