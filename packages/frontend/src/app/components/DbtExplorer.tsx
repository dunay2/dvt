import { useMemo } from 'react';
import {
  Database,
  Table,
  FileText,
  TestTube,
  Presentation,
  TrendingUp,
  Code,
  Package,
} from 'lucide-react';
import { DbtNode, DbtNodeType } from '../types/dbt';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { cn } from './ui/utils';

interface DbtExplorerProps {
  nodes: DbtNode[];
  onNodeDragStart?: (node: DbtNode) => void;
}

const nodeTypeConfig: Record<DbtNodeType, { icon: any; label: string; color: string }> = {
  SOURCE: { icon: Database, label: 'Sources', color: 'text-purple-400' },
  MODEL: { icon: Table, label: 'Models', color: 'text-blue-400' },
  SEED: { icon: FileText, label: 'Seeds', color: 'text-green-400' },
  SNAPSHOT: { icon: Package, label: 'Snapshots', color: 'text-yellow-400' },
  TEST: { icon: TestTube, label: 'Tests', color: 'text-red-400' },
  EXPOSURE: { icon: Presentation, label: 'Exposures', color: 'text-pink-400' },
  METRIC: { icon: TrendingUp, label: 'Metrics', color: 'text-orange-400' },
  MACRO: { icon: Code, label: 'Macros', color: 'text-gray-400' },
};

const statusColors = {
  idle: 'bg-gray-600',
  running: 'bg-blue-500',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
  warn: 'bg-orange-500',
};

export default function DbtExplorer({ nodes, onNodeDragStart }: DbtExplorerProps) {
  const groupedNodes = useMemo(() => {
    const groups: Record<string, DbtNode[]> = {};

    nodes.forEach((node) => {
      if (!groups[node.type]) {
        groups[node.type] = [];
      }
      groups[node.type].push(node);
    });

    return groups;
  }, [nodes]);

  const handleDragStart = (e: React.DragEvent, node: DbtNode) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/dbt-node', JSON.stringify(node));
    onNodeDragStart?.(node);
  };

  return (
    <div className="h-full bg-[#0f1116] border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="font-semibold text-sm">dbt Explorer</h2>
        <p className="text-xs text-gray-400 mt-0.5">Drag to canvas</p>
      </div>

      {/* Node Groups */}
      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={['SOURCE', 'MODEL', 'TEST']} className="px-2">
          {Object.entries(groupedNodes).map(([type, typeNodes]) => {
            const config = nodeTypeConfig[type as DbtNodeType];
            if (!config) return null;

            return (
              <AccordionItem key={type} value={type} className="border-b border-gray-800">
                <AccordionTrigger className="py-2 px-2 hover:bg-[#1a1d23] text-sm">
                  <div className="flex items-center gap-2">
                    <config.icon className={cn('size-4', config.color)} />
                    <span>{config.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {typeNodes.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1">
                    {typeNodes.map((node) => (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node)}
                        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[#1a1d23] cursor-move group text-sm"
                      >
                        <div className={cn('size-2 rounded-full', statusColors[node.status])} />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs truncate">{node.name}</div>
                          {node.lastDuration && (
                            <div className="text-[10px] text-gray-500">
                              {node.lastDuration}s
                              {node.lastCost && ` · $${node.lastCost.toFixed(2)}`}
                            </div>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {node.package}
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
