/** Passive workspace tab strip: markup, accessibility and semantic class names. */
import './canvasWorkspaceTabs.css';
import type { DragEvent, FocusEvent, MouseEvent, Ref } from 'react';
import { Code2, Table2, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { canvasWorkspaceTabs } from './canvasWorkspaceTabs';

export function CanvasWorkspaceModelTabsTemplate({
  tabs,
  activeKey,
  copy,
  onSelect,
  stripRef,
  onTabFocus,
  onTabPointerDown,
  onModelDragOver,
}: Readonly<{
  tabs: readonly Readonly<{
    key: string;
    kind: keyof typeof canvasWorkspaceTabs;
    tabId: string;
    panelId: string;
    label: string;
    close?: Readonly<{ label: string; action: () => void }>;
  }>[];
  activeKey: string;
  copy: Pick<CanvasSemanticEditorCopy, 'workspaceTabs'>;
  onSelect: (key: string) => void;
  stripRef: Ref<HTMLDivElement>;
  onTabFocus: (event: FocusEvent<HTMLButtonElement>, key: string) => void;
  onTabPointerDown: (event: MouseEvent<HTMLButtonElement>, key: string) => void;
  onModelDragOver: (event: DragEvent<HTMLButtonElement>, key: string) => void;
}>) {
  return (
    <Tabs
      asChild
      value={activeKey}
      onValueChange={onSelect}
      className="canvas-workspace-model-tabs"
      style={{ '--canvas-workspace-tab-count': tabs.length } as React.CSSProperties}
    >
      <div ref={stripRef}>
        <TabsList
          aria-label={copy.workspaceTabs}
          className="workspace-navigation-tabs"
          data-workbench-navigation=""
        >
          {tabs.map((item) => (
            <TabsTrigger
              key={item.key}
              value={item.key}
              id={item.tabId}
              aria-controls={item.panelId}
              data-slot={canvasWorkspaceTabs[item.kind].tabId}
              title={item.label}
              aria-keyshortcuts={item.close == null ? undefined : 'Delete'}
              data-closable={item.close != null || undefined}
              className="workspace-navigation-tab"
              onMouseDown={(event) => onTabPointerDown(event, item.key)}
              onDragOver={
                item.kind === 'model' ? (event) => onModelDragOver(event, item.key) : undefined
              }
              onFocus={(event) => onTabFocus(event, item.key)}
              onKeyDown={(event) => {
                if (event.key !== 'Delete' || item.close == null) return;
                event.preventDefault();
                event.stopPropagation();
                item.close.action();
              }}
            >
              {item.kind === 'model' ? (
                <Table2 aria-hidden="true" className="canvas-workspace-model-tab-icon" />
              ) : item.kind === 'code' ? (
                <Code2 aria-hidden="true" className="canvas-workspace-model-tab-icon" />
              ) : null}
              <span className="canvas-workspace-model-tab-label">{item.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="canvas-workspace-model-close-controls">
          {tabs.map((item) => (
            <div key={item.key}>
              {item.close == null ? null : (
                <button
                  type="button"
                  tabIndex={item.kind === 'model' ? 0 : -1}
                  data-slot={`canvas-${item.kind}-tab-close`}
                  aria-label={item.close.label}
                  title={item.close.label}
                  className="canvas-workspace-model-tab-close"
                  onClick={item.close.action}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Tabs>
  );
}
