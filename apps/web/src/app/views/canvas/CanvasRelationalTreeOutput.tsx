/** Presentation-only terminal for the model output in a relational layout. */
import { Table2 } from 'lucide-react';
import type { CanvasRelationalTreeLayout } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export function CanvasRelationalTreeOutput({
  output,
  outputName,
  copy,
  onOpen,
}: Readonly<{
  output: NonNullable<CanvasRelationalTreeLayout['output']>;
  outputName: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onOpen?: () => void;
}>): JSX.Element {
  const style = {
    left: output.x,
    top: output.y,
    width: output.width,
    height: output.height,
  };
  const content = (
    <>
      <Table2 aria-hidden="true" className="size-4 shrink-0 text-emerald-300" />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold text-(--text-primary)">
          {outputName}
        </span>
        <span className="block text-[9px] uppercase tracking-wide text-emerald-300">
          {copy.relationalTreeOutputLabel}
        </span>
      </span>
    </>
  );
  const className =
    'absolute z-10 flex items-center gap-2 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 text-left shadow-sm';
  if (onOpen == null)
    return (
      <div data-slot="canvas-relational-tree-output" className={className} style={style}>
        {content}
      </div>
    );
  return (
    <button
      type="button"
      data-slot="canvas-relational-tree-output"
      aria-label={`${outputName} · ${copy.relationalTreeOutputLabel}`}
      onClick={onOpen}
      className={`${className} transition-colors hover:bg-emerald-900/35 focus-visible:outline-2 focus-visible:outline-(--focus-ring)`}
      style={style}
    >
      {content}
    </button>
  );
}
