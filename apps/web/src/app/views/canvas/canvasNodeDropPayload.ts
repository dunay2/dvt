import type {
  CanonicalNode,
  CanonicalNodeStatus,
  CoreNodeRole,
  PluginNodeKind,
} from '../../types/canonical';

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

type ParsedCanonicalDropPayload = {
  id: string;
  name: string;
  pluginId: string;
  kind: string;
  role: string;
  status: string;
  tags?: unknown;
  path?: unknown;
  description?: unknown;
  lastDuration?: unknown;
  lastCost?: unknown;
  metadata?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isParsedCanonicalDropPayload(value: unknown): value is ParsedCanonicalDropPayload {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.pluginId === 'string' &&
    typeof value.kind === 'string' &&
    typeof value.role === 'string' &&
    typeof value.status === 'string'
  );
}

function isPluginNodeKind(value: string): value is PluginNodeKind {
  const [pluginId, nodeKind, ...rest] = value.split(':');
  return Boolean(pluginId) && Boolean(nodeKind) && rest.length === 0;
}

function isCoreNodeRole(value: string): value is CoreNodeRole {
  return CANONICAL_NODE_ROLES.has(value);
}

function isCanonicalNodeStatus(value: string): value is CanonicalNodeStatus {
  return CANONICAL_NODE_STATUSES.has(value);
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function readOptionalMetadata(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

type CanonicalDropIdentity = Pick<CanonicalNode, 'kind' | 'role' | 'status'>;

function readCanonicalDropIdentity(
  parsed: ParsedCanonicalDropPayload
): CanonicalDropIdentity | null {
  if (!isPluginNodeKind(parsed.kind)) {
    return null;
  }

  if (!isCoreNodeRole(parsed.role)) {
    return null;
  }

  if (!isCanonicalNodeStatus(parsed.status)) {
    return null;
  }

  return {
    kind: parsed.kind,
    role: parsed.role,
    status: parsed.status,
  };
}

function buildCanonicalNodeFromDropPayload(
  parsed: ParsedCanonicalDropPayload
): CanonicalNode | null {
  const identity = readCanonicalDropIdentity(parsed);
  if (!identity) {
    return null;
  }

  return {
    id: parsed.id,
    name: parsed.name,
    pluginId: parsed.pluginId,
    ...identity,
    tags: readStringArray(parsed.tags),
    path: readOptionalString(parsed.path),
    description: readOptionalString(parsed.description),
    lastDuration: readOptionalNumber(parsed.lastDuration),
    lastCost: readOptionalNumber(parsed.lastCost),
    metadata: readOptionalMetadata(parsed.metadata),
  };
}

function parseCanonicalDropPayloadJson(payload: string): unknown {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function parseCanonicalNodeDragPayload(payload: string): CanonicalNode | null {
  const parsed = parseCanonicalDropPayloadJson(payload);
  if (!isParsedCanonicalDropPayload(parsed)) {
    return null;
  }

  return buildCanonicalNodeFromDropPayload(parsed);
}
