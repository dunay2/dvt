/** Passive session status and explicit Apply/Cancel host. */
import type { CanvasDraftStatusState } from './canvasDraftStatusState';

export function CanvasModelToolbar({
  data,
  actions,
}: Readonly<{
  data: Readonly<{
    modelName: string;
    draftStatus: CanvasDraftStatusState;
  }>;
  actions: Readonly<{
    onActionsHost: (host: HTMLDivElement | null) => void;
  }>;
}>) {
  return (
    <footer
      data-slot="canvas-model-toolbar"
      className="flex min-h-6 shrink-0 flex-wrap items-center justify-end gap-x-3 border-t border-(--border-subtle) bg-(--surface-shell) px-3 py-0.5"
    >
      <h1 className="sr-only">{data.modelName}</h1>
      <span
        role="status"
        data-slot="canvas-model-save-status"
        className={`text-[11px] ${data.draftStatus.tone === 'danger' ? 'text-rose-300' : data.draftStatus.tone === 'warning' ? 'text-amber-200' : 'text-(--text-muted)'}`}
      >
        {data.draftStatus.label}
      </span>
      <div
        ref={actions.onActionsHost}
        data-slot="canvas-model-actions"
        className="flex items-center empty:hidden"
      />
    </footer>
  );
}
