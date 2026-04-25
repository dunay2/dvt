/** Owned concern: validate canonical graph primitives at plugin and authoring boundaries. */
import type {
  CanonicalEdgeRelation,
  CanonicalNodeStatus,
  CoreNodeRole,
  PluginNodeKind,
} from './canonical';

const CANONICAL_NODE_ROLES = new Set<string>([
  'input',
  'transform',
  'check',
  'output',
  'control',
]);

const CANONICAL_NODE_STATUSES = new Set<string>([
  'idle',
  'running',
  'success',
  'failed',
  'skipped',
  'warn',
]);

const CANONICAL_EDGE_RELATIONS = new Set<string>([
  'lineage',
  'validation',
  'consumption',
  'metric',
  'custom',
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isPluginNodeKind(value: unknown): value is PluginNodeKind {
  if (typeof value !== 'string') {
    return false;
  }

  const [pluginId, nodeKind, ...rest] = value.split(':');
  return Boolean(pluginId) && Boolean(nodeKind) && rest.length === 0;
}

export function isCoreNodeRole(value: unknown): value is CoreNodeRole {
  return typeof value === 'string' && CANONICAL_NODE_ROLES.has(value);
}

export function isCanonicalNodeStatus(value: unknown): value is CanonicalNodeStatus {
  return typeof value === 'string' && CANONICAL_NODE_STATUSES.has(value);
}

export function isCanonicalEdgeRelation(value: unknown): value is CanonicalEdgeRelation {
  return typeof value === 'string' && CANONICAL_EDGE_RELATIONS.has(value);
}
