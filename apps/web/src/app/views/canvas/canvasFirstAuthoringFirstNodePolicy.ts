/** Owned concern: resolve the expected first node for a first-authored canvas. */

import type {
  CanvasFirstAuthoringCanvas,
  CanvasFirstAuthoringNode,
} from './canvasFirstAuthoringLiveProof.types';

export type CanvasFirstAuthoringDefault = Readonly<{
  canvasKind: string;
  node: CanvasFirstAuthoringNode;
}>;

export const FIRST_AUTHORING_DEFAULTS: readonly CanvasFirstAuthoringDefault[] = [
  {
    canvasKind: 'transformation',
    node: {
      id: 'dvt-transform-1',
      kind: 'dvt:transform',
      name: 'Transform 1',
    },
  },
];

export function resolveExpectedFirstNode(
  canvas: CanvasFirstAuthoringCanvas
): CanvasFirstAuthoringNode | null {
  return FIRST_AUTHORING_DEFAULTS.find((entry) => entry.canvasKind === canvas.kind)?.node ?? null;
}

export function matchesExpectedFirstNode(
  node: CanvasFirstAuthoringNode,
  expectedNode: CanvasFirstAuthoringNode
): boolean {
  return (
    node.id === expectedNode.id &&
    node.kind === expectedNode.kind &&
    node.name === expectedNode.name
  );
}
