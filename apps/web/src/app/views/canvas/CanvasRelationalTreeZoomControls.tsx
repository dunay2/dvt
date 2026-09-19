/** Owned concern: present zoom controls for the relational-tree viewport. */
import { Minus, Plus, Scan } from 'lucide-react';

import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  CANVAS_RELATIONAL_TREE_MAX_ZOOM,
  CANVAS_RELATIONAL_TREE_MIN_ZOOM,
} from './canvasRelationalTreeViewport';

export function CanvasRelationalTreeZoomControls({
  copy,
  zoom,
  minimumZoom = CANVAS_RELATIONAL_TREE_MIN_ZOOM,
  onChange,
  onFit,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  zoom: number;
  minimumZoom?: number;
  onChange: (delta: number) => void;
  onFit: () => void;
}>): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={copy.reactFlowZoomOutLabel}
        disabled={zoom <= minimumZoom}
        onClick={() => onChange(-0.15)}
        className="rounded p-1 hover:bg-(--surface-subtle) disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <output
        data-slot="canvas-relational-tree-zoom"
        aria-live="polite"
        className="min-w-10 text-center font-mono text-[10px] tabular-nums text-(--text-muted)"
      >
        {Math.round(zoom * 100)}%
      </output>
      <button
        type="button"
        aria-label={copy.reactFlowFitViewLabel}
        data-slot="canvas-relational-tree-fit"
        onClick={onFit}
        className="rounded p-1 hover:bg-(--surface-subtle)"
      >
        <Scan className="size-4" />
      </button>
      <button
        type="button"
        aria-label={copy.reactFlowZoomInLabel}
        disabled={zoom >= CANVAS_RELATIONAL_TREE_MAX_ZOOM}
        onClick={() => onChange(0.15)}
        className="rounded p-1 hover:bg-(--surface-subtle) disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
