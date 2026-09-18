/** Owned concern: translate requested drawer pixels into bounded resizable-panel percentages. */
const MINIMUM_DRAWER_PERCENT = 12;
const MAXIMUM_DRAWER_PERCENT = 90;
const DEFAULT_DRAWER_PERCENT = 22;

export function resolveBottomDrawerDefaultSize(
  requestedHeight: number,
  viewportHeight: number
): number {
  if (requestedHeight <= 0 || viewportHeight <= 0) return DEFAULT_DRAWER_PERCENT;
  return Math.min(
    MAXIMUM_DRAWER_PERCENT,
    Math.max(MINIMUM_DRAWER_PERCENT, (requestedHeight / viewportHeight) * 100)
  );
}
