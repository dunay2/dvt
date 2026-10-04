/** Passive workspace tab strip: markup, styling and accessibility only. */
import { Table2, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasWorkspaceModelTabsTemplate({
  tabs,
  activeKey,
  copy,
  onSelect,
  onClose,
}: Readonly<{
  tabs: readonly Readonly<{ key: string; tabId: string; panelId: string; label: string }>[];
  activeKey: string;
  copy: Pick<CanvasSemanticEditorCopy, 'workspaceTabs' | 'closeEditor'>;
  onSelect: (key: string) => void;
  onClose?: () => void;
}>) {
  return (
    <Tabs
      value={activeKey}
      onValueChange={onSelect}
      className="canvas-workspace-model-tabs min-w-0 flex-row items-center gap-0 self-stretch"
    >
      <TabsList
        aria-label={copy.workspaceTabs}
        className="workspace-navigation-tabs h-full justify-start rounded-none bg-transparent p-0"
      >
        {tabs.map((item) => (
          <TabsTrigger
            key={item.key}
            value={item.key}
            id={item.tabId}
            aria-controls={item.panelId}
            data-slot={item.tabId}
            title={item.label}
            className="workspace-navigation-tab rounded-none border-0 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {item.key === 'model' ? (
              <Table2 aria-hidden="true" className="size-4 shrink-0" />
            ) : null}
            <span className="max-w-64 truncate">{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {onClose != null ? (
        <button
          type="button"
          data-slot="canvas-model-tab-close"
          aria-label={copy.closeEditor}
          title={copy.closeEditor}
          className="shrink-0 rounded p-1 text-(--text-muted) hover:bg-(--surface-panel) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
          onClick={onClose}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </Tabs>
  );
}
