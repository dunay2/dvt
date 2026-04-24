/** Owned concern: render host-owned Canvas tabs from authoritative draft-backed tab state. */
import { Layers2 } from 'lucide-react';

import {
  routeWorkbenchTabListClassName,
  routeWorkbenchTabTriggerClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../components/ui/utils';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';

type CanvasPlaygroundTabStripProps = Readonly<{
  tabState: CanvasPlaygroundTabState;
}>;

export function CanvasPlaygroundTabStrip({
  tabState,
}: CanvasPlaygroundTabStripProps): JSX.Element | null {
  if (tabState.tabs.length === 0 || tabState.activeTabId == null) {
    return null;
  }

  return (
    <div
      data-slot="canvas-playground-tab-strip"
      className="shrink-0 border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-4 py-2"
    >
      <Tabs value={tabState.activeTabId} className="w-full">
        <TabsList className={cn(routeWorkbenchTabListClassName, 'h-auto gap-2 p-1')}>
          {tabState.tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              data-slot="canvas-playground-tab-trigger"
              className={cn(
                routeWorkbenchTabTriggerClassName,
                'flex h-auto min-w-0 items-center gap-2 rounded-md px-3 py-2'
              )}
            >
              <Layers2 className="size-4 shrink-0" />
              <span className="min-w-0 truncate text-sm font-medium">{tab.title}</span>
              <span className="rounded-sm border border-[color:var(--border-default)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--text-subtle)]">
                {tab.kindLabel}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
