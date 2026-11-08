/** Owned concern: compare Canvas placement values independently of collection representation. */
export type CanvasPosition = { x: number; y: number };
type CanvasPositions =
  Readonly<Record<string, CanvasPosition>> | ReadonlyMap<string, CanvasPosition>;

function isPositionMap(
  positions: CanvasPositions
): positions is ReadonlyMap<string, CanvasPosition> {
  return positions instanceof Map;
}

export function areCanvasPositionsEqual(left: CanvasPositions, right: CanvasPositions): boolean {
  if (left === right) return true;
  const leftIsMap = isPositionMap(left);
  const rightIsMap = isPositionMap(right);
  const leftSize = leftIsMap ? left.size : Object.keys(left).length;
  const rightSize = rightIsMap ? right.size : Object.keys(right).length;
  if (leftSize !== rightSize) return false;
  const entries = leftIsMap ? left.entries() : Object.entries(left);
  for (const [id, position] of entries) {
    const next = rightIsMap ? right.get(id) : right[id];
    if (next == null || position.x !== next.x || position.y !== next.y) return false;
  }
  return true;
}
