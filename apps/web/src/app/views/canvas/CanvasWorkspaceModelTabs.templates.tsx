/** Passive workspace tab strip: markup, accessibility and semantic class names. */
import './canvasSemanticEditor.css';
import { Code2, Table2, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasWorkspaceModelTabsTemplate({
  tabs,
  activeKey,
  copy,
  onSelect,
}: Readonly<{
  tabs: readonly Readonly<{
    key: string;
    tabId: string;
    panelId: string;
    label: string;
    close?: Readonly<{ label: string; action: () => void }>;
  }>[];
  activeKey: string;
  copy: Pick<CanvasSemanticEditorCopy, 'workspaceTabs'>;
  onSelect: (key: string) => void;
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
            aria-keyshortcuts={item.close == null ? undefined : 'Delete'}
            className="workspace-navigation-tab"
            onMouseDown={(event) => {
              if (
                item.key !== 'code' &&
                item.key === activeKey &&
                event.button === 0 &&
                !event.ctrlKey
              )
                onSelect(item.key);
            }}
            onFocus={() => {
              if (item.key !== 'code' && item.key === activeKey) onSelect(item.key);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Delete' || item.close == null) return;
              event.preventDefault();
              event.stopPropagation();
              item.close.action();
            }}
          >
            {item.key === 'model' ? (
              <Table2 aria-hidden="true" className="canvas-workspace-model-tab-icon" />
            ) : item.key === 'code' ? (
              <Code2 aria-hidden="true" className="canvas-workspace-model-tab-icon" />
            ) : null}
            <span className="canvas-workspace-model-tab-label">{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((item) =>
        item.close == null ? null : (
          <button
            key={item.key}
            type="button"
            tabIndex={item.key === 'model' ? 0 : -1}
            data-slot={`canvas-${item.key}-tab-close`}
            aria-label={item.close.label}
            title={item.close.label}
            className="canvas-workspace-model-tab-close"
            onClick={item.close.action}
          >
            <X aria-hidden="true" />
          </button>
        )
      )}
    </Tabs>
  );
}
