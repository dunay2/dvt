/** Compact navigation controls for the isolated scalar-expression viewport. */
import { Maximize, Minus, Plus } from 'lucide-react';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export function CanvasRelationalScalarGraphControls({
  zoom,
  onChange,
  onFit,
  copy,
}: Readonly<{
  zoom: number;
  onChange: (delta: number) => void;
  onFit: () => void;
  copy: Pick<
    CanvasRelationalTreeWorkbenchCopy,
    'reactFlowZoomOutLabel' | 'reactFlowFitViewLabel' | 'reactFlowZoomInLabel'
  >;
}>): JSX.Element {
  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded border border-(--border-subtle) bg-(--surface-panel) p-1">
      <button
        type="button"
        aria-label={copy.reactFlowZoomOutLabel}
        className="grid size-7 place-items-center"
        onClick={() => onChange(-0.1)}
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-10 text-center text-xs">{Math.round(zoom * 100)}%</span>
      <button
        type="button"
        aria-label={copy.reactFlowFitViewLabel}
        className="grid size-7 place-items-center"
        onClick={onFit}
      >
        <Maximize className="size-4" />
      </button>
      <button
        type="button"
        aria-label={copy.reactFlowZoomInLabel}
        className="grid size-7 place-items-center"
        onClick={() => onChange(0.1)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
