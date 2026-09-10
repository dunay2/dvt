/** Owns DVT source identity, connection authority, validation, and persistence. */
import {
  ConnectedSourceRefSchema,
  ConnectionRefSchema,
  PostgresIdentifierV1Schema,
  type ConnectionRef,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  DvtNodeAuthoringMetadataErrors,
  DvtSourceAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
import {
  applyDvtSourceSemanticDraft,
  createDvtSourceSemanticDraft,
} from './canvasDvtSourceSemanticAuthoring';

const DEFAULT_SCHEMA_NAME = 'public';
export const DVT_AUTHORING_PLUGIN_ID = 'dvt';
export const DVT_WAREHOUSE_SOURCE_PLUGIN_ID = 'dvt.warehouse-source';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function readDvtString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function readDvtNodeConfig(node: CanonicalNode): Record<string, unknown> {
  const value = node.metadata?.config;
  return isRecord(value) ? value : {};
}

export function normalizeDvtIdentifier(value: string | undefined, fallback: string): string {
  const normalized = (value?.trim() ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return normalized.length > 0 ? normalized : fallback;
}

function parseConnectionRef(value: unknown): ConnectionRef | undefined {
  if (value === undefined) return undefined;
  const result = ConnectionRefSchema.safeParse(value);
  if (!result.success) throw new Error('DVT source metadata.connectionRef must be valid.');
  return result.data;
}

function parseImportedConnectionRef(value: unknown): ConnectionRef | undefined {
  if (value === undefined) return undefined;
  const result = ConnectedSourceRefSchema.safeParse(value);
  if (!result.success)
    throw new Error('DVT imported source metadata.connectedSourceRef must be valid.');
  return result.data.connectionRef;
}

export function resolveEffectiveDvtConnectionRef(node: CanonicalNode): ConnectionRef | undefined {
  const manual = parseConnectionRef(node.metadata?.connectionRef);
  const imported = parseImportedConnectionRef(node.metadata?.connectedSourceRef);
  if (manual && imported) {
    throw new Error('DVT source nodes must persist exactly one connection authority.');
  }
  const connectionRef = imported ?? manual;
  if (connectionRef && connectionRef.provider !== 'postgres') {
    throw new Error('DVT sources require a PostgreSQL ConnectionRef.');
  }
  return connectionRef;
}

export function resolveInheritedDvtConnectionRef(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): ConnectionRef | undefined {
  const nodesById = new Map(args.nodes.map((candidate) => [candidate.id, candidate]));
  const sourceIdByTargetId = new Map(args.edges.map((edge) => [edge.targetId, edge.sourceId]));
  const visited = new Set<string>();
  let current: CanonicalNode | undefined = args.node;
  while (current) {
    if (visited.has(current.id)) {
      throw new Error('DVT connection inheritance cannot traverse a cyclic graph.');
    }
    visited.add(current.id);
    if (current.kind === 'dvt:source') return resolveEffectiveDvtConnectionRef(current);
    const sourceId = sourceIdByTargetId.get(current.id);
    current = sourceId ? nodesById.get(sourceId) : undefined;
  }
  return undefined;
}

export function createDvtSourceAuthoringMetadata(node: CanonicalNode): DvtSourceAuthoringMetadata {
  const config = readDvtNodeConfig(node);
  const imported = node.pluginId === DVT_WAREHOUSE_SOURCE_PLUGIN_ID;
  const importedSchema = readDvtString(node.metadata?.schema);
  const importedTable = readDvtString(node.metadata?.tableName);
  const table = normalizeDvtIdentifier(
    (imported ? importedTable : (readDvtString(config.table) ?? importedTable)) ??
      readDvtString(config.alias) ??
      node.name,
    'source_table'
  );
  return {
    kind: 'source',
    schema:
      (imported ? importedSchema : (readDvtString(config.schema) ?? importedSchema)) ??
      DEFAULT_SCHEMA_NAME,
    table,
    alias: normalizeDvtIdentifier(
      readDvtString(config.alias) ?? readDvtString(node.metadata?.sourceName) ?? table,
      table
    ),
    connectionRef: resolveEffectiveDvtConnectionRef(node),
    semantic: createDvtSourceSemanticDraft(node),
  };
}

export function validateDvtSourceAuthoringMetadata(
  metadata: DvtSourceAuthoringMetadata
): DvtNodeAuthoringMetadataErrors {
  const schema = metadata.schema;
  const table = metadata.table;
  const alias = metadata.alias;
  return {
    ...(schema.trim()
      ? schema !== schema.trim()
        ? { schema: 'dvt_identifier_whitespace' as const }
        : PostgresIdentifierV1Schema.safeParse(schema).success
          ? {}
          : { schema: 'dvt_identifier_too_long' as const }
      : { schema: 'dvt_schema_required' as const }),
    ...(table.trim()
      ? table !== table.trim()
        ? { table: 'dvt_identifier_whitespace' as const }
        : PostgresIdentifierV1Schema.safeParse(table).success
          ? {}
          : { table: 'dvt_identifier_too_long' as const }
      : { table: 'dvt_table_required' as const }),
    ...(alias.trim()
      ? alias !== alias.trim()
        ? { alias: 'dvt_identifier_whitespace' as const }
        : PostgresIdentifierV1Schema.safeParse(alias).success
          ? {}
          : { alias: 'dvt_identifier_too_long' as const }
      : { alias: 'dvt_alias_required' as const }),
    ...(metadata.connectionRef ? {} : { connectionRef: 'dvt_connection_required' as const }),
  };
}

export function applyDvtSourceAuthoringMetadata(
  node: CanonicalNode,
  metadata: DvtSourceAuthoringMetadata
): CanonicalNode {
  const existingConfig = readDvtNodeConfig(node);
  const hasImportedConnectionAuthority = ConnectedSourceRefSchema.safeParse(
    node.metadata?.connectedSourceRef
  ).success;
  const { connectionRef: _manualConnectionRef, ...metadataWithoutManualConnection } =
    node.metadata ?? {};
  const authorityNode = hasImportedConnectionAuthority
    ? { ...node, metadata: metadataWithoutManualConnection }
    : node;
  const schema = metadata.schema;
  const table = metadata.table;
  const alias = metadata.alias;
  if (
    schema !== schema.trim() ||
    !PostgresIdentifierV1Schema.safeParse(schema).success ||
    table !== table.trim() ||
    !PostgresIdentifierV1Schema.safeParse(table).success ||
    alias !== alias.trim() ||
    !PostgresIdentifierV1Schema.safeParse(alias).success
  ) {
    return node;
  }
  if (node.pluginId === DVT_WAREHOUSE_SOURCE_PLUGIN_ID) {
    const config = Object.fromEntries(
      Object.entries(existingConfig).filter(([key]) => key !== 'schema' && key !== 'table')
    );
    const configured = withDvtConfig(authorityNode, {
      ...config,
      alias,
    });
    return metadata.semantic == null
      ? configured
      : applyDvtSourceSemanticDraft(configured, metadata.semantic);
  }
  const configured = withDvtConfig(
    authorityNode,
    {
      ...existingConfig,
      schema,
      table,
      alias,
    },
    hasImportedConnectionAuthority ? undefined : { connectionRef: metadata.connectionRef }
  );
  return metadata.semantic == null
    ? configured
    : applyDvtSourceSemanticDraft(configured, metadata.semantic);
}

export function withDvtConfig(
  node: CanonicalNode,
  config: Record<string, unknown>,
  extraMetadata?: Record<string, unknown>
): CanonicalNode {
  return { ...node, metadata: { ...node.metadata, ...extraMetadata, config } };
}
