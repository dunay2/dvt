/** Owned concern: derive and apply route-owned DVT transformation authoring metadata. */
import type { CanonicalNode } from '../../types/canonical';
import {
  buildDvtSqlTransformMetadata,
  readTransformationSqlMirrorState,
} from './canvasTransformationSqlMirror';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';

export type DvtSourceAuthoringMetadata = Readonly<{
  kind: 'source';
  database: string;
  schema: string;
  table: string;
  alias: string;
}>;

export type DvtSqlTransformAuthoringMetadata = Readonly<{
  kind: 'sql_transform';
  sql: string;
}>;

export type DvtSinkAuthoringMetadata = Readonly<{
  kind: 'sink';
  database: string;
  schema: string;
  table: string;
  materialization: string;
  writeMode: string;
  partitionStrategy: string;
}>;

export type DvtNodeAuthoringMetadata =
  | DvtSourceAuthoringMetadata
  | DvtSqlTransformAuthoringMetadata
  | DvtSinkAuthoringMetadata;

export type DvtNodeAuthoringMetadataErrors = Partial<
  Record<
    'schema' | 'table' | 'alias' | 'sql' | 'materialization' | 'writeMode',
    CanvasInspectorNodeDraftErrorCode
  >
>;

const DEFAULT_SCHEMA_NAME = 'public';
const DEFAULT_MATERIALIZATION = 'table';
const DEFAULT_WRITE_MODE = 'replace';
const VALID_MATERIALIZATIONS = new Set(['table', 'view']);
const VALID_WRITE_MODES = new Set(['replace', 'append']);
const DVT_AUTHORING_PLUGIN_ID = 'dvt';
const DVT_WAREHOUSE_SOURCE_PLUGIN_ID = 'dvt.warehouse-source';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
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

function normalizeEnumValue(
  value: string | undefined,
  fallback: string,
  allowedValues: ReadonlySet<string>
): string {
  const normalized = normalizeIdentifier(value, fallback);
  return allowedValues.has(normalized) ? normalized : fallback;
}

function createSourceMetadata(node: CanonicalNode): DvtSourceAuthoringMetadata {
  const config = readNodeMetadataRecord(node, 'config');
  const importedDatabase = readString(node.metadata?.database);
  const importedSourceName = readString(node.metadata?.sourceName);
  const importedSchema = readString(node.metadata?.schema);
  const importedTableName = readString(node.metadata?.tableName);
  const table = normalizeIdentifier(
    readString(config?.table) ?? importedTableName ?? readString(config?.alias) ?? node.name,
    'source_table'
  );

  return {
    kind: 'source',
    database: readString(config?.database) ?? importedDatabase ?? '',
    schema: readString(config?.schema) ?? importedSchema ?? DEFAULT_SCHEMA_NAME,
    table,
    alias: normalizeIdentifier(readString(config?.alias) ?? importedSourceName ?? table, table),
  };
}

function createSqlTransformMetadata(node: CanonicalNode): DvtSqlTransformAuthoringMetadata {
  const mirrorState = readTransformationSqlMirrorState(node);

  return {
    kind: 'sql_transform',
    sql: mirrorState.draftSql ?? mirrorState.compiledSql ?? '',
  };
}

function createSinkMetadata(node: CanonicalNode): DvtSinkAuthoringMetadata {
  const config = readNodeMetadataRecord(node, 'config');

  return {
    kind: 'sink',
    database: readString(config?.database) ?? '',
    schema: readString(config?.schema) ?? DEFAULT_SCHEMA_NAME,
    table: normalizeIdentifier(readString(config?.table) ?? node.name, 'sink_table'),
    materialization: normalizeEnumValue(
      readString(config?.materialization) ?? readString(config?.materialized),
      DEFAULT_MATERIALIZATION,
      VALID_MATERIALIZATIONS
    ),
    writeMode: normalizeEnumValue(
      readString(config?.writeMode),
      DEFAULT_WRITE_MODE,
      VALID_WRITE_MODES
    ),
    partitionStrategy: readString(config?.partitionStrategy) ?? '',
  };
}

