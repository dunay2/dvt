/** Owned concern: define the DVT transformation Canvas graph strategy. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  isCanonicalEdgeRelation,
  isCanonicalNodeStatus,
  isCoreNodeRole,
  isPluginNodeKind,
  isRecord,
} from '../../types/canonicalGuards';
import type { CanvasGraphStrategy } from '../graphStrategyContracts';

function hasStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isCanonicalNode(value: unknown): value is CanonicalNode {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.pluginId === 'string' &&
    isPluginNodeKind(value.kind) &&
    isCoreNodeRole(value.role) &&
    isCanonicalNodeStatus(value.status) &&
    hasStringArray(value.tags)
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

export const transformationCanvasGraphStrategy: CanvasGraphStrategy = {
  id: 'transformation',
  mapNodeToCanonical: (node) => (isCanonicalNode(node) ? node : null),
  mapEdgeToCanonical: (edge) => (isCanonicalEdge(edge) ? edge : null),
  parseDropPayload: () => null,
};
