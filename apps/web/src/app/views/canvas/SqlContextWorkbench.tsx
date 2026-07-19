/** Owned concern: bind an optional selected project file to the canonical Code workbench. */
import { forwardRef, lazy, Suspense } from 'react';

import type { CodeViewFileScope, CodeViewHandle } from '../CodeView';
import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';
import type { CodeWorkingTreeReconciliationOutcome } from '../code/codeWorkingTreeSyncModel';
import { sqlContextWorkbenchVisualTokens as tokens } from './sqlContextWorkbenchVisualTokens';

const CodeView = lazy(() => import('../CodeView'));

export type SqlContextWorkbenchProps = Readonly<{
  fileScope?: CodeViewFileScope;
  loadingMessage: string;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>;

export type SqlContextWorkbenchHandle = CodeViewHandle;

export const SqlContextWorkbench = forwardRef<SqlContextWorkbenchHandle, SqlContextWorkbenchProps>(
  function SqlContextWorkbench(
    { fileScope, loadingMessage, reconcilePersistedFile }: SqlContextWorkbenchProps,
    ref
  ): JSX.Element {
    return (
      <Suspense fallback={<div className={tokens.loading}>{loadingMessage}</div>}>
        <CodeView
          ref={ref}
          publishRouteBootstrap={false}
          fileScope={fileScope}
          reconcilePersistedFile={reconcilePersistedFile}
        />
      </Suspense>
    );
  }
);
