/** Owned concern: present one scalable, keyboard-selectable relational tree viewport. */
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { CanvasRelationalTreeZoomControls } from './CanvasRelationalTreeZoomControls';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';

export function CanvasRelationalTreeView({
  root,
  selectedLocator,
  copy,
  onSelect,
}: Readonly<{
  root: CanvasRelationalTreeNode;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
}>): JSX.Element {
  const viewport = useCanvasRelationalTreeViewport(root.locator);

  return (
    <section
      className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      aria-label={copy.relationalTreeLabel}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-(--border-subtle) bg-(--surface-panel) px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
          {copy.relationalTreeLabel}
        </h3>
        <CanvasRelationalTreeZoomControls
          copy={copy}
          zoom={viewport.zoom}
          onChange={viewport.changeZoom}
          onFit={viewport.fit}
        />
      </header>
      <div
        ref={viewport.viewportRef}
        data-slot="canvas-relational-tree-viewport"
        data-panning={viewport.panning ? 'true' : 'false'}
        className="min-h-0 flex-1 cursor-grab overflow-auto bg-(--surface-subtle) p-4 active:cursor-grabbing md:p-6"
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onPointerCancel={viewport.onPointerUp}
      >
        <div
          ref={viewport.contentRef}
          data-slot="canvas-relational-tree"
          className="mx-auto w-max origin-top transition-transform duration-150"
          style={{ transform: `scale(${viewport.zoom})`, transformOrigin: 'top center' }}
        >
          <CanvasRelationalTreeLayout
            root={root}
            selectedLocator={selectedLocator}
            copy={copy}
            onSelect={onSelect}
          />
        </div>
      </div>
    </section>
  );
}
