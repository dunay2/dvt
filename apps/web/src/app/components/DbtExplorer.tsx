/** Owned concern: render the project-node explorer plus active canvas node creation affordances. */
import { PanelLeftClose, Upload } from 'lucide-react';
import { useMemo } from 'react';

import { graphStatusDotClasses, graphVisualClasses } from '../plugins/graph/graphVisualTokens';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
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
  nodeKinds?: readonly NodeKindRegistration[];
  canEditGraph?: boolean;
  onCreateAuthoringNode?: (registration: NodeKindRegistration) => void;
  onNodeDragStart?: (node: CanonicalNode) => void;
  onHide?: () => void;
  onOpenDataRegistry?: () => void;
}

function resolveNodeBadgeText(node: CanonicalNode): string {
  const packageName = typeof node.metadata?.package === 'string' ? node.metadata.package : null;
  return packageName ?? node.pluginId;
}

export default function DbtExplorer({
  nodes,
  nodeKinds = [],
  canEditGraph = true,
  onCreateAuthoringNode,
  onNodeDragStart,
  onHide,
  onOpenDataRegistry,
}: Readonly<DbtExplorerProps>) {
  const canCreateAuthoringNode =
    canEditGraph && onCreateAuthoringNode != null && nodeKinds.length > 0;
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
    <div className={graphVisualClasses.contextPanelLeftShell}>
      <div className={graphVisualClasses.contextPanelHeader}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className={graphVisualClasses.contextPanelTitle}>Project Nodes</h2>
            <p className={graphVisualClasses.contextPanelSubtitle}>
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
              className={graphVisualClasses.contextPanelIconButton}
              onClick={onHide}
              aria-label="Hide explorer panel"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>

        {onOpenDataRegistry && (
          <div className="mt-2 space-y-2">
            <p className={graphVisualClasses.contextPanelHelpText}>
              Explore project nodes, discover dependencies, and add new objects to this workspace.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenDataRegistry}
              disabled={!canEditGraph}
              className={cn('w-full gap-1.5', graphVisualClasses.contextPanelActionButton)}
            >
              <Upload className="size-3.5" />
              Add data
            </Button>
          </div>
        )}
      </div>

      {canCreateAuthoringNode ? (
        <div className={graphVisualClasses.contextPanelSection}>
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>Add node</h3>
          <div className="mt-2 grid gap-2">
            {nodeKinds.map((registration) => {
              const Icon = registration.icon;
              return (
                <Button
                  key={registration.kind}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={graphVisualClasses.contextPanelActionButton}
                  onClick={() => onCreateAuthoringNode(registration)}
                >
                  <Icon className="size-3.5" />
                  {registration.label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          defaultValue={groupedNodes.slice(0, 3).map(([kind]) => kind)}
          className="px-2"
        >
          {groupedNodes.map(([kind, kindNodes]) => {
            const config = resolveNodeKindRegistration(kind);

            return (
              <AccordionItem
                key={kind}
                value={kind}
                className={graphVisualClasses.contextPanelAccordionItem}
              >
                <AccordionTrigger className={graphVisualClasses.contextPanelAccordionTrigger}>
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
                            ? graphVisualClasses.contextPanelInteractiveRow
                            : graphVisualClasses.contextPanelReadOnlyRow
                        )}
                      >
                        <div
                          className={cn('size-2 rounded-full', graphStatusDotClasses[node.status])}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-xs">{node.name}</div>
                          {node.lastDuration != null && (
                            <div className={graphVisualClasses.contextPanelSecondaryText}>
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
