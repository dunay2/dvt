/** Owned concern: persist the single canonical DVT Transform semantic authority. */
import {
  DVT_TRANSFORM_AUTHORING_MODE,
  DVT_TRANSFORM_AUTHORING_AUTHORITY_VERSION,
  DvtTransformAuthoringAuthorityV1Schema,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';

export const DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY = 'transformAuthoring' as const;
const RETIRED_LINEAGE_PROVENANCE_METADATA_KEY = 'transformLineageProvenance';

export type DvtTransformAuthoringAuthority = Readonly<{
  version: typeof DVT_TRANSFORM_AUTHORING_AUTHORITY_VERSION;
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.substrait;
  semanticDocument: DvtSubstraitSemanticDocumentV1;
}>;

function assertDvtTransformNode(node: CanonicalNode): void {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') {
    throw new Error('DVT transform authoring authority requires a dvt:transform node.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasRetiredSqlMetadata(node: CanonicalNode): boolean {
  if (node.metadata != null && Object.hasOwn(node.metadata, 'sql')) return true;
  const config = node.metadata?.config;
  return isRecord(config) && Object.hasOwn(config, 'sql');
}

function removeRetiredAuthorityMetadata(node: CanonicalNode): Record<string, unknown> {
  const {
    sql: _sql,
    compiledSql: _compiledSql,
    config: rawConfig,
    [DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]: _authority,
    [RETIRED_LINEAGE_PROVENANCE_METADATA_KEY]: _lineage,
    ...retainedMetadata
  } = node.metadata ?? {};
  const { sql: _configSql, ...retainedConfig } = isRecord(rawConfig) ? rawConfig : {};
  return {
    ...retainedMetadata,
    ...(Object.keys(retainedConfig).length > 0 ? { config: retainedConfig } : {}),
  };
}

export function readDvtTransformAuthoringAuthority(
  node: CanonicalNode
): DvtTransformAuthoringAuthority | null {
  assertDvtTransformNode(node);
  const rawAuthority = node.metadata?.[DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY];

  if (rawAuthority === undefined) {
    if (hasRetiredSqlMetadata(node)) {
      throw new Error('DVT transform authoring authority metadata is unsupported.');
    }
    return null;
  }
  if (isRecord(rawAuthority) && (rawAuthority.mode === 'sql' || rawAuthority.mode === 'visual')) {
    throw new Error('DVT transform authoring authority metadata is unsupported.');
  }

  const result = DvtTransformAuthoringAuthorityV1Schema.safeParse(rawAuthority);
  if (!result.success || result.data.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) {
    throw new Error('DVT transform authoring authority metadata is invalid.');
  }
  if (hasRetiredSqlMetadata(node)) {
    throw new Error('DVT transform authoring authority metadata is unsupported.');
  }
  return result.data;
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
      ...removeRetiredAuthorityMetadata(node),
      [DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]: {
        version: DVT_TRANSFORM_AUTHORING_AUTHORITY_VERSION,
        mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
        semanticDocument,
      },
    },
  };
}
