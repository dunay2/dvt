/** Present Model view tabs and session actions without owning navigation decisions. */
import { Braces, GitBranch, Table2 } from 'lucide-react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasModelView } from './useCanvasModelNavigation';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';

export function CanvasModelToolbar({
  canvasName,
  modelName,
  view,
  draftStatus,
  onViewChange,
  onActionsHost,
}: Readonly<{
  canvasName: string;
  modelName: string;
  view: CanvasModelView;
  draftStatus: CanvasDraftStatusState;
  onViewChange: (view: CanvasModelView) => void;
  onActionsHost: (host: HTMLDivElement | null) => void;
}>) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const tabs = [
    { id: 'editor', label: modelName, icon: GitBranch },
    { id: 'sql', label: copy.sql, icon: Braces },
    { id: 'data', label: copy.data, icon: Table2 },
  ] as const;
  return (
    <header
      data-slot="canvas-model-toolbar"
      className="flex shrink-0 flex-wrap items-center gap-x-3 border-b border-(--border-subtle) bg-(--surface-shell) px-3"
    >
      <h1 className="sr-only" title={`${canvasName} / ${modelName}`}>
        {modelName}
      </h1>
      <div role="tablist" aria-label={modelName} className="workspace-navigation-tabs self-stretch">
        {tabs.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`model-tab-${id}`}
            aria-controls={`model-panel-${id}`}
            aria-selected={view === id}
            tabIndex={view === id ? 0 : -1}
            data-slot="canvas-model-view-tab"
            data-view={id}
            className="workspace-navigation-tab"
            title={label}
            onClick={() => onViewChange(id)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % tabs.length
                  : event.key === 'ArrowLeft'
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tabs.length - 1
                        : null;
              if (next == null) return;
              event.preventDefault();
              onViewChange(tabs[next]!.id);
              document.getElementById(`model-tab-${tabs[next]!.id}`)?.focus();
            }}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="max-w-64 truncate">{label}</span>
          </button>
        ))}
      </div>
      <span
        role="status"
        data-slot="canvas-model-save-status"
        className={`ml-auto py-1 text-[11px] ${draftStatus.tone === 'danger' ? 'text-rose-300' : draftStatus.tone === 'warning' ? 'text-amber-200' : 'text-(--text-muted)'}`}
      >
        {draftStatus.label}
      </span>
      <div
        ref={onActionsHost}
        data-slot="canvas-model-actions"
        className="ml-auto flex items-center empty:hidden"
      />
    </header>
  );
}
