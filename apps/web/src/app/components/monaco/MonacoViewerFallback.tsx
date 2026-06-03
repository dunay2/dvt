/** Owned concern: provide the shared loading shell for lazy Monaco viewer surfaces. */
import { cn } from '../ui/utils';
import { monacoVisualClasses } from './monacoVisualTokens';

export const DEFAULT_MONACO_CONTAINER_CLASS_NAME = monacoVisualClasses.surface;

type MonacoViewerFallbackProps = Readonly<{
  label: string;
  containerClassName?: string;
}>;

export function MonacoViewerFallback({
  label,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
}: MonacoViewerFallbackProps) {
  return (
    <div className={cn(containerClassName, monacoVisualClasses.fallback)} role="status">
      {label}
    </div>
  );
}
