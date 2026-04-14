import { PanelLeftClose, Upload } from 'lucide-react';
import { useMemo } from 'react';

import { resolveNodeKindRegistration } from '../plugins/nodeTypeRegistry';
import type { CanonicalNode } from '../types/canonical';
import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../types/canonical';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

interface DbtExplorerProps {
  nodes: CanonicalNode[];
  canEditGraph?: boolean;
  onNodeDragStart?: (node: CanonicalNode) => void;
  onHide?: () => void;
  onOpenDataRegistry?: () => void;
}

const statusColors: Record<CanonicalNode['status'], string> = {
  idle: 'bg-gray-600',
  running: 'bg-blue-500',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
  warn: 'bg-orange-500',
};

function resolveNodeBadgeText(node: CanonicalNode): string {
  const packageName = typeof node.metadata?.package === 'string' ? node.metadata.package : null;
  return packageName ?? node.pluginId;
}

export default function DbtExplorer({
  nodes,
  canEditGraph = true,
  onNodeDragStart,
  onHide,
  onOpenDataRegistry,
}: DbtExplorerProps) {
  const groupedNodes = useMemo(() => {
    const groups: Record<string, CanonicalNode[]> = {};

    nodes.forEach((node) => {
      if (!groups[node.kind]) {
        groups[node.kind] = [];
      }
      const bucket = groups[node.kind];
      if (bucket) {
        bucket.push(node);
      }
    });

    return Object.entries(groups).sort(([kindA], [kindB]) =>
      resolveNodeKindRegistration(kindA).label.localeCompare(
        resolveNodeKindRegistration(kindB).label
      )
    );
  }, [nodes]);

  const handleDragStart = (e: React.DragEvent, node: CanonicalNode) => {
    if (!canEditGraph) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(CANONICAL_NODE_DRAG_MIME_TYPE, JSON.stringify(node));
    onNodeDragStart?.(node);
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-sm">Project Nodes</h2>
            <p className="mt-0.5 text-xs text-slate-300">
              {canEditGraph
                ? 'Drag resources into the graph'
                : 'Inspect available project resources'}
            </p>
          </div>
          {onHide && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-slate-300 hover:text-white"
              onClick={onHide}
              aria-label="Hide explorer panel"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>

        {onOpenDataRegistry && (
          <div className="mt-2 space-y-2">
            <p className="text-[11px] leading-5 text-slate-400">
              Explore project nodes, discover dependencies, and add new objects to this workspace.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenDataRegistry}
              disabled={!canEditGraph}
              className="h-8 w-full justify-start gap-1.5 border-slate-600 bg-slate-950/40 px-3 text-xs font-medium text-slate-100 hover:bg-slate-800 hover:text-white"
            >
              <Upload className="size-3.5" />
              Add data
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          defaultValue={groupedNodes.slice(0, 3).map(([kind]) => kind)}
          className="px-2"
        >
          {groupedNodes.map(([kind, kindNodes]) => {
            const config = resolveNodeKindRegistration(kind);

            return (
              <AccordionItem key={kind} value={kind} className="border-b border-slate-700">
                <AccordionTrigger className="px-2 py-2 text-sm hover:bg-slate-950">
                  <div className="flex items-center gap-2">
                    <config.icon className="size-4" style={{ color: config.minimapColor }} />
                    <span>{config.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {kindNodes.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1">
                    {kindNodes.map((node) => (
                      <div
                        key={node.id}
                        draggable={canEditGraph}
                        onDragStart={(event) => handleDragStart(event, node)}
                        className={cn(
                          'group flex items-center gap-2 rounded px-3 py-2 text-sm',
                          canEditGraph
                            ? 'cursor-move hover:bg-slate-950'
                            : 'cursor-default text-slate-300'
                        )}
                      >
                        <div className={cn('size-2 rounded-full', statusColors[node.status])} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-xs">{node.name}</div>
                          {node.lastDuration != null && (
                            <div className="text-[10px] text-slate-400">
                              {node.lastDuration}s
                              {node.lastCost != null && ` - $${node.lastCost.toFixed(2)}`}
                            </div>
                          )}
                        </div>
                        <div className="opacity-0 transition-opacity group-hover:opacity-100">
                          <Badge variant="outline" className="px-1 py-0 text-[10px]">
                            {resolveNodeBadgeText(node)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
