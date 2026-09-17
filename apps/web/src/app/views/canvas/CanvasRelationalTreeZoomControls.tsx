/** Owned concern: present zoom controls for the relational-tree viewport. */
import { Minus, Plus, Scan } from 'lucide-react';

import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export function CanvasRelationalTreeZoomControls({
  copy,
  onChange,
  onFit,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (delta: number) => void;
  onFit: () => void;
}>): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={copy.reactFlowZoomOutLabel}
        onClick={() => onChange(-0.25)}
        className="rounded p-1 hover:bg-(--surface-subtle)"
      >
        <Minus className="size-4" />
      </button>
      <button
        type="button"
        aria-label={copy.reactFlowFitViewLabel}
        onClick={onFit}
        className="rounded p-1 hover:bg-(--surface-subtle)"
      >
        <Scan className="size-4" />
      </button>
      <button
        type="button"
        aria-label={copy.reactFlowZoomInLabel}
        onClick={() => onChange(0.25)}
        className="rounded p-1 hover:bg-(--surface-subtle)"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
