/** Owned concern: render the node floating toolbar from an already-derived presentation model. */
import { Code2, MoreHorizontal, Play, Snowflake } from 'lucide-react';
import type { ReactElement } from 'react';

import { cn } from '../../components/ui/utils';
import type {
  CanvasNodeFloatingToolbarAction,
  CanvasNodeFloatingToolbarModel,
} from './canvasNodeFloatingToolbarModel';

export type CanvasNodeFloatingToolbarViewProps = Readonly<{
  model: CanvasNodeFloatingToolbarModel;
}>;

const ACTION_ICON = {
  code: Code2,
  freeze: Snowflake,
  play: Play,
  more: MoreHorizontal,
} as const;

function getActionClassName(action: CanvasNodeFloatingToolbarAction): string {
  return cn(
    'nodrag nopan inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition',
    'border border-transparent bg-white/0 text-slate-100 hover:border-white/20 hover:bg-white/10',
    action.tone === 'success' && 'text-emerald-300 hover:text-emerald-200',
    !action.available && 'cursor-not-allowed opacity-45 hover:border-transparent hover:bg-white/0'
  );
}

export function CanvasNodeFloatingToolbarView({
  model,
}: CanvasNodeFloatingToolbarViewProps): ReactElement {
  return (
    <div
      data-slot="canvas-node-floating-toolbar"
      aria-label={`Acciones de nodo ${model.nodeName}`}
      className={cn(
        'absolute z-30 flex items-center gap-1 rounded-lg border border-white/12',
        'bg-slate-950/95 px-1.5 py-1.5 shadow-2xl shadow-slate-950/40 backdrop-blur',
        'translate-x-[var(--node-toolbar-x)] translate-y-[var(--node-toolbar-y)]'
      )}
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
            className={getActionClassName(action)}
            onClick={(event) => {
              event.stopPropagation();
              if (action.available) {
                action.onSelect?.();
              }
            }}
          >
            <Icon className="size-4" aria-hidden="true" />
            {action.id === 'play' || action.id === 'more' ? null : <span>{action.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
