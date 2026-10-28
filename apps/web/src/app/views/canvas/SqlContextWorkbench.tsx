/** Owned concern: bind an optional selected project file to the canonical Code workbench. */
import { forwardRef } from 'react';

import CodeView, {
  type CodeViewFileScope,
  type CodeViewHandle,
  type CodeViewProps,
} from '../CodeView';
import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';
import type { CodeWorkingTreeReconciliationOutcome } from '../code/codeWorkingTreeSyncModel';

export type SqlContextWorkbenchProps = Readonly<{
  fileScope?: CodeViewFileScope;
  initialPath?: string;
  fileSelectionRequest?: CodeViewProps['fileSelectionRequest'];
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>;

export type SqlContextWorkbenchHandle = CodeViewHandle;

export const SqlContextWorkbench = forwardRef<SqlContextWorkbenchHandle, SqlContextWorkbenchProps>(
  function SqlContextWorkbench(
    {
      fileScope,
      initialPath,
      fileSelectionRequest,
      reconcilePersistedFile,
    }: SqlContextWorkbenchProps,
    ref
  ): JSX.Element {
    return (
      <CodeView
        ref={ref}
        publishRouteBootstrap={false}
        fileScope={fileScope}
        initialPath={initialPath}
        fileSelectionRequest={fileSelectionRequest}
        reconcilePersistedFile={reconcilePersistedFile}
      />
    );
  }
);
