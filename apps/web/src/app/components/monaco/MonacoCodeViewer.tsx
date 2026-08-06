/** Owned concern: load the Monaco code surface behind a route-safe read-only viewer API. */
import { DEFAULT_MONACO_CONTAINER_CLASS_NAME, MonacoViewerFallback } from './MonacoViewerFallback';
import { useMonacoCodeSurface } from './useMonacoCodeSurface';

type MonacoCodeViewerProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  loadingLabel: string;
  path?: string;
  value: string;
}>;

export function MonacoCodeViewer({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  loadingLabel,
  path,
  value,
}: MonacoCodeViewerProps) {
  const MonacoCodeSurface = useMonacoCodeSurface();
  if (MonacoCodeSurface == null) {
    return <MonacoViewerFallback label={loadingLabel} containerClassName={containerClassName} />;
  }

  return (
    <MonacoCodeSurface
      ariaLabel={ariaLabel}
      containerClassName={containerClassName}
      language={language}
      path={path}
      readOnly={true}
      value={value}
    />
  );
}
