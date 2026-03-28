import { useQueryClient } from '@tanstack/react-query';
import { Database, FileText, PanelLeftClose, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { resolveNodeKindRegistration } from '../plugins/nodeTypeRegistry';
import type { CanonicalNode } from '../types/canonical';
import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../types/canonical';

import SourceImportWizard from './SourceImportWizard';

type ImportResult = {
  success: boolean;
  sourcesCreated: number;
  tablesImported: number;
  yamlFiles: string[];
};
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

interface DbtExplorerProps {
  nodes: CanonicalNode[];
  onNodeDragStart?: (node: CanonicalNode) => void;
  onHide?: () => void;
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

export default function DbtExplorer({ nodes, onNodeDragStart, onHide }: DbtExplorerProps) {
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const queryClient = useQueryClient();
  const hasDbtNodes = nodes.some((node) => node.pluginId === 'dbt');

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
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(CANONICAL_NODE_DRAG_MIME_TYPE, JSON.stringify(node));
    onNodeDragStart?.(node);
  };

  return (
    <>
      <div className="h-full bg-slate-900 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-sm">Node Explorer</h2>
              <p className="text-xs text-slate-300 mt-0.5">Drag to canvas</p>
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

          {/* Import Button */}
          {hasDbtNodes && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => setImportWizardOpen(true)}
            >
              <Upload className="size-3 mr-2" />
              Import Sources
            </Button>
          )}
        </div>

        {/* Node Groups */}
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
                  <AccordionTrigger className="py-2 px-2 hover:bg-slate-950 text-sm">
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
                          draggable
                          onDragStart={(e) => handleDragStart(e, node)}
                          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-950 cursor-move group text-sm"
                        >
                          <div className={cn('size-2 rounded-full', statusColors[node.status])} />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs truncate">{node.name}</div>
                            {node.lastDuration != null && (
                              <div className="text-[10px] text-slate-400">
                                {node.lastDuration}s
                                {node.lastCost != null && ` - $${node.lastCost.toFixed(2)}`}
                              </div>
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
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

      {/* Source Import Wizard */}
      {hasDbtNodes && (
        <SourceImportWizard
          open={importWizardOpen}
          onClose={() => setImportWizardOpen(false)}
          onComplete={(result: ImportResult) => {
            void queryClient.invalidateQueries({ queryKey: ['workspace', 'graph'] });
            if (result?.success) {
              toast.success(
                `Imported ${result.sourcesCreated} source${result.sourcesCreated !== 1 ? 's' : ''}, ${result.tablesImported} table${result.tablesImported !== 1 ? 's' : ''}`
              );
            }
          }}
        />
      )}
    </>
  );
}
