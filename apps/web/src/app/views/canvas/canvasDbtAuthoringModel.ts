/** Owned concern: derive and apply route-owned dbt card authoring metadata. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export type DbtNodeAuthoringMetadata = Readonly<{
  packageName: string;
  sourceName: string;
  schemaName: string;
  tableName: string;
  materialized: string;
  selectedSourceId: string;
  modelSql: string | null;
  projectionColumns: readonly DbtModelProjectionColumn[] | null;
}>;

export type DbtModelProjectionColumn = Readonly<{
  name: string;
  output: boolean;
}>;

export type DbtSourceRelationshipSelection =
  | Readonly<{
      status: 'selected';
      sourceNodeId: string;
      sourceName: string;
      tableName: string;
    }>
  | Readonly<{
      status: 'blocked';
      reason: 'not_dbt_model' | 'source_required' | 'selected_source_not_connected';
    }>;

const DEFAULT_PACKAGE_NAME = 'analytics';
const DEFAULT_SCHEMA_NAME = 'raw';
const DEFAULT_MATERIALIZATION = 'view';
const VALID_MATERIALIZATIONS = new Set(['view', 'table', 'incremental', 'ephemeral']);

type ReconcileDbtModelConnectedOriginArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readAuthoredSql(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readProjectionColumns(value: unknown): readonly DbtModelProjectionColumn[] | null {
  if (!Array.isArray(value)) return null;
  const columns: DbtModelProjectionColumn[] = [];
  const names = new Set<string>();
  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const name = readString(candidate.name);
    if (name == null || typeof candidate.output !== 'boolean' || names.has(name)) return null;
    names.add(name);
    columns.push({ name, output: candidate.output });
  }
  return columns;
}

function readNodeMetadataRecord(
  node: CanonicalNode,
  key: string
): Record<string, unknown> | undefined {
  const value = node.metadata?.[key];
  return isRecord(value) ? value : undefined;
}

function normalizeIdentifier(value: string | undefined, fallback: string): string {
  const raw = value?.trim() ?? '';
  const normalized = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeMaterialized(value: string | undefined): string {
  const normalized = normalizeIdentifier(value, DEFAULT_MATERIALIZATION);
  return VALID_MATERIALIZATIONS.has(normalized) ? normalized : DEFAULT_MATERIALIZATION;
}

export function createDbtNodeAuthoringMetadata(node: CanonicalNode): DbtNodeAuthoringMetadata {
  const dbtMetadata = readNodeMetadataRecord(node, 'dbt');
  const configMetadata = readNodeMetadataRecord(node, 'config');
  const sourceName =
    readString(dbtMetadata?.sourceName) ??
    readString(configMetadata?.sourceName) ??
    normalizeIdentifier(node.name, 'source');
  const tableName =
    readString(configMetadata?.table) ??
    readString(configMetadata?.tableName) ??
    readString(dbtMetadata?.tableName) ??
    readString(configMetadata?.alias) ??
    normalizeIdentifier(node.name, 'table');

  return {
    packageName:
      readString(dbtMetadata?.packageName) ??
      readString(node.metadata?.package) ??
      DEFAULT_PACKAGE_NAME,
    sourceName: normalizeIdentifier(sourceName, 'source'),
    schemaName:
      readString(configMetadata?.schema) ??
      readString(dbtMetadata?.schemaName) ??
      DEFAULT_SCHEMA_NAME,
    tableName: normalizeIdentifier(tableName, 'table'),
    materialized: normalizeMaterialized(
      readString(dbtMetadata?.materialized) ?? readString(configMetadata?.materialized)
    ),
    selectedSourceId: readString(dbtMetadata?.selectedSourceId) ?? '',
    modelSql: readAuthoredSql(configMetadata?.sql) ?? readAuthoredSql(node.metadata?.sql),
    projectionColumns: readProjectionColumns(dbtMetadata?.projectionColumns),
  };
}

export function applyDbtNodeAuthoringMetadata(
  node: CanonicalNode,
  metadata: DbtNodeAuthoringMetadata
): CanonicalNode {
  const materialized = normalizeMaterialized(metadata.materialized);
  const existingConfig = readNodeMetadataRecord(node, 'config') ?? {};
  const { sql: _existingSql, ...configWithoutSql } = existingConfig;
  const schemaName = metadata.schemaName.trim() || DEFAULT_SCHEMA_NAME;
  const tableName = normalizeIdentifier(metadata.tableName, 'table');
  const modelSql = metadata.modelSql;
  const hasAuthoredModelSql = modelSql != null && modelSql.trim().length > 0;
  const { sql: _legacyTopLevelSql, ...metadataWithoutLegacyTopLevelSql } = node.metadata ?? {};

  return {
    ...node,
    metadata: {
      ...metadataWithoutLegacyTopLevelSql,
      config: {
        ...configWithoutSql,
        schema: schemaName,
        table: tableName,
        materialized,
        ...(node.kind === 'dbt:model' && hasAuthoredModelSql ? { sql: modelSql } : {}),
      },
      dbt: {
        packageName: metadata.packageName.trim() || DEFAULT_PACKAGE_NAME,
        sourceName: normalizeIdentifier(metadata.sourceName, 'source'),
        schemaName,
        tableName,
        materialized,
        selectedSourceId: metadata.selectedSourceId.trim(),
        ...(metadata.projectionColumns == null
          ? {}
          : {
              projectionColumns: metadata.projectionColumns.map((column) => ({ ...column })),
            }),
      },
    },
  };
}

function isCompatibleDbtModelOrigin(node: CanonicalNode): boolean {
  return (
    (node.pluginId === 'dbt' && (node.kind === 'dbt:source' || node.kind === 'dbt:model')) ||
    (node.pluginId === 'dvt.warehouse-source' && node.kind === 'dvt:source') ||
    (node.pluginId === 'dvt.object-file-postgres' && node.kind === 'dvt:object_file_load')
  );
}

export function resolveDbtModelConnectedOrigin(
  compatibleOrigins: readonly CanonicalNode[],
  selectedSourceId: string
): CanonicalNode | undefined {
  const normalizedSelectedSourceId = selectedSourceId.trim();
  return (
    compatibleOrigins.find((candidate) => candidate.id === normalizedSelectedSourceId) ??
    (compatibleOrigins.length === 1 ? compatibleOrigins[0] : undefined)
  );
}

function resolveDbtModelOriginSchemaName(node: CanonicalNode): string | undefined {
  const configMetadata = readNodeMetadataRecord(node, 'config');
  const dbtMetadata = readNodeMetadataRecord(node, 'dbt');
  const objectFileMetadata = readNodeMetadataRecord(node, 'objectFilePostgres');
  const objectFileTarget = isRecord(objectFileMetadata?.target)
    ? objectFileMetadata.target
    : undefined;

  return (
    readString(configMetadata?.schema) ??
    readString(dbtMetadata?.schemaName) ??
    readString(node.metadata?.schema) ??
    readString(objectFileTarget?.schema)
  );
}

export function reconcileDbtModelConnectedOrigin({
  node,
  nodes,
  edges,
}: ReconcileDbtModelConnectedOriginArgs): CanonicalNode {
  if (node.pluginId !== 'dbt' || node.kind !== 'dbt:model') return node;

  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const connectedOrigins = edges
    .filter((edge) => edge.targetId === node.id)
    .map((edge) => nodeById.get(edge.sourceId))
    .filter((candidate): candidate is CanonicalNode =>
      candidate == null ? false : isCompatibleDbtModelOrigin(candidate)
    );
  const authoringMetadata = createDbtNodeAuthoringMetadata(node);
  const selectedOrigin = resolveDbtModelConnectedOrigin(
    connectedOrigins,
    authoringMetadata.selectedSourceId
  );
  if (selectedOrigin == null) return node;

  const originSchemaName = resolveDbtModelOriginSchemaName(selectedOrigin);
  const schemaName =
    authoringMetadata.schemaName === DEFAULT_SCHEMA_NAME && originSchemaName != null
      ? originSchemaName
      : authoringMetadata.schemaName;
  if (
    authoringMetadata.selectedSourceId === selectedOrigin.id &&
    authoringMetadata.schemaName === schemaName
  ) {
    return node;
  }

  return applyDbtNodeAuthoringMetadata(node, {
    ...authoringMetadata,
    schemaName,
    selectedSourceId: selectedOrigin.id,
  });
}

function findConnectedSourceNode(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedSourceId: string;
}): CanonicalNode | null {
  const connectedSourceIds = new Set(
    args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
  );

  if (args.selectedSourceId.length > 0 && !connectedSourceIds.has(args.selectedSourceId)) {
    return null;
  }

  const sourceId =
    args.selectedSourceId ||
    [...connectedSourceIds].find((nodeId) => {
      const candidate = args.nodes.find((node) => node.id === nodeId);
      return candidate?.pluginId === 'dbt' && candidate.kind === 'dbt:source';
    }) ||
    '';

  return (
    args.nodes.find(
      (candidate) =>
        candidate.id === sourceId &&
        candidate.pluginId === 'dbt' &&
        candidate.kind === 'dbt:source' &&
        connectedSourceIds.has(candidate.id)
    ) ?? null
  );
}

export function resolveDbtSourceRelationshipSelection(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): DbtSourceRelationshipSelection {
  if (args.node.pluginId !== 'dbt' || args.node.kind !== 'dbt:model') {
    return {
      status: 'blocked',
      reason: 'not_dbt_model',
    };
  }

  const selectedSourceId = createDbtNodeAuthoringMetadata(args.node).selectedSourceId;
  const sourceNode = findConnectedSourceNode({
    ...args,
    selectedSourceId,
  });

  if (!sourceNode) {
    return {
      status: 'blocked',
      reason: selectedSourceId ? 'selected_source_not_connected' : 'source_required',
    };
  }

  const sourceMetadata = createDbtNodeAuthoringMetadata(sourceNode);
  return {
    status: 'selected',
    sourceNodeId: sourceNode.id,
    sourceName: sourceMetadata.sourceName,
    tableName: sourceMetadata.tableName,
  };
}
