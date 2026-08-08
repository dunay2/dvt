/** Owned concern: map governed Python Canvas graph primitives to canonical graph values. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  isCanonicalEdgeRelation,
  isCanonicalNodeStatus,
  isCoreNodeRole,
  isPluginNodeKind,
  isRecord,
} from '../../types/canonicalGuards';
import type { CanvasGraphStrategy } from '../graphStrategyContracts';

function isCanonicalNode(value: unknown): value is CanonicalNode {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.pluginId === 'string' &&
    isPluginNodeKind(value.kind) &&
    isCoreNodeRole(value.role) &&
    isCanonicalNodeStatus(value.status) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string')
  );
}

function isCanonicalEdge(value: unknown): value is CanonicalEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sourceId === 'string' &&
    typeof value.targetId === 'string' &&
    isCanonicalEdgeRelation(value.relation)
  );
}

export const pythonCanvasGraphStrategy: CanvasGraphStrategy = {
  id: 'python-code',
  mapNodeToCanonical: (node) => (isCanonicalNode(node) ? node : null),
  mapEdgeToCanonical: (edge) => (isCanonicalEdge(edge) ? edge : null),
  parseDropPayload: () => null,
};
