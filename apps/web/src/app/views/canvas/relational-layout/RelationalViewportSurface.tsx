/** Owned concern: one cursor and pointer boundary for both relational views. */
import type { DragEventHandler, ReactNode } from 'react';
import type { useCanvasRelationalTreeViewport } from '../useCanvasRelationalTreeViewport';
import { useCanvasRelationalFieldSelection } from '../CanvasRelationalFieldSelectionProvider';

export function RelationalViewportSurface({
  viewport,
  draft = false,
  children,
  onDragOver,
  onDrop,
}: Readonly<{
  viewport: ReturnType<typeof useCanvasRelationalTreeViewport>;
  draft?: boolean;
  children: ReactNode;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
}>) {
  const fields = useCanvasRelationalFieldSelection();
  return (
    <div
      ref={viewport.viewportRef}
      data-slot={
        draft ? 'canvas-relational-tree-draft-viewport' : 'canvas-relational-tree-viewport'
      }
      data-panning={viewport.panning}
      className={`absolute inset-0 overflow-auto p-5 ${draft ? 'pb-16' : ''}`}
      style={{
        cursor: viewport.panning ? 'grabbing' : viewport.panMode ? 'grab' : 'default',
        backgroundColor: 'var(--surface-subtle)',
        backgroundImage:
          'radial-gradient(circle, color-mix(in srgb, var(--border-subtle) 72%, transparent) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
      onPointerDown={viewport.onPointerDown}
      onPointerMove={viewport.onPointerMove}
      onPointerUp={viewport.onPointerUp}
      onPointerCancel={viewport.onPointerCancel}
      onLostPointerCapture={viewport.onLostPointerCapture}
      onClickCapture={viewport.onClickCapture}
      onDragOver={(event) => {
        if (!fields?.backgroundDragOver(event)) onDragOver(event);
      }}
      onDrop={(event) => {
        if (!fields?.backgroundDrop(event)) onDrop(event);
      }}
    >
      {children}
    </div>
  );
}
