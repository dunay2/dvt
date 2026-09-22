/** Explicit data retrieval; selecting a card or column never runs this action. */
import { Play } from 'lucide-react';
import { canvasNodeEmbeddedControlProps } from './canvasNodeInteractionBoundary';

export function CanvasNodeDataAction({
  label,
  onExecute,
  disabled = false,
  title,
}: Readonly<{
  label: string;
  onExecute: () => void;
  disabled?: boolean;
  title?: string;
}>): JSX.Element {
  return (
    <button
      type="button"
      {...canvasNodeEmbeddedControlProps}
      data-slot="canvas-node-execute"
      disabled={disabled}
      title={title}
      className="nodrag nopan mt-1 flex w-full items-center justify-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-panel) py-2 text-xs text-(--text-muted) opacity-0 transition-opacity group-hover/canvas-node:opacity-100 group-focus-within/canvas-node:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:text-(--text-strong) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail < 2) onExecute();
      }}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
      }}
    >
      <Play aria-hidden="true" className="size-3.5" />
      {label}
    </button>
  );
}
