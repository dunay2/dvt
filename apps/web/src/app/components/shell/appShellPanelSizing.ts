/** Owned concern: translate requested drawer pixels into bounded resizable-panel percentages. */
export const OPERATIONAL_DRAWER_HEIGHT = { default: 300, min: 160, precision: 0.01 } as const;
export const OPERATIONAL_DRAWER_PERCENT = { min: 12, max: 90, default: 22 } as const;

export function normalizeOperationalDrawerHeight(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(OPERATIONAL_DRAWER_HEIGHT.min, value)
    : OPERATIONAL_DRAWER_HEIGHT.default;
}

export function resolveBottomDrawerDefaultSize(
  requestedHeight: number,
  viewportHeight: number
): number {
  if (
    !Number.isFinite(requestedHeight) ||
    !Number.isFinite(viewportHeight) ||
    requestedHeight <= 0 ||
    viewportHeight <= 0
  )
    return OPERATIONAL_DRAWER_PERCENT.default;
  return Math.min(
    OPERATIONAL_DRAWER_PERCENT.max,
    Math.max(OPERATIONAL_DRAWER_PERCENT.min, (requestedHeight / viewportHeight) * 100)
  );
}
