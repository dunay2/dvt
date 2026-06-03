import type {
  CanonicalNode,
} from '../../types/canonical';
import {
  isCanonicalNodeStatus,
  isCoreNodeRole,
  isPluginNodeKind,
  isRecord,
} from '../../types/canonicalGuards';

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
