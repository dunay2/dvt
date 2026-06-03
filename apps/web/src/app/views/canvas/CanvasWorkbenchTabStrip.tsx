/** Owned concern: render Canvas workbench tab navigation from the tab read model. */
import { Activity, FileCode2, FileText, GitCompare, GitGraph, GitMerge } from 'lucide-react';

import type { CanvasWorkbenchTabId } from '../../plugins/contracts/PluginManifest';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import type {
  CanvasWorkbenchTabIconName,
  CanvasWorkbenchTabsReadModel,
} from './canvasWorkbenchTabs';

export type CanvasWorkbenchTabStripProps = Readonly<{
  tabsState: CanvasWorkbenchTabsReadModel;
  onSelectTab: (tabId: CanvasWorkbenchTabId) => void;
  variant?: 'standalone' | 'inline';
}>;

function renderCanvasWorkbenchTabIcon(iconName: CanvasWorkbenchTabIconName): JSX.Element {
  const className = 'size-4 shrink-0';

  switch (iconName) {
    case 'code':
      return <FileCode2 aria-hidden="true" className={className} />;
    case 'lineage':
      return <GitMerge aria-hidden="true" className={className} />;
    case 'diff':
      return <GitCompare aria-hidden="true" className={className} />;
    case 'artifacts':
      return <FileText aria-hidden="true" className={className} />;
    case 'runs':
      return <Activity aria-hidden="true" className={className} />;
    default:
      return <GitGraph aria-hidden="true" className={className} />;
  }
}

export function CanvasWorkbenchTabStrip({
  tabsState,
  onSelectTab,
  variant = 'standalone',
}: CanvasWorkbenchTabStripProps): JSX.Element {
  return (
    <div
      data-slot="canvas-workbench-tab-strip"
      className={
        variant === 'inline'
          ? 'flex shrink items-stretch gap-4 overflow-x-auto'
          : 'flex shrink-0 items-stretch gap-4 overflow-x-auto border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-4'
      }
    >
      <Tabs value={tabsState.activeTabId} className="min-w-max flex-none">
        <TabsList className="flex h-11 min-w-max items-stretch gap-6 rounded-none border-0 bg-transparent p-0">
          {tabsState.tabs.map((tab) => {
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                data-slot="canvas-workbench-tab-trigger"
                className={cn(
                  'flex h-11 flex-none items-center gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-sm font-medium whitespace-nowrap text-[var(--text-muted)] shadow-none transition-colors',
                  'hover:bg-transparent hover:text-[var(--text-strong)]',
                  'data-[state=active]:border-[color:var(--focus-ring)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--text-strong)] data-[state=active]:shadow-none'
                )}
                onClick={() => onSelectTab(tab.id)}
              >
                {renderCanvasWorkbenchTabIcon(tab.iconName)}
                <span className="whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
