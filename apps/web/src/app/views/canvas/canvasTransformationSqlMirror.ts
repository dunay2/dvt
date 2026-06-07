/** Owned concern: classify and materialize DVT transform SQL mirror state. */
import type { CanonicalNode } from '../../types/canonical';

export type TransformationSqlMirrorStatus = 'clean' | 'draft_dirty' | 'invalid_ambiguous';

export type TransformationSqlMirrorState = Readonly<{
  status: TransformationSqlMirrorStatus;
  draftSql: string | null;
  compiledSql: string | null;
  executableSql: string | null;
}>;

export type ExecutableSqlResolution =
  | Readonly<{ ok: true; sql: string | null }>
  | Readonly<{ ok: false; message: string }>;

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readMetadataConfig(metadata: CanonicalNode['metadata']): Record<string, unknown> {
  const config = metadata?.config;

  return config !== null && typeof config === 'object' && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
}

export function readDraftSqlText(node: CanonicalNode): string | null {
  return readString(node.metadata?.sql) ?? readString(readMetadataConfig(node.metadata).sql);
}

export function readCompiledSqlText(node: CanonicalNode): string | null {
  return readString(node.metadata?.compiledSql);
}

export function readTransformationSqlMirrorState(
  node: CanonicalNode
): TransformationSqlMirrorState {
  const draftSql = readDraftSqlText(node);
  const compiledSql = readCompiledSqlText(node);

  if (draftSql && compiledSql) {
    return {
      status: 'invalid_ambiguous',
      draftSql,
      compiledSql,
      executableSql: null,
    };
  }

  if (draftSql) {
    return {
      status: 'draft_dirty',
      draftSql,
      compiledSql: null,
      executableSql: draftSql,
    };
  }

  return {
    status: 'clean',
    draftSql: null,
    compiledSql,
    executableSql: compiledSql,
  };
}

export function resolveExecutableSqlText(node: CanonicalNode): ExecutableSqlResolution {
  const mirrorState = readTransformationSqlMirrorState(node);

  if (mirrorState.status === 'invalid_ambiguous') {
    return {
      ok: false,
      message: `Preview graph artifact cannot choose between draft SQL and compiled SQL for transform node ${node.id}. Re-apply the SQL edit or regenerate compiled SQL before preview.`,
    };
  }

  return {
    ok: true,
    sql: mirrorState.executableSql,
  };
}

export function buildDvtSqlTransformMetadata(
  node: CanonicalNode,
  nextSql: string
): Record<string, unknown> {
  const sql = nextSql.trim();
  const { sql: _existingConfigSql, ...configWithoutSql } = readMetadataConfig(node.metadata);
  const {
    sql: _existingSql,
    compiledSql: _existingCompiledSql,
    config: _existingConfig,
    ...metadataWithoutSql
  } = node.metadata ?? {};

  return {
    ...metadataWithoutSql,
    ...(sql.length > 0 ? { sql } : {}),
    config: {
      ...configWithoutSql,
      ...(sql.length > 0 ? { sql } : {}),
    },
  };
}
