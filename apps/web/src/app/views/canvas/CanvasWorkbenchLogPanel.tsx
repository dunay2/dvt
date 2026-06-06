/** Owned concern: render the Canvas workbench log read model as a dense panel. */
import type {
  CanvasWorkbenchLogEntriesReadModel,
  CanvasWorkbenchLogSeverity,
} from './canvasWorkbenchLogEntries';

export type CanvasWorkbenchLogPanelProps = Readonly<{
  logState: CanvasWorkbenchLogEntriesReadModel;
}>;

export function resolveCanvasWorkbenchLogSeverityClassName(
  severity: CanvasWorkbenchLogSeverity
): string {
  switch (severity) {
    case 'error':
      return 'border-red-500/70 bg-red-500/10 text-red-100';
    case 'warning':
      return 'border-amber-400/70 bg-amber-400/10 text-amber-100';
    default:
      return 'border-sky-400/60 bg-sky-400/10 text-sky-100';
  }
}

export function CanvasWorkbenchLogPanel({ logState }: CanvasWorkbenchLogPanelProps): JSX.Element {
  return (
    <section
      data-slot="canvas-workbench-log-panel"
      className="flex h-full min-h-0 flex-col bg-[var(--surface-route)] text-[var(--text-default)]"
      aria-label="Canvas workbench log"
    >
      <header className="shrink-0 border-b border-[color:var(--border-default)] px-5 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">Log</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Current Canvas route, draft, plan, permission, graph, selection, and run messages.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        {logState.entries.length === 0 ? (
          <div className="rounded border border-[color:var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 text-sm text-[var(--text-muted)]">
            No current Canvas messages.
          </div>
        ) : (
          <ol className="space-y-2">
            {logState.entries.map((entry) => (
              <li
                key={entry.id}
                data-slot="canvas-workbench-log-entry"
                className="grid grid-cols-[minmax(5rem,7rem)_minmax(6rem,8rem)_1fr] gap-3 border-b border-[color:var(--border-muted)] py-2 text-sm last:border-b-0"
              >
                <span
                  className={`inline-flex h-6 w-fit items-center rounded border px-2 text-[11px] font-semibold uppercase tracking-normal ${resolveCanvasWorkbenchLogSeverityClassName(entry.severity)}`}
                >
                  {entry.severity}
                </span>
                <span className="font-mono text-xs text-[var(--text-muted)]">{entry.source}</span>
                <span className="min-w-0 text-[var(--text-default)]">
                  <span className="block break-words">{entry.message}</span>
                  <span className="mt-1 block font-mono text-[11px] text-[var(--text-muted)]">
                    {entry.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
