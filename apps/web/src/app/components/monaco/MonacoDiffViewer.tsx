/** Owned concern: lazy-load the Monaco DiffEditor surface behind a route-safe read-only viewer API. */
import { Suspense, lazy } from 'react';

import { DEFAULT_MONACO_CONTAINER_CLASS_NAME, MonacoViewerFallback } from './MonacoViewerFallback';

const MonacoDiffSurface = lazy(() => import('./MonacoDiffSurface'));

type MonacoDiffViewerProps = Readonly<{
  containerClassName?: string;
  language: string;
  loadingLabel?: string;
  modified: string;
  modifiedLabel: string;
  original: string;
  originalLabel: string;
}>;

export function MonacoDiffViewer({
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  loadingLabel = 'Loading Monaco diff...',
  modified,
  modifiedLabel,
  original,
  originalLabel,
}: MonacoDiffViewerProps) {
  return (
    <Suspense
      fallback={
        <MonacoViewerFallback label={loadingLabel} containerClassName={containerClassName} />
      }
    >
      <MonacoDiffSurface
        ariaLabel={`${originalLabel} to ${modifiedLabel} diff`}
        containerClassName={containerClassName}
        language={language}
        modified={modified}
        original={original}
      />
    </Suspense>
  );
}