export function createDvtNodeAuthoringMetadata(
  node: CanonicalNode
): DvtNodeAuthoringMetadata | undefined {
  switch (node.kind) {
    case 'dvt:source':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID ||
        node.pluginId === DVT_WAREHOUSE_SOURCE_PLUGIN_ID
        ? createSourceMetadata(node)
        : undefined;
    case 'dvt:sql_transform':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID
        ? createSqlTransformMetadata(node)
        : undefined;
    case 'dvt:sink':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID ? createSinkMetadata(node) : undefined;
    default:
      return undefined;
  }
}

export function validateDvtNodeAuthoringMetadata(
  metadata: DvtNodeAuthoringMetadata
): DvtNodeAuthoringMetadataErrors {
  const errors: DvtNodeAuthoringMetadataErrors = {};

  if (metadata.kind === 'source' || metadata.kind === 'sink') {
    if (metadata.schema.trim().length === 0) {
      errors.schema = 'dvt_schema_required';
    }
    if (metadata.table.trim().length === 0) {
      errors.table = 'dvt_table_required';
    }
  }

  if (metadata.kind === 'source' && metadata.alias.trim().length === 0) {
    errors.alias = 'dvt_alias_required';
  }

  if (
    metadata.kind === 'sink' &&
    !VALID_MATERIALIZATIONS.has(normalizeIdentifier(metadata.materialization, ''))
  ) {
    errors.materialization = 'dvt_materialization_invalid';
  }

  if (
    metadata.kind === 'sink' &&
    !VALID_WRITE_MODES.has(normalizeIdentifier(metadata.writeMode, ''))
  ) {
    errors.writeMode = 'dvt_write_mode_invalid';
  }

  return errors;
}

function readExistingConfig(node: CanonicalNode): Record<string, unknown> {
  return readNodeMetadataRecord(node, 'config') ?? {};
}

function optionalConfigString(
  config: Record<string, unknown>,
  key: string,
  value: string
): Record<string, unknown> {
  const nextConfig = { ...config };
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    nextConfig[key] = trimmed;
  } else {
    delete nextConfig[key];
  }
  return nextConfig;
}

function withConfig(
  node: CanonicalNode,
  config: Record<string, unknown>,
  extraMetadata?: Record<string, unknown>
): CanonicalNode {
  return {
    ...node,
    metadata: {
      ...node.metadata,
      ...extraMetadata,
      config,
    },
  };
}

export function applyDvtNodeAuthoringMetadata(
  node: CanonicalNode,
  metadata: DvtNodeAuthoringMetadata
): CanonicalNode {
  const existingConfig = readExistingConfig(node);

  if (metadata.kind === 'source') {
    const table = normalizeIdentifier(metadata.table, 'source_table');
    const sourceConfig = optionalConfigString(existingConfig, 'database', metadata.database);
    return withConfig(node, {
      ...sourceConfig,
      schema: metadata.schema.trim() || DEFAULT_SCHEMA_NAME,
      table,
      alias: normalizeIdentifier(metadata.alias, table),
    });
  }

  if (metadata.kind === 'sql_transform') {
    return {
      ...node,
      metadata: buildDvtSqlTransformMetadata(node, metadata.sql),
    };
  }

  const sinkConfig = optionalConfigString(
    optionalConfigString(existingConfig, 'database', metadata.database),
    'partitionStrategy',
    metadata.partitionStrategy
  );

  return withConfig(node, {
    ...sinkConfig,
    schema: metadata.schema.trim() || DEFAULT_SCHEMA_NAME,
    table: normalizeIdentifier(metadata.table, 'sink_table'),
    materialization: normalizeEnumValue(
      metadata.materialization,
      DEFAULT_MATERIALIZATION,
      VALID_MATERIALIZATIONS
    ),
    writeMode: normalizeEnumValue(metadata.writeMode, DEFAULT_WRITE_MODE, VALID_WRITE_MODES),
  });
}
