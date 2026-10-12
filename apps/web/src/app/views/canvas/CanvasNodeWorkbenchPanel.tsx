/** Render the node-workbench header and container using its coordinated view state. */
import { CircleHelp, X } from 'lucide-react';

import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import {
  inspectorStatusDotClasses,
  inspectorVisualClasses,
} from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '../../components/ui/utils';
import { SourceNodeWorkbenchHeaderIdentity } from './SourceNodeWorkbenchHeaderIdentity';
import { CanvasNodeWorkbenchSections } from './CanvasNodeWorkbenchSections';
import {
  useCanvasNodeWorkbenchController,
  type CanvasNodeWorkbenchPanelProps,
} from './useCanvasNodeWorkbenchController';

export type { CanvasNodeWorkbenchPanelProps } from './useCanvasNodeWorkbenchController';

export function CanvasNodeWorkbenchPanel(props: CanvasNodeWorkbenchPanelProps): JSX.Element {
  const controller = useCanvasNodeWorkbenchController(props);
  const { node, copy, containsCanonicalCodeOutput } = controller;
  const { onClose } = props;
  const dotClass = inspectorStatusDotClasses[node.status] ?? inspectorStatusDotClasses.idle;
  return (
    <div
      data-slot="canvas-node-workbench-panel"
      className="flex h-full min-h-0 min-w-0 w-full flex-col"
    >
      <div className={inspectorVisualClasses.contextPanelHeaderRow}>
        <div className="min-w-0 flex-1">
          {node.kind === 'dvt:source' ? (
            <SourceNodeWorkbenchHeaderIdentity node={node} />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <div
                data-slot="canvas-node-workbench-status"
                className={cn('size-2 shrink-0 rounded-full', dotClass)}
              />
              <h2 className={cn('truncate', inspectorVisualClasses.contextPanelTitle)}>
                {node.name}
              </h2>
              <span
                data-slot="canvas-node-workbench-kind"
                className={cn('shrink-0 font-mono', inspectorVisualClasses.contextPanelSubtitle)}
              >
                {resolveNodeKindRegistration(node.kind).label}
              </span>
            </div>
          )}
        </div>
        <div
          data-slot="canvas-node-workbench-header-actions"
          className="ml-auto flex shrink-0 items-center gap-1"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-slot="canvas-node-workbench-help"
                aria-label={copy.inspectorEditablePropertiesTitle}
              >
                <CircleHelp className="size-4" aria-hidden="true" />
                <span className="sr-only">{copy.inspectorEditablePropertiesTitle}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-72">
              {copy.inspectorEditablePropertiesDescription}
            </TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-slot="canvas-node-workbench-close"
            aria-label={copy.nodeWorkbenchCloseLabel}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{copy.nodeWorkbenchCloseLabel}</span>
          </Button>
        </div>
      </div>

      {containsCanonicalCodeOutput ? (
        <div
          data-slot="canvas-node-workbench-contained-body"
          className="min-h-0 flex-1 overflow-hidden p-4"
        >
          <CanvasNodeWorkbenchSections {...props} controller={controller} />
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            <CanvasNodeWorkbenchSections {...props} controller={controller} />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
