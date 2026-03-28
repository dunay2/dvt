import { useState } from 'react';
import { PanelRightClose } from 'lucide-react';

import type { CanonicalNode } from '../types/canonical';
import type { InspectorContext } from '../plugins/contracts/PluginManifest';
import { getInspectorPanels } from '../plugins/registry';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './ui/utils';

// ---------------------------------------------------------------------------
// InspectorPanel
// ---------------------------------------------------------------------------

interface InspectorPanelProps {
  node: CanonicalNode | null;
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  onHide: () => void;
}

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-gray-600',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-400',
};

export default function InspectorPanel({
  node,
  activeRunId,
  registeredPlugins = new Set(),
  onHide,
}: Readonly<InspectorPanelProps>) {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const ctx: InspectorContext = { activeRunId, registeredPlugins };
  const panels = node ? getInspectorPanels(node, ctx) : [];
  const defaultTab = panels[0]?.id;

  // Empty state
  if (!node || panels.length === 0) {
    return (
      <div className="flex h-full flex-col border-l border-slate-700 bg-slate-900 text-slate-50">
        <PanelHeader title="Inspector" status={null} kind="" onHide={onHide} />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-xs text-center text-sm text-slate-400">
            <p>{node ? 'No panels registered for this node type.' : 'Select a node to inspect.'}</p>
            {node && (
              <p className="mt-2 font-mono text-xs text-slate-500">
                {node.kind} is renderable but has no inspector contribution yet.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-l border-slate-700 bg-slate-900 text-slate-50">
      <PanelHeader title={node.name} status={node.status} kind={node.kind} onHide={onHide} />

      <Tabs
        value={activeTab ?? defaultTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="justify-start rounded-none border-b border-slate-700 bg-transparent px-4">
          {panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <TabsTrigger
                key={panel.id}
                value={panel.id}
                className="text-slate-200 data-[state=active]:bg-slate-950 data-[state=active]:text-white"
              >
                <Icon className="mr-1 size-3" />
                {resolveString(panel.label)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <ScrollArea className="flex-1">
          {panels.map((panel) => {
            const PanelComponent = panel.component;
            return (
              <TabsContent key={panel.id} value={panel.id} className="m-0 p-4">
                <PanelComponent node={node} activeRunId={activeRunId} onClose={onHide} />
              </TabsContent>
            );
          })}
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelHeader
// ---------------------------------------------------------------------------

type PanelHeaderProps = {
  title: string;
  status: string | null;
  kind: string;
  onHide: () => void;
};

function PanelHeader({ title, status, kind, onHide }: PanelHeaderProps) {
  const dotClass = status ? (STATUS_DOT[status] ?? 'bg-gray-600') : null;

  return (
    <div className="flex items-start justify-between border-b border-slate-700 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {dotClass && <div className={cn('size-2 shrink-0 rounded-full', dotClass)} />}
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        {kind && <p className="mt-0.5 font-mono text-xs text-slate-400">{kind}</p>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-slate-300 hover:text-white"
        onClick={onHide}
        aria-label="Hide inspector panel"
      >
        <PanelRightClose className="size-4" />
      </Button>
    </div>
  );
}
