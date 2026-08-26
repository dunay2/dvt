/** Owned concern: classify and materialize DVT transform SQL mirror state. */
import {
  DVT_TRANSFORM_AUTHORING_MODE,
  DvtTransformAuthoringAuthorityV1Schema,
  VisualTransformRecipeV1Schema,
  type VisualTransformRecipeV1,
} from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';

export const DVT_TRANSFORM_LINEAGE_PROVENANCE_METADATA_KEY = 'transformLineageProvenance' as const;

export type TransformationSqlMirrorStatus = 'clean' | 'draft_dirty' | 'invalid_ambiguous';

export type TransformationSqlMirrorState = Readonly<{
  status: TransformationSqlMirrorStatus;
  draftSql: string | null;
  compiledSql: string | null;
  executableSql: string | null;
}>;

export type ExecutableSqlResolution =
  Readonly<{ ok: true; sql: string | null }> | Readonly<{ ok: false; message: string }>;

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
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

export function readDvtTransformLineageProvenance(
  node: CanonicalNode
): VisualTransformRecipeV1 | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:sql_transform') return null;

  const result = VisualTransformRecipeV1Schema.safeParse(
    node.metadata?.[DVT_TRANSFORM_LINEAGE_PROVENANCE_METADATA_KEY]
  );
  return result.success ? result.data : null;
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
  const authority = DvtTransformAuthoringAuthorityV1Schema.safeParse(
    node.metadata?.transformAuthoring
  );
  if (authority.success && authority.data.mode === DVT_TRANSFORM_AUTHORING_MODE.substrait) {
    return {
      ok: false,
      message: `SQL projection is not available yet for Substrait-authored transform node ${node.id}.`,
    };
  }

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
  const hasSql = nextSql.trim().length > 0;
  const { sql: _existingConfigSql, ...configWithoutSql } = readMetadataConfig(node.metadata);
  const {
    sql: _existingSql,
    compiledSql: _existingCompiledSql,
    config: _existingConfig,
    [DVT_TRANSFORM_LINEAGE_PROVENANCE_METADATA_KEY]: _existingLineageProvenance,
    ...metadataWithoutSql
  } = node.metadata ?? {};

  return {
    ...metadataWithoutSql,
    ...(hasSql ? { sql: nextSql } : {}),
    config: {
      ...configWithoutSql,
      ...(hasSql ? { sql: nextSql } : {}),
    },
  };
}
