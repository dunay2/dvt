/** Owned concern: validate canonical graph primitives at plugin and authoring boundaries. */
import type {
  CanonicalEdgeRelation,
  CanonicalNodeStatus,
  CoreNodeRole,
  PluginNodeKind,
} from './canonical';
import {
  CANONICAL_EDGE_RELATIONS,
  CANONICAL_NODE_STATUSES,
  CORE_NODE_ROLES,
} from './canonical';

const CORE_NODE_ROLE_SET = new Set<string>(CORE_NODE_ROLES);
const CANONICAL_NODE_STATUS_SET = new Set<string>(CANONICAL_NODE_STATUSES);
const CANONICAL_EDGE_RELATION_SET = new Set<string>(CANONICAL_EDGE_RELATIONS);

export type ParsedPluginNodeKind = {
  pluginId: string;
  nodeKind: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parsePluginNodeKind(kind: PluginNodeKind): ParsedPluginNodeKind {
  const separatorIndex = kind.indexOf(':');

  return {
    pluginId: kind.slice(0, separatorIndex),
    nodeKind: kind.slice(separatorIndex + 1),
  };
}

export function isPluginNodeKind(value: unknown): value is PluginNodeKind {
  if (typeof value !== 'string') {
    return false;
  }

  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex !== value.lastIndexOf(':')) {
    return false;
  }

  const { pluginId, nodeKind } = parsePluginNodeKind(value as PluginNodeKind);
  return Boolean(pluginId) && Boolean(nodeKind);
}

export function isCoreNodeRole(value: unknown): value is CoreNodeRole {
  return typeof value === 'string' && CORE_NODE_ROLE_SET.has(value);
}

export function isCanonicalNodeStatus(value: unknown): value is CanonicalNodeStatus {
  return typeof value === 'string' && CANONICAL_NODE_STATUS_SET.has(value);
}

export function isCanonicalEdgeRelation(value: unknown): value is CanonicalEdgeRelation {
  return typeof value === 'string' && CANONICAL_EDGE_RELATION_SET.has(value);
}
