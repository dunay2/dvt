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
      className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-3 py-1.5"
    >
      <Tabs value={tabsState.activeTabId} className="min-w-max flex-none">
        <TabsList className={cn(routeWorkbenchTabListClassName, 'h-auto min-w-max gap-1 p-1')}>
          {tabsState.tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                data-slot="canvas-workbench-tab-trigger"
                className={cn(
                  routeWorkbenchTabTriggerClassName,
                  'flex h-auto flex-none items-center gap-1.5 rounded-md px-2 py-1.5 whitespace-nowrap'
                )}
                onClick={() => onSelectTab(tab.id)}
              >
                <Icon className="size-4 shrink-0" />
                <span className="text-[13px] font-medium whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
