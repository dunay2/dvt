/** Owned concern: present the Canvas and Model as peer workspace tabs. */
import { Table2, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasModelWorkspaceTabContribution } from './canvasWorkspaceMenuContributionStore';
import { canvasWorkspaceTabs } from './canvasWorkspaceTabs';

export function CanvasWorkspaceModelTabs({
  canvasTitle,
  tab,
}: Readonly<{
  canvasTitle: string;
  tab?: CanvasModelWorkspaceTabContribution;
}>): JSX.Element {
  const copy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  const tabs = [
    {
      key: 'canvas',
      ...canvasWorkspaceTabs.canvas,
      label: canvasTitle,
      select: tab?.onCanvas,
    },
    ...(tab == null
      ? []
      : [
          {
            key: 'model',
            ...canvasWorkspaceTabs.model,
            label: tab.label,
            select: tab.onSelect,
          },
        ]),
  ];
  return (
    <Tabs
      value={tab?.active === true ? 'model' : 'canvas'}
      onValueChange={(value) => tabs.find((item) => item.key === value)?.select?.()}
      className="self-stretch"
    >
      <TabsList
        aria-label={copy.workspaceTabs}
        className="workspace-navigation-tabs h-full justify-start rounded-none bg-transparent p-0"
      >
        {tabs.map((item, index) => (
          <div key={item.key} className="flex min-w-0 items-center">
            <TabsTrigger
              value={item.key}
              id={item.tabId}
              aria-controls={item.panelId}
              data-slot={item.tabId}
              title={item.label}
              className="workspace-navigation-tab rounded-none border-0 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {index === 1 ? <Table2 aria-hidden="true" className="size-4 shrink-0" /> : null}
              <span className="max-w-64 truncate">{item.label}</span>
            </TabsTrigger>
            {item.key === 'model' && tab != null ? (
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
      </TabsList>
    </Tabs>
  );
}
