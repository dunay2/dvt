/** Owned concern: render the node floating toolbar from an already-derived presentation model. */
import { Code2, MoreHorizontal, Snowflake } from 'lucide-react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

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
      aria-label={`Acciones de nodo ${model.nodeName}`}
      className={canvasNodeFloatingToolbarClasses.surface}
      style={
        {
          '--node-toolbar-x': `${model.position.x}px`,
          '--node-toolbar-y': `${model.position.y}px`,
        } as React.CSSProperties
      }
    >
      {model.actions.map((action) => {
        const Icon = ACTION_ICON[action.id];

        return (
          <button
            key={action.id}
            type="button"
            aria-label={action.label}
            aria-disabled={action.available ? undefined : 'true'}
            title={action.available ? action.description : action.unavailableReason}
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
            {action.id === 'more' ? null : <span>{action.label}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
