export const DEFAULT_MONACO_CONTAINER_CLASS_NAME =
  'h-[420px] overflow-hidden rounded border border-slate-700 bg-slate-950';

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
      className={`${containerClassName} flex items-center justify-center text-sm text-slate-400`}
      role="status"
    >
      {label}
    </div>
  );
}
