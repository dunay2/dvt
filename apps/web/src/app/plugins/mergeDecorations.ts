import type { MergedNodeDecoration, NodeDecoration } from './contracts/NodeRendering';

// ---------------------------------------------------------------------------
// mergeDecorations — shell-owned merge function
//
// Plugins declare NodeDecoration per-node. The shell applies these rules
// to produce a single MergedNodeDecoration that the NodeRenderer receives.
// Plugins NEVER call this directly — it runs in the canvas render cycle.
//
// Merge rules:
//   borderColor:      exclusive overlay wins; if none, highest-priority additive
//   backgroundColor:  exclusive overlay wins; if none, highest-priority additive
//   dimmed:           OR of all active overlay results (any dimmed = node is dimmed)
// ---------------------------------------------------------------------------

export function mergeDecorations(
  exclusiveDecoration: NodeDecoration | null,
  additiveDecorations: NodeDecoration[],
): MergedNodeDecoration | null {
  if (!exclusiveDecoration && additiveDecorations.length === 0) return null;

  const borderColor =
    exclusiveDecoration?.borderColor ??
    additiveDecorations.find((d) => d.borderColor)?.borderColor;

  const backgroundColor =
    exclusiveDecoration?.backgroundColor ??
    additiveDecorations.find((d) => d.backgroundColor)?.backgroundColor;

  const dimmed =
    (exclusiveDecoration?.dimmed ?? false) ||
    additiveDecorations.some((d) => d.dimmed === true);

  // Return null if nothing is actually set
  if (!borderColor && !backgroundColor && !dimmed) return null;

  return {
    borderColor,
    backgroundColor,
    dimmed: dimmed || undefined,
  };
}
