/** Owned concern: decode Canvas drag identities and canonical node payloads. */
import type { CanonicalNode } from '../../types/canonical';
import {
  isCanonicalNodeStatus,
  isCoreNodeRole,
  isPluginNodeKind,
  isRecord,
} from '../../types/canonicalGuards';

export const CANVAS_CATALOG_NODE_DRAG_MIME_TYPE = 'application/x-dvt-catalog-node-id';
export const CANVAS_MODEL_COMPOSITION_DRAG_MIME_TYPE = 'application/x-dvt-model-composition-id';

export const CANVAS_NODE_DROP_GRAPH_ANCHOR = { x: 100, y: 40 } as const;

function readNonEmptyDragString(value: unknown): string | undefined {
  return readOptionalString(value) || undefined;
}

type CatalogDropReference = Readonly<{ id: string; scopeKey?: string }>;

function readCatalogDropReference(value: unknown): CatalogDropReference | null {
  if (!isRecord(value)) return null;
  const id = readNonEmptyDragString(value.id);
  if (id === undefined) return null;
  if (value.scopeKey === undefined) return { id };
  const scopeKey = readNonEmptyDragString(value.scopeKey);
  return scopeKey === undefined ? null : { id, scopeKey };
}

export function readCanvasCatalogNodeDragReference(
  transfer: Pick<DataTransfer, 'getData'>,
  mime = CANVAS_CATALOG_NODE_DRAG_MIME_TYPE
): CatalogDropReference | null {
  try {
    return readCatalogDropReference(parseCanvasDropPayloadJson(transfer.getData(mime)));
  } catch {
    return null;
  }
}

export function writeCanvasModelCompositionDrag(
  transfer: Pick<DataTransfer, 'setData'>,
  id: string,
  scopeKey: string | undefined
): boolean {
  if (scopeKey == null) return false;
  transfer.setData(CANVAS_MODEL_COMPOSITION_DRAG_MIME_TYPE, JSON.stringify({ id, scopeKey }));
  return true;
}

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

function parseCanvasDropPayloadJson(payload: string): unknown {
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
  const parsed = parseCanvasDropPayloadJson(payload);
  if (!isParsedCanonicalDropPayload(parsed)) {
    return null;
  }

  return buildCanonicalNodeFromDropPayload(parsed);
}
