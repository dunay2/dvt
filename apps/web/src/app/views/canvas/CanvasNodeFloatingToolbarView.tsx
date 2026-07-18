/** Owned concern: render the node floating toolbar from an already-derived presentation model. */
import { Code2, MoreHorizontal, Snowflake } from 'lucide-react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import type { CanvasNodeFloatingToolbarModel } from './canvasNodeFloatingToolbarModel';
import {
  canvasNodeFloatingToolbarClasses,
  resolveCanvasNodeFloatingToolbarActionClassName,
  resolveCanvasNodeFloatingToolbarActionState,
} from './canvasNodeFloatingToolbarTokens';

export type CanvasNodeFloatingToolbarViewProps = Readonly<{
  model: CanvasNodeFloatingToolbarModel;
}>;

const ACTION_ICON = {
  code: Code2,
  freeze: Snowflake,
  more: MoreHorizontal,
} as const;

export function CanvasNodeFloatingToolbarView({
  model,
}: CanvasNodeFloatingToolbarViewProps): ReactElement {
  return createPortal(
    <div
      data-slot="canvas-node-floating-toolbar"
      data-token-scope="canvas-node-floating-toolbar"
      aria-label={model.accessibleLabel}
      className={canvasNodeFloatingToolbarClasses.surface}
      style={
        {
          '--node-toolbar-x': `${model.position.x}px`,
          '--node-toolbar-y': `${model.position.y}px`,
        } as React.CSSProperties
      }
    >
      <TooltipProvider delayDuration={250}>
        {model.actions.map((action) => {
          const Icon = ACTION_ICON[action.id];
          const tooltip = action.available ? action.description : action.unavailableReason;

          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={action.label}
                  aria-disabled={action.available ? undefined : 'true'}
                  aria-pressed={action.id === 'freeze' ? action.pressed : undefined}
                  data-toolbar-action={action.id}
                  data-tone={action.tone}
                  data-action-state={resolveCanvasNodeFloatingToolbarActionState(action)}
                  className={resolveCanvasNodeFloatingToolbarActionClassName(action)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (action.available) {
                      action.onSelect?.();
                    }
                  }}
                >
                  <Icon className={canvasNodeFloatingToolbarClasses.icon} aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{tooltip}</TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>,
    document.body
  );
}
