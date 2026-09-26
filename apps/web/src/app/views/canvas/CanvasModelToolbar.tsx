/** Passive session toolbar: output actions are not editor navigation. */
import { Braces, Table2 } from 'lucide-react';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';

export function CanvasModelToolbar({
  data,
  actions,
}: Readonly<{
  data: Readonly<{
    modelName: string;
    draftStatus: CanvasDraftStatusState;
    sqlLabel: string;
    dataLabel: string;
  }>;
  actions: Readonly<{
    onOpenSql?: () => void;
    onOpenData?: () => void;
    onActionsHost: (host: HTMLDivElement | null) => void;
  }>;
}>) {
  return (
    <header
      data-slot="canvas-model-toolbar"
      className="flex shrink-0 flex-wrap items-center gap-x-3 border-b border-(--border-subtle) bg-(--surface-shell) px-3 py-1"
    >
      <h1 className="sr-only">{data.modelName}</h1>
      <button
        type="button"
        data-slot="canvas-model-open-sql"
        disabled={actions.onOpenSql == null}
        className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-(--surface-panel) disabled:opacity-50"
        onClick={actions.onOpenSql}
      >
        <Braces aria-hidden="true" className="size-4" />
        {data.sqlLabel}
      </button>
      <button
        type="button"
        data-slot="canvas-model-open-data"
        disabled={actions.onOpenData == null}
        className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-(--surface-panel) disabled:opacity-50"
        onClick={actions.onOpenData}
      >
        <Table2 aria-hidden="true" className="size-4" />
        {data.dataLabel}
      </button>
      <span
        role="status"
        data-slot="canvas-model-save-status"
        className={`ml-auto py-1 text-[11px] ${data.draftStatus.tone === 'danger' ? 'text-rose-300' : data.draftStatus.tone === 'warning' ? 'text-amber-200' : 'text-(--text-muted)'}`}
      >
        {data.draftStatus.label}
      </span>
      <div
        ref={actions.onActionsHost}
        data-slot="canvas-model-actions"
        className="ml-auto flex items-center empty:hidden"
      />
    </header>
  );
}
