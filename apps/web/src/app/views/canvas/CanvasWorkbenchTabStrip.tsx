/** Owned concern: render Canvas workbench tab navigation from the tab read model. */
import type { CanvasWorkbenchTabId } from '../../plugins/contracts/PluginManifest';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchTabListClassName,
  routeWorkbenchTabTriggerClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import type { CanvasWorkbenchTabsReadModel } from './canvasWorkbenchTabs';

export type CanvasWorkbenchTabStripProps = Readonly<{
  tabsState: CanvasWorkbenchTabsReadModel;
  onSelectTab: (tabId: CanvasWorkbenchTabId) => void;
}>;

export function CanvasWorkbenchTabStrip({
  tabsState,
  onSelectTab,
}: CanvasWorkbenchTabStripProps): JSX.Element {
  return (
    <div
      data-slot="canvas-workbench-tab-strip"
      className="flex shrink-0 items-center gap-3 border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-4 py-2"
    >
      <Tabs value={tabsState.activeTabId} className="min-w-0 flex-1">
        <TabsList className={cn(routeWorkbenchTabListClassName, 'h-auto gap-2 p-1')}>
          {tabsState.tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                data-slot="canvas-workbench-tab-trigger"
                className={cn(
                  routeWorkbenchTabTriggerClassName,
                  'flex h-auto min-w-0 items-center gap-2 rounded-md px-3 py-2'
                )}
                onClick={() => onSelectTab(tab.id)}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 truncate text-sm font-medium">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
