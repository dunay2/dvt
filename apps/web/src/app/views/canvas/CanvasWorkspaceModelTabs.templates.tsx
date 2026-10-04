/** Passive workspace tab strip: markup, accessibility and semantic class names. */
import './canvasSemanticEditor.css';
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
    <Tabs value={activeKey} onValueChange={onSelect} className="canvas-workspace-model-tabs">
      <TabsList aria-label={copy.workspaceTabs} className="workspace-navigation-tabs">
        {tabs.map((item) => (
          <TabsTrigger
            key={item.key}
            value={item.key}
            id={item.tabId}
            aria-controls={item.panelId}
            data-slot={item.tabId}
            title={item.label}
            className="workspace-navigation-tab"
          >
            {item.key === 'model' ? (
              <Table2 aria-hidden="true" className="canvas-workspace-model-tab-icon" />
            ) : null}
            <span className="canvas-workspace-model-tab-label">{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {onClose != null ? (
        <button
          type="button"
          data-slot="canvas-model-tab-close"
          aria-label={copy.closeEditor}
          title={copy.closeEditor}
          className="canvas-workspace-model-tab-close"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      ) : null}
    </Tabs>
  );
}
