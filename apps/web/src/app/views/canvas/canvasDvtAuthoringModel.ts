/** Owned concern: derive and apply route-owned DVT transformation authoring metadata. */
import type { CanonicalNode } from '../../types/canonical';

export type DvtSourceAuthoringMetadata = Readonly<{
  kind: 'source';
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
  schema: string;
  table: string;
  materialization: string;
  writeMode: string;
}>;

export type DvtNodeAuthoringMetadata =
  | DvtSourceAuthoringMetadata
  | DvtSqlTransformAuthoringMetadata
  | DvtSinkAuthoringMetadata;

export type DvtNodeAuthoringMetadataErrors = Partial<
  Record<'schema' | 'table' | 'alias' | 'sql' | 'materialization' | 'writeMode', string>
>;

const DEFAULT_SCHEMA_NAME = 'public';
const DEFAULT_MATERIALIZATION = 'table';
const DEFAULT_WRITE_MODE = 'replace';
const VALID_MATERIALIZATIONS = new Set(['table', 'view']);
const VALID_WRITE_MODES = new Set(['replace', 'append']);

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
  const table = normalizeIdentifier(
    readString(config?.table) ?? readString(config?.alias) ?? node.name,
    'source_table'
  );

  return {
    kind: 'source',
    schema: readString(config?.schema) ?? DEFAULT_SCHEMA_NAME,
    table,
    alias: normalizeIdentifier(readString(config?.alias) ?? table, table),
  };
}

function createSqlTransformMetadata(node: CanonicalNode): DvtSqlTransformAuthoringMetadata {
  const config = readNodeMetadataRecord(node, 'config');

  return {
    kind: 'sql_transform',
    sql:
      readString(node.metadata?.sql) ??
      readString(config?.sql) ??
      readString(node.metadata?.compiledSql) ??
      '',
  };
}

function createSinkMetadata(node: CanonicalNode): DvtSinkAuthoringMetadata {
  const config = readNodeMetadataRecord(node, 'config');

  return {
    kind: 'sink',
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
  };
}

export function createDvtNodeAuthoringMetadata(
  node: CanonicalNode
): DvtNodeAuthoringMetadata | undefined {
  if (node.pluginId !== 'dvt') {
    return undefined;
  }

  switch (node.kind) {
    case 'dvt:source':
      return createSourceMetadata(node);
    case 'dvt:sql_transform':
      return createSqlTransformMetadata(node);
    case 'dvt:sink':
      return createSinkMetadata(node);
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
      errors.schema = 'Schema is required.';
    }
    if (metadata.table.trim().length === 0) {
      errors.table = 'Table is required.';
    }
  }

  if (metadata.kind === 'source' && metadata.alias.trim().length === 0) {
    errors.alias = 'Alias is required.';
  }

  if (
    metadata.kind === 'sink' &&
    !VALID_MATERIALIZATIONS.has(normalizeIdentifier(metadata.materialization, ''))
  ) {
    errors.materialization = 'Materialization must be table or view.';
  }

  if (
    metadata.kind === 'sink' &&
    !VALID_WRITE_MODES.has(normalizeIdentifier(metadata.writeMode, ''))
  ) {
    errors.writeMode = 'Write mode must be replace or append.';
  }

  return errors;
}

function readExistingConfig(node: CanonicalNode): Record<string, unknown> {
  return readNodeMetadataRecord(node, 'config') ?? {};
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
    return withConfig(node, {
      ...existingConfig,
      schema: metadata.schema.trim() || DEFAULT_SCHEMA_NAME,
      table,
      alias: normalizeIdentifier(metadata.alias, table),
    });
  }

  if (metadata.kind === 'sql_transform') {
    const sql = metadata.sql.trim();
    const { sql: _existingConfigSql, ...configWithoutSql } = existingConfig;
    const {
      sql: _existingSql,
      compiledSql: _existingCompiledSql,
      ...metadataWithoutSql
    } = node.metadata ?? {};

    return {
      ...node,
      metadata: {
        ...metadataWithoutSql,
        ...(sql.length > 0 ? { sql } : {}),
        config: {
          ...configWithoutSql,
          ...(sql.length > 0 ? { sql } : {}),
        },
      },
    };
  }

  return withConfig(node, {
    ...existingConfig,
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
