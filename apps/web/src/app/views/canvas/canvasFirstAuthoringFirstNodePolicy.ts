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
      id: 'dvt-sql-transform-1',
      kind: 'dvt:sql_transform',
      name: 'SQL transform 1',
    },
  },
  {
    canvasKind: 'dbt',
    node: {
      id: 'dbt-model-1',
      kind: 'dbt:model',
      name: 'Model 1',
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
