/** Owned concern: read node-workbench geometry from the rendered Canvas surface. */
import {
  CANVAS_NODE_WORKBENCH_INSET,
  type CanvasNodeWorkbenchAnchorBounds,
  type CanvasNodeWorkbenchBounds,
} from './canvasNodeWorkbenchPositionModel';

const DEFAULT_SURFACE_WIDTH = 448;
const DEFAULT_SURFACE_HEIGHT = 640;

export type CanvasNodeWorkbenchGeometry = Readonly<{
  anchor: CanvasNodeWorkbenchAnchorBounds | null;
  bounds: CanvasNodeWorkbenchBounds;
}>;

function resolveDimension(primary: number, secondary: number, fallback: number): number {
  if (primary > 0) {
    return primary;
  }
  return secondary > 0 ? secondary : fallback;
}

export function findCanvasGraphNodeElement(nodeId: string | null): HTMLElement | null {
  if (nodeId == null) {
    return null;
  }
  return (
    Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node')).find(
      (candidate) => candidate.dataset.id === nodeId
    ) ?? null
  );
}

export function readCanvasNodeWorkbenchGeometry(
  surface: HTMLDivElement | null,
  anchorNodeId: string | null
): CanvasNodeWorkbenchGeometry {
  const container =
    surface?.offsetParent instanceof HTMLElement ? surface.offsetParent : surface?.parentElement;
  const containerRect = container?.getBoundingClientRect();
  const surfaceRect = surface?.getBoundingClientRect();
  const viewportWidth = typeof window === 'undefined' ? DEFAULT_SURFACE_WIDTH : window.innerWidth;
  const viewportHeight =
    typeof window === 'undefined' ? DEFAULT_SURFACE_HEIGHT : window.innerHeight;
  const containerWidth = resolveDimension(
    containerRect?.width ?? 0,
    container?.clientWidth ?? 0,
    viewportWidth
  );
  const containerHeight = resolveDimension(
    containerRect?.height ?? 0,
    container?.clientHeight ?? 0,
    viewportHeight
  );
  const availableWidth = Math.max(0, containerWidth - CANVAS_NODE_WORKBENCH_INSET * 2);
  const availableHeight = Math.max(0, containerHeight - CANVAS_NODE_WORKBENCH_INSET * 2);
  const anchorRect = findCanvasGraphNodeElement(anchorNodeId)?.getBoundingClientRect();

  return {
    anchor:
      anchorRect != null && anchorRect.width > 0 && anchorRect.height > 0
        ? {
            left: anchorRect.left - (containerRect?.left ?? 0),
            right: anchorRect.right - (containerRect?.left ?? 0),
            top: anchorRect.top - (containerRect?.top ?? 0),
          }
        : null,
    bounds: {
      containerWidth,
      containerHeight,
      surfaceWidth: Math.min(
        resolveDimension(surfaceRect?.width ?? 0, surface?.offsetWidth ?? 0, DEFAULT_SURFACE_WIDTH),
        availableWidth
      ),
      surfaceHeight: Math.min(
        resolveDimension(
          surfaceRect?.height ?? 0,
          surface?.offsetHeight ?? 0,
          DEFAULT_SURFACE_HEIGHT
        ),
        availableHeight
      ),
    },
  };
}
