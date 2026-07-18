/** Owned concern: bind an optional selected project file to the canonical Code workbench. */
import { forwardRef, lazy, Suspense } from 'react';

import type { CodeViewFileScope, CodeViewHandle } from '../CodeView';
import type { WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { sqlContextWorkbenchVisualTokens as tokens } from './sqlContextWorkbenchVisualTokens';

const CodeView = lazy(() => import('../CodeView'));

export type SqlContextWorkbenchProps = Readonly<{
  fileScope?: CodeViewFileScope;
  loadingMessage: string;
  onFileSynchronized?: (receipt: WorkspaceFileSaveReceipt) => Promise<void>;
}>;

export type SqlContextWorkbenchHandle = CodeViewHandle;

export const SqlContextWorkbench = forwardRef<SqlContextWorkbenchHandle, SqlContextWorkbenchProps>(
  function SqlContextWorkbench(
    { fileScope, loadingMessage, onFileSynchronized }: SqlContextWorkbenchProps,
    ref
  ): JSX.Element {
    return (
      <Suspense fallback={<div className={tokens.loading}>{loadingMessage}</div>}>
        <CodeView
          ref={ref}
          publishRouteBootstrap={false}
          fileScope={fileScope}
          onFileSynchronized={onFileSynchronized}
        />
      </Suspense>
    );
  }
);
