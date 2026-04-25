/** Owned concern: define the DVT transformation Canvas graph strategy. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasGraphStrategy } from '../graphStrategyContracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCanonicalNode(value: unknown): value is CanonicalNode {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.pluginId === 'string' &&
    typeof value.kind === 'string' &&
    typeof value.role === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.tags)
  );
}

function isCanonicalEdge(value: unknown): value is CanonicalEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sourceId === 'string' &&
    typeof value.targetId === 'string' &&
    typeof value.relation === 'string'
  );
}

export const transformationCanvasGraphStrategy: CanvasGraphStrategy = {
  id: 'transformation',
  authoringPolicy: {
    toolbarMode: 'transformation',
    enforceTransformationTopology: true,
  },
  mapNodeToCanonical: (node) => (isCanonicalNode(node) ? node : null),
  mapEdgeToCanonical: (edge) => (isCanonicalEdge(edge) ? edge : null),
  parseDropPayload: () => null,
};
