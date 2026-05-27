/** Owned concern: render the Canvas workspace explorer for existing project resources. */
import { PanelLeftClose, Upload } from 'lucide-react';

import { graphStatusDotClasses, graphVisualClasses } from '../plugins/graph/graphVisualTokens';
import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../types/canonical';

import type {
  CanvasWorkspaceResource,
  CanvasWorkspaceResourceGroup,
} from './canvasWorkspaceExplorerModel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

interface DbtExplorerProps {
  resourceGroups: readonly CanvasWorkspaceResourceGroup[];
  canEditGraph?: boolean;
  onResourceDragStart?: (resource: CanvasWorkspaceResource) => void;
  onHide?: () => void;
  onOpenDataRegistry?: () => void;
}

export default function DbtExplorer({
  resourceGroups,
  canEditGraph = true,
  onResourceDragStart,
  onHide,
  onOpenDataRegistry,
}: Readonly<DbtExplorerProps>) {
  const handleDragStart = (e: React.DragEvent, resource: CanvasWorkspaceResource) => {
    if (!canEditGraph || resource.dragPayload == null) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(CANONICAL_NODE_DRAG_MIME_TYPE, JSON.stringify(resource.dragPayload));
    onResourceDragStart?.(resource);
  };

  return (
    <div className={graphVisualClasses.contextPanelLeftShell}>
      <div className={graphVisualClasses.contextPanelHeader}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className={graphVisualClasses.contextPanelTitle}>Project Resources</h2>
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
              Explore project resources and discover dependencies before attaching them to the
              canvas.
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

      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          defaultValue={resourceGroups.slice(0, 3).map((group) => group.id)}
          className="px-2"
        >
          {resourceGroups.map((group) => {
            const Icon = group.icon;
            return (
              <AccordionItem
                key={group.id}
                value={group.id}
                className={graphVisualClasses.contextPanelAccordionItem}
              >
                <AccordionTrigger className={graphVisualClasses.contextPanelAccordionTrigger}>
                  <div className="flex items-center gap-2">
                    <Icon className="size-4" style={{ color: group.color }} />
                    <span>{group.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {group.resources.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1">
                    {group.resources.map((resource) => (
                      <div
                        key={resource.id}
                        draggable={canEditGraph && resource.dragPayload != null}
                        onDragStart={(event) => handleDragStart(event, resource)}
                        className={cn(
                          'group flex items-center gap-2 rounded px-3 py-2 text-sm',
                          canEditGraph && resource.dragPayload != null
                            ? graphVisualClasses.contextPanelInteractiveRow
                            : graphVisualClasses.contextPanelReadOnlyRow
                        )}
                      >
                        <div
                          className={cn(
                            'size-2 rounded-full',
                            graphStatusDotClasses[resource.status]
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-xs">{resource.label}</div>
                          {resource.detail != null && (
                            <div className={graphVisualClasses.contextPanelSecondaryText}>
                              {resource.detail}
                            </div>
                          )}
                        </div>
                        <div className="opacity-0 transition-opacity group-hover:opacity-100">
                          <Badge variant="outline" className="px-1 py-0 text-[10px]">
                            {resource.badge}
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
