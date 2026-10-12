/** Owns the single rendered and hit-tested geometry for algebraic drop choices. */
export const CANVAS_ALGEBRAIC_DROP_INSET = 8;
export const CANVAS_ALGEBRAIC_DROP_PADDING = 8;
export const CANVAS_ALGEBRAIC_DROP_GAP = 4;

export function resolveCanvasAlgebraicDropGrid(operationCount: number): Readonly<{
  columns: number;
  rows: number;
}> {
  const columns = operationCount === 1 ? 1 : 2;
  return { columns, rows: Math.max(1, Math.ceil(operationCount / columns)) };
}

export function resolveCanvasAlgebraicDropIndex(
  args: Readonly<{
    operationCount: number;
    width: number;
    height: number;
    x: number;
    y: number;
  }>
): number | null {
  const { columns, rows } = resolveCanvasAlgebraicDropGrid(args.operationCount);
  const offset = CANVAS_ALGEBRAIC_DROP_INSET + CANVAS_ALGEBRAIC_DROP_PADDING;
  const width = args.width - offset * 2;
  const height = args.height - offset * 2;
  const x = args.x - offset;
  const y = args.y - offset;
  if (width <= 0 || height <= 0 || x < 0 || y < 0 || x > width || y > height) return null;
  const cellWidth = (width - CANVAS_ALGEBRAIC_DROP_GAP * (columns - 1)) / columns;
  const cellHeight = (height - CANVAS_ALGEBRAIC_DROP_GAP * (rows - 1)) / rows;
  if (cellWidth <= 0 || cellHeight <= 0) return null;
  const strideX = cellWidth + CANVAS_ALGEBRAIC_DROP_GAP;
  const strideY = cellHeight + CANVAS_ALGEBRAIC_DROP_GAP;
  const column = Math.min(columns - 1, Math.floor(x / strideX));
  const row = Math.min(rows - 1, Math.floor(y / strideY));
  if (x - column * strideX > cellWidth || y - row * strideY > cellHeight) return null;
  const index = row * columns + column;
  return index < args.operationCount ? index : null;
}
