/** Owned concern: present one scalable, keyboard-selectable relational graph viewport. */

import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { CanvasRelationalTreeZoomControls } from './CanvasRelationalTreeZoomControls';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';

export function CanvasRelationalTreeView({
  outputName,
  root,
  selectedLocator,
  copy,
  onSelect,
  onExpand,
}: Readonly<{
  outputName: string;
  root: CanvasRelationalTreeNode;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
}>): JSX.Element {
  const viewport = useCanvasRelationalTreeViewport(root.locator);

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      aria-label={copy.relationalTreeLabel}
    >
      <div className="relative min-h-0 flex-1">
        <div
          ref={viewport.viewportRef}
          data-slot="canvas-relational-tree-viewport"
          data-panning={viewport.panning ? 'true' : 'false'}
          className="absolute inset-0 cursor-grab overflow-auto p-5 active:cursor-grabbing"
          style={{
            backgroundColor: 'var(--surface-subtle)',
            backgroundImage:
              'radial-gradient(circle, color-mix(in srgb, var(--border-subtle) 72%, transparent) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
          onPointerDown={viewport.onPointerDown}
          onPointerMove={viewport.onPointerMove}
          onPointerUp={viewport.onPointerUp}
          onPointerCancel={viewport.onPointerUp}
        >
          <div
            ref={viewport.contentRef}
            data-slot="canvas-relational-tree"
            className="w-max"
            style={{ zoom: viewport.zoom }}
          >
            <CanvasRelationalTreeLayout
              outputName={outputName}
              root={root}
              selectedLocator={selectedLocator}
              copy={copy}
              onSelect={onSelect}
              onExpand={onExpand}
            />
          </div>
        </div>
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-(--border-subtle) bg-(--surface-panel) p-1 shadow-md">
          <CanvasRelationalTreeZoomControls
            copy={copy}
            zoom={viewport.zoom}
            minimumZoom={viewport.minimumZoom}
            onChange={viewport.changeZoom}
            onFit={viewport.fit}
          />
        </div>
      </div>
    </section>
  );
}
