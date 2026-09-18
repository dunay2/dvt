/** Owned concern: calculate bounded zoom for measured relational-tree content. */
export const CANVAS_RELATIONAL_TREE_MIN_ZOOM = 0.35;
export const CANVAS_RELATIONAL_TREE_MAX_ZOOM = 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateCanvasRelationalTreeFit({
  viewportWidth,
  viewportHeight,
  contentWidth,
  contentHeight,
  padding = 32,
}: Readonly<{
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  padding?: number;
}>): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
    return 1;
  }
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  return clamp(
    Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight),
    CANVAS_RELATIONAL_TREE_MIN_ZOOM,
    CANVAS_RELATIONAL_TREE_MAX_ZOOM
  );
}

export function changeCanvasRelationalTreeZoom(current: number, delta: number): number {
  return clamp(
    Math.round((current + delta) * 100) / 100,
    CANVAS_RELATIONAL_TREE_MIN_ZOOM,
    CANVAS_RELATIONAL_TREE_MAX_ZOOM
  );
}
