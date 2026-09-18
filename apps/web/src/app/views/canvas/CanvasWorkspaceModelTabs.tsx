/** Owned concern: present the Canvas and Model as peer workspace tabs. */
import { Table2, X } from 'lucide-react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasModelWorkspaceTabContribution } from './canvasWorkspaceMenuContributionStore';

export function CanvasWorkspaceModelTabs({
  canvasTitle,
  tab,
}: Readonly<{
  canvasTitle: string;
  tab: CanvasModelWorkspaceTabContribution;
}>): JSX.Element {
  const copy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  const tabs = [
    {
      key: 'canvas',
      label: canvasTitle,
      selected: !tab.active,
      select: tab.onCanvas,
      slot: 'canvas-workspace-tab',
    },
    {
      key: 'model',
      label: `${copy.editor} · ${tab.label}`,
      selected: tab.active,
      select: tab.onSelect,
      slot: 'canvas-model-main-tab',
    },
  ];
  return (
    <div
      role="tablist"
      aria-label={copy.workspaceTabs}
      className="flex min-w-0 items-center gap-1 self-stretch text-sm"
    >
      {tabs.map((item, index) => (
        <div key={item.key} className="flex min-w-0 items-center">
          <button
            type="button"
            role="tab"
            aria-selected={item.selected}
            tabIndex={item.selected ? 0 : -1}
            data-slot={item.slot}
            title={item.label}
            className="flex h-9 min-w-0 items-center gap-2 border-b-2 border-transparent px-3 font-medium text-(--text-muted) hover:text-(--text-primary) aria-selected:border-(--primary) aria-selected:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
            onClick={item.select}
            onKeyDown={(event) => {
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? 1
                    : event.key === 'ArrowLeft' || event.key === 'ArrowRight'
                      ? 1 - index
                      : null;
              if (next == null) return;
              event.preventDefault();
              tabs[next]!.select();
              event.currentTarget
                .closest('[role="tablist"]')
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus();
            }}
          >
            {index === 1 ? <Table2 aria-hidden="true" className="size-4 shrink-0" /> : null}
            <span className="max-w-64 truncate">{item.label}</span>
          </button>
          {index === 1 ? (
            <button
              type="button"
              data-slot="canvas-model-tab-close"
              aria-label={copy.closeEditor}
              title={copy.closeEditor}
              className="rounded p-1 text-(--text-muted) hover:bg-(--surface-panel) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
              onClick={() => tab.onClose()}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
