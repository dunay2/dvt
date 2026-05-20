/** Owned concern: lazy-load the Monaco code surface behind a route-local editable buffer API. */
import { Suspense, lazy } from 'react';

import { DEFAULT_MONACO_CONTAINER_CLASS_NAME, MonacoViewerFallback } from './MonacoViewerFallback';

const MonacoCodeSurface = lazy(() => import('./MonacoCodeSurface'));

type MonacoCodeEditorProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  loadingLabel?: string;
  onChange: (value: string) => void;
  path?: string;
  value: string;
}>;

export function MonacoCodeEditor({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  loadingLabel = 'Loading Monaco editor...',
  onChange,
  path,
  value,
}: MonacoCodeEditorProps) {
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
        onChange={onChange}
        path={path}
        readOnly={false}
        value={value}
      />
    </Suspense>
  );
}
