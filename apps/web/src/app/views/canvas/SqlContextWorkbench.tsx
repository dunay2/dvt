/** Owned concern: bind an optional selected project file to the canonical Code workbench. */
import { lazy, Suspense } from 'react';

import type { CodeViewFileScope } from '../CodeView';
import { sqlContextWorkbenchVisualTokens as tokens } from './sqlContextWorkbenchVisualTokens';

const CodeView = lazy(() => import('../CodeView'));

export type SqlContextWorkbenchProps = Readonly<{
  fileScope?: CodeViewFileScope;
  loadingMessage: string;
}>;

export function SqlContextWorkbench({
  fileScope,
  loadingMessage,
}: SqlContextWorkbenchProps): JSX.Element {
  return (
    <Suspense fallback={<div className={tokens.loading}>{loadingMessage}</div>}>
      <CodeView publishRouteBootstrap={false} fileScope={fileScope} />
    </Suspense>
  );
}
