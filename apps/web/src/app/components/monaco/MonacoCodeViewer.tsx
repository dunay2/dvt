import { Suspense, lazy } from 'react';

import {
  DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  MonacoViewerFallback,
} from './MonacoViewerFallback';

const MonacoCodeSurface = lazy(() => import('./MonacoCodeSurface'));

type MonacoCodeViewerProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  loadingLabel?: string;
  path?: string;
  value: string;
}>;

export function MonacoCodeViewer({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  loadingLabel = 'Loading Monaco viewer...',
  path,
  value,
}: MonacoCodeViewerProps) {
  return (
    <Suspense
      fallback={
        <MonacoViewerFallback label={loadingLabel} containerClassName={containerClassName} />
      }
    >
      <MonacoCodeSurface
        ariaLabel={ariaLabel}
        containerClassName={containerClassName}
        language={language}
        path={path}
        value={value}
      />
    </Suspense>
  );
}
