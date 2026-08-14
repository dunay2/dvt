import type { DesignGraphDraft, DesignNodeType, GitArtifactRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { resolveEffectiveDvtConnectionRef } from './canvasDvtAuthoringModel';

export function resolveScopedTransformationNodes(
  nodes: readonly CanonicalNode[],
  scopedNodeIds: readonly string[]
): {
  source: CanonicalNode;
  transform: CanonicalNode;
  sink: CanonicalNode;
} {
  const scopedNodeIdSet = new Set(scopedNodeIds);
  const scopedNodes = nodes.filter((node) => scopedNodeIdSet.has(node.id));
  const source = scopedNodes.find((node) => node.role === 'input');
  const transform = scopedNodes.find((node) => node.role === 'transform');
  const sink = scopedNodes.find((node) => node.role === 'output');

  if (!source || !transform || !sink) {
    throw new Error(
      'Preview graph source requires exactly one source, one sql_transform, and one sink node.'
    );
  }

  return { source, transform, sink };
}

export function buildPreviewMetadata(node: CanonicalNode): {
  displayName: string;
  sourceRef?: string;
  tags: {
    pluginId: string;
    role: string;
    kind: string;
  };
} {
  return {
    displayName: node.name,
    ...(node.path ? { sourceRef: node.path } : {}),
    tags: {
      pluginId: node.pluginId,
      role: node.role,
      kind: node.kind,
    },
  };
}

export function isCanvasAuthoringNode(node: CanonicalNode): boolean {
  return node.tags.includes('authoring');
}

export function resolveAuthoringSqlArtifactPath(node: CanonicalNode): string {
  return `models/${slugifyPathSegment(node.id || node.name || 'sql-transform')}.sql`;
}

export function resolveAuthoringSqlIdentifier(node: CanonicalNode): string {
  const normalized = slugifySqlIdentifier(node.name) || slugifySqlIdentifier(node.id) || 'node';

  return startsWithDigit(normalized) ? `n_${normalized}` : normalized;
}

export function resolveNodeRole(node: CanonicalNode): DesignNodeType {
  switch (node.role) {
    case 'input':
      return 'source';
    case 'transform':
      return 'sql_transform';
    case 'output':
      return 'sink';
    default:
      throw new Error(`Unsupported transformation node role for graph artifact: ${node.role}`);
  }
}

export function requireSourcePayload(
  node: CanonicalNode
): Extract<DesignGraphDraft['nodes'][number], { type: 'source' }> {
  const config = readCanonicalNodeConfig(node);
  const importedSchema = readMetadataString(node, 'schema');
  const importedTableName = readMetadataString(node, 'tableName');
  const importedSourceName = readMetadataString(node, 'sourceName');
  const schema =
    readConfigString(config, 'schema') ?? importedSchema ?? readAuthoringDefaultSchema(node);
  const table =
    readConfigString(config, 'table') ?? importedTableName ?? readAuthoringDefaultTable(node);
  const alias = readConfigString(config, 'alias') ?? importedSourceName ?? table;
  const connectionRef = resolveEffectiveDvtConnectionRef(node);

  if (!schema || !table || !alias || !connectionRef) {
    throw new Error(
      `Preview graph artifact requires source node ${node.id} to define one PostgreSQL connection, schema, table, and alias-compatible source binding.`
    );
  }

  return {
    id: node.id,
    type: 'source',
    payload: {
      kind: 'postgres_table',
      connectionRef,
      schema,
      table,
      alias,
    },
  };
}

export function requireTransformPayload(
  node: CanonicalNode,
  sqlArtifact: GitArtifactRef
): Extract<DesignGraphDraft['nodes'][number], { type: 'sql_transform' }> {
  const config = readCanonicalNodeConfig(node);
  const dialect = readConfigString(config, 'dialect') ?? 'postgres';
  const entrypoint =
    readConfigString(config, 'entrypoint') ??
    node.path ??
    (isCanvasAuthoringNode(node) ? sqlArtifact.path : undefined);

  if (dialect !== 'postgres') {
    throw new Error(
      `Preview graph artifact requires transform node ${node.id} to use dialect postgres.`
    );
  }
  if (!entrypoint) {
    throw new Error(
      `Preview graph artifact requires transform node ${node.id} to define a workspace file path.`
    );
  }

  return {
    id: node.id,
    type: 'sql_transform',
    payload: {
      dialect: 'postgres',
      sqlArtifact,
      entrypoint,
    },
  };
}

export function requireSinkPayload(
  node: CanonicalNode
): Extract<DesignGraphDraft['nodes'][number], { type: 'sink' }> {
  const config = readCanonicalNodeConfig(node);
  const schema = readConfigString(config, 'schema') ?? readAuthoringDefaultSchema(node);
  const table = readConfigString(config, 'table') ?? readAuthoringDefaultTable(node);
  const materializationValue =
    readConfigString(config, 'materialization') ??
    readConfigString(config, 'materialized') ??
    readAuthoringDefaultMaterialization(node);
  const writeModeValue =
    readConfigString(config, 'writeMode') ?? readAuthoringDefaultWriteMode(node);

  const materialization =
    materializationValue === 'table' || materializationValue === 'view'
      ? materializationValue
      : undefined;
  const writeMode =
    writeModeValue === 'replace' || writeModeValue === 'append' ? writeModeValue : undefined;

  if (!schema || !table || !materialization || !writeMode) {
    throw new Error(
      `Preview graph artifact requires sink node ${node.id} to define metadata.config.schema, table, materialization, and writeMode.`
    );
  }

  return {
    id: node.id,
    type: 'sink',
    payload: {
      kind: 'postgres_table',
      schema,
      table,
      materialization,
      writeMode,
    },
  };
}

function readCanonicalNodeConfig(node: CanonicalNode): Record<string, unknown> {
  return isPlainRecord(node.metadata?.config) ? node.metadata.config : {};
}

function readAuthoringDefaultSchema(node: CanonicalNode): string | undefined {
  return isCanvasAuthoringNode(node) ? 'public' : undefined;
}

function readAuthoringDefaultTable(node: CanonicalNode): string | undefined {
  return isCanvasAuthoringNode(node) ? resolveAuthoringSqlIdentifier(node) : undefined;
}

function readAuthoringDefaultMaterialization(node: CanonicalNode): string | undefined {
  return isCanvasAuthoringNode(node) ? 'table' : undefined;
}

function readAuthoringDefaultWriteMode(node: CanonicalNode): string | undefined {
  return isCanvasAuthoringNode(node) ? 'replace' : undefined;
}

function readConfigString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readMetadataString(node: CanonicalNode, key: string): string | undefined {
  const value = node.metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function slugifyPathSegment(value: string): string {
  return collectAsciiWords(value).join('-') || 'sql-transform';
}

function slugifySqlIdentifier(value: string): string {
  return collectAsciiWords(value).join('_');
}

function collectAsciiWords(value: string): string[] {
  const words: string[] = [];
  let currentWord = '';

  for (const character of value) {
    if (isAsciiAlphaNumeric(character)) {
      currentWord += character.toLowerCase();
      continue;
    }

    if (currentWord.length > 0) {
      words.push(currentWord);
      currentWord = '';
    }
  }

  if (currentWord.length > 0) {
    words.push(currentWord);
  }

  return words;
}

function isAsciiAlphaNumeric(character: string): boolean {
  const codePoint = character.codePointAt(0);
  if (codePoint == null) {
    return false;
  }

  return (
    (codePoint >= 48 && codePoint <= 57) ||
    (codePoint >= 65 && codePoint <= 90) ||
    (codePoint >= 97 && codePoint <= 122)
  );
}

function startsWithDigit(value: string): boolean {
  const firstCharacter = value.at(0);
  if (!firstCharacter) {
    return false;
  }

  const codePoint = firstCharacter.codePointAt(0);
  return codePoint != null && codePoint >= 48 && codePoint <= 57;
}
