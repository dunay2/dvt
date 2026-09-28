import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanonicalNode } from '../../types/canonical';
import type { ComponentProps } from 'react';
import {
  RelationalLayoutSession,
  useRelationalLayout,
} from './relational-layout/RelationalLayoutSession';
import { RelationalViewportSurface } from './relational-layout/RelationalViewportSurface';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { CanvasRelationalTreeZoomControls } from './CanvasRelationalTreeZoomControls';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';
import {
  CANVAS_RELATIONAL_OPERATION_DRAG_TYPE,
  CANVAS_RELATIONAL_SOURCE_DRAG_TYPE,
  readCanvasRelationalOperationDrag,
  readCanvasRelationalSourceDrag,
} from './canvasRelationalTreeDrag';
import type { CanvasStagedOperationKind } from './canvasStagedOperation';

function TreeView({
  outputName,
  root,
  selectedLocator,
  copy,
  onSelect,
  onExpand,
  onRemove,
  transformNode,
  onDropSource,
  onDropOperation,
  onOpenOutput,
  onDisconnectOutput,
  sourceOutputFieldsByRelationId,
}: Readonly<{
  outputName: string;
  root: CanvasRelationalTreeNode;
  selectedLocator: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onSelect: (locator: string) => void;
  onExpand?: (locator: string) => void;
  onRemove?: (relationId: string, keep?: 'left' | 'right') => void;
  transformNode?: CanonicalNode;
  onDropSource?: (nodeId: string) => string | null | void;
  onDropOperation?: (operation: CanvasStagedOperationKind) => string | null;
  onOpenOutput?: () => void;
  onDisconnectOutput?: () => void;
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>;
}>): JSX.Element {
  const viewport = useCanvasRelationalTreeViewport();
  const { setPosition } = useRelationalLayout();

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      aria-label={copy.relationalTreeLabel}
    >
      <div className="relative min-h-0 flex-1">
        <RelationalViewportSurface
          viewport={viewport}
          onDragOver={(event) => {
            if (!(
              (onDropSource != null &&
                event.dataTransfer.types.includes(CANVAS_RELATIONAL_SOURCE_DRAG_TYPE)) ||
              (onDropOperation != null &&
                event.dataTransfer.types.includes(CANVAS_RELATIONAL_OPERATION_DRAG_TYPE))
            ))
              return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event) => {
            const operation = readCanvasRelationalOperationDrag(event.dataTransfer);
            if (operation != null && onDropOperation != null) {
              event.preventDefault();
              const bounds = viewport.contentRef.current?.getBoundingClientRect();
              const id = onDropOperation(operation);
              if (id != null && bounds != null) {
                viewport.stopAutoFit();
                setPosition(id, {
                  x: Math.max(0, (event.clientX - bounds.left) / viewport.zoom),
                  y: Math.max(0, (event.clientY - bounds.top) / viewport.zoom),
                });
              }
              return;
            }
            if (onDropSource == null) return;
            const nodeId = readCanvasRelationalSourceDrag(event.dataTransfer);
            if (nodeId == null) return;
            event.preventDefault();
            const bounds = viewport.contentRef.current?.getBoundingClientRect();
            const id = onDropSource(nodeId);
            if (typeof id === 'string' && bounds != null) {
              viewport.stopAutoFit();
              setPosition(id, {
                x: Math.max(0, (event.clientX - bounds.left) / viewport.zoom),
                y: Math.max(0, (event.clientY - bounds.top) / viewport.zoom),
              });
            }
          }}
        >
          <div
            ref={viewport.contentRef}
            data-slot="canvas-relational-tree"
            className="w-max"
            style={{ zoom: viewport.zoom }}
          >
            <CanvasRelationalTreeLayout
              sourceOutputFieldsByRelationId={sourceOutputFieldsByRelationId}
              outputName={outputName}
              root={root}
              selectedLocator={selectedLocator}
              copy={copy}
              onSelect={onSelect}
              onExpand={onExpand}
              onRemove={onRemove}
              zoom={viewport.zoom}
              panMode={viewport.panMode || viewport.panning}
              onManualLayout={viewport.stopAutoFit}
              onOpenOutput={onOpenOutput}
              onDisconnectOutput={onDisconnectOutput}
              semanticContext={transformNode == null ? undefined : { transformNode }}
            />
          </div>
        </RelationalViewportSurface>
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-(--border-subtle) bg-(--surface-panel) p-1 shadow-md">
          <CanvasRelationalTreeZoomControls
            copy={copy}
            zoom={viewport.zoom}
            minimumZoom={viewport.minimumZoom}
            onChange={viewport.changeZoom}
            onFit={viewport.fit}
            panMode={viewport.panMode}
            onTogglePan={viewport.togglePanMode}
          />
        </div>
      </div>
    </section>
  );
}

export function CanvasRelationalTreeView(props: ComponentProps<typeof TreeView>): JSX.Element {
  return (
    <RelationalLayoutSession>
      <TreeView {...props} />
    </RelationalLayoutSession>
  );
}
