/** Owned concern: load the Monaco code surface behind an editable working-tree API. */
import { DEFAULT_MONACO_CONTAINER_CLASS_NAME, MonacoViewerFallback } from './MonacoViewerFallback';
import { useMonacoCodeSurface } from './useMonacoCodeSurface';

type MonacoCodeEditorProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  loadingLabel: string;
  onChange: (value: string) => void;
  path?: string;
  readOnly?: boolean;
  value: string;
}>;

export function MonacoCodeEditor({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  loadingLabel,
  onChange,
  path,
  readOnly = false,
  value,
}: MonacoCodeEditorProps) {
  const MonacoCodeSurface = useMonacoCodeSurface();
  if (MonacoCodeSurface == null) {
    return <MonacoViewerFallback label={loadingLabel} containerClassName={containerClassName} />;
  }

  return (
    <MonacoCodeSurface
      ariaLabel={ariaLabel}
      containerClassName={containerClassName}
      language={language}
      onChange={onChange}
      path={path}
      readOnly={readOnly}
      value={value}
    />
  );
}
