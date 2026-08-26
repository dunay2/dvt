/** Owned concern: project and transition the single DVT transform authoring authority. */
import {
  DVT_TRANSFORM_AUTHORING_MODE,
  DvtTransformAuthoringAuthorityV1Schema,
  VISUAL_TRANSFORM_RECIPE_VERSION,
  canonicalizeVisualTransformRecipeV1,
  type VisualTransformRecipeV1,
} from '@dvt/contracts';
import {
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts/substrait';

import type { CanonicalNode } from '../../types/canonical';
import {
  DVT_TRANSFORM_LINEAGE_PROVENANCE_METADATA_KEY,
  buildDvtSqlTransformMetadata,
  readDraftSqlText,
} from './canvasTransformationSqlMirror';

export const DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY = 'transformAuthoring' as const;

export type DvtTransformAuthoringAuthority =
  | Readonly<{
      version: typeof VISUAL_TRANSFORM_RECIPE_VERSION;
      mode: typeof DVT_TRANSFORM_AUTHORING_MODE.sql;
      sql: string;
    }>
  | Readonly<{
      version: typeof VISUAL_TRANSFORM_RECIPE_VERSION;
      mode: typeof DVT_TRANSFORM_AUTHORING_MODE.visual;
      recipe: VisualTransformRecipeV1;
    }>
  | Readonly<{
      version: typeof VISUAL_TRANSFORM_RECIPE_VERSION;
      mode: typeof DVT_TRANSFORM_AUTHORING_MODE.substrait;
      semanticDocument: DvtSubstraitSemanticDocumentV1;
    }>;

function assertDvtTransformNode(node: CanonicalNode): void {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:sql_transform') {
    throw new Error('DVT transform authoring authority requires a dvt:sql_transform node.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasEditableSqlMetadata(node: CanonicalNode): boolean {
  if (node.metadata != null && Object.hasOwn(node.metadata, 'sql')) return true;
  const config = node.metadata?.config;
  return isRecord(config) && Object.hasOwn(config, 'sql');
}

function removeEditableSqlMetadata(node: CanonicalNode): Record<string, unknown> {
  const {
    sql: _sql,
    compiledSql: _compiledSql,
    config: rawConfig,
    [DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]: _authority,
    [DVT_TRANSFORM_LINEAGE_PROVENANCE_METADATA_KEY]: _lineageProvenance,
    ...metadataWithoutTransformAuthority
  } = node.metadata ?? {};
  const { sql: _configSql, ...configWithoutSql } = isRecord(rawConfig) ? rawConfig : {};
  return {
    ...metadataWithoutTransformAuthority,
    ...(Object.keys(configWithoutSql).length > 0 ? { config: configWithoutSql } : {}),
  };
}

export function readDvtTransformAuthoringAuthority(
  node: CanonicalNode
): DvtTransformAuthoringAuthority {
  assertDvtTransformNode(node);
  const rawAuthority = node.metadata?.[DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY];
  const sql = readDraftSqlText(node) ?? '';

  if (rawAuthority === undefined) {
    return { version: VISUAL_TRANSFORM_RECIPE_VERSION, mode: DVT_TRANSFORM_AUTHORING_MODE.sql, sql };
  }

  const result = DvtTransformAuthoringAuthorityV1Schema.safeParse(rawAuthority);
  if (!result.success) throw new Error('DVT transform authoring authority metadata is invalid.');

  if (result.data.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
    if (hasEditableSqlMetadata(node)) {
      throw new Error('Visual DVT transform authority cannot coexist with editable SQL.');
    }
    return result.data;
  }

  if (result.data.mode === DVT_TRANSFORM_AUTHORING_MODE.substrait) {
    if (hasEditableSqlMetadata(node)) {
      throw new Error('Substrait DVT transform authority cannot coexist with editable SQL.');
    }
    return result.data;
  }

  return { ...result.data, sql };
}

export function applyDvtVisualTransformRecipe(
  node: CanonicalNode,
  recipeInput: unknown
): CanonicalNode {
  assertDvtTransformNode(node);
  const recipe = canonicalizeVisualTransformRecipeV1(recipeInput);
  return {
    ...node,
    metadata: {
      ...removeEditableSqlMetadata(node),
      [DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]: {
        version: VISUAL_TRANSFORM_RECIPE_VERSION,
        mode: DVT_TRANSFORM_AUTHORING_MODE.visual,
        recipe,
      },
    },
  };
}

export function applyDvtSubstraitSemanticDocument(
  node: CanonicalNode,
  documentInput: unknown
): CanonicalNode {
  assertDvtTransformNode(node);
  const semanticDocument = canonicalizeDvtSubstraitSemanticDocumentV1(documentInput);
  return {
    ...node,
    metadata: {
      ...removeEditableSqlMetadata(node),
      [DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]: {
        version: VISUAL_TRANSFORM_RECIPE_VERSION,
        mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
        semanticDocument,
      },
    },
  };
}

export function convertDvtVisualTransformToSql(
  node: CanonicalNode,
  generatedSql: string
): CanonicalNode {
  const currentAuthority = readDvtTransformAuthoringAuthority(node);
  if (currentAuthority.mode !== DVT_TRANSFORM_AUTHORING_MODE.visual) {
    throw new Error('Visual to SQL conversion requires current visual authority.');
  }
  if (generatedSql.trim().length === 0) {
    throw new Error('Visual to SQL conversion requires nonblank generated SQL.');
  }
  return {
    ...node,
    metadata: {
      ...buildDvtSqlTransformMetadata(node, generatedSql),
      [DVT_TRANSFORM_LINEAGE_PROVENANCE_METADATA_KEY]: currentAuthority.recipe,
      [DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]: {
        version: VISUAL_TRANSFORM_RECIPE_VERSION,
        mode: DVT_TRANSFORM_AUTHORING_MODE.sql,
      },
    },
  };
}
