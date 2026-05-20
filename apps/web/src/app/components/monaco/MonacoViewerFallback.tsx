/** Owned concern: provide the shared loading shell for lazy Monaco viewer surfaces. */
import { routeWorkbenchMonacoSurfaceClassName } from '../workbench/RouteWorkbenchFrame';
import { cn } from '../ui/utils';

export const DEFAULT_MONACO_CONTAINER_CLASS_NAME = routeWorkbenchMonacoSurfaceClassName;

type MonacoViewerFallbackProps = Readonly<{
  label: string;
  containerClassName?: string;
}>;

export function MonacoViewerFallback({
  label,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
}: MonacoViewerFallbackProps) {
  return (
    <div
      className={cn(
        containerClassName,
        'flex items-center justify-center text-sm text-[var(--text-muted)]'
      )}
      role="status"
    >
      {label}
    </div>
  );
}
