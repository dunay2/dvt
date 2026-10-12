/** Passive workspace layout; controllers supply the existing toolbar, graph and inspector. */
import type { ReactNode } from 'react';

export function CanvasRelationalTreeAuthoringTemplate({
  label,
  toolbar,
  viewport,
  inspector,
}: Readonly<{
  label: string;
  toolbar: ReactNode;
  viewport: ReactNode;
  inspector: ReactNode;
}>): JSX.Element {
  return (
    <section
      data-slot="canvas-relational-tree-block-canvas"
      aria-label={label}
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
    >
      {toolbar}
      <div className="canvas-operation-workspace relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {viewport}
        {inspector}
      </div>
    </section>
  );
}
