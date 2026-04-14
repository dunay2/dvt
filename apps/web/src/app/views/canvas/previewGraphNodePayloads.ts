import type { DesignGraphDraft, DesignNodeType, GitArtifactRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';

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
  const schema = readConfigString(config, 'schema');
  const table = readConfigString(config, 'table');
  const alias = readConfigString(config, 'alias') ?? table;

  if (!schema || !table || !alias) {
    throw new Error(
      `Preview graph artifact requires source node ${node.id} to define metadata.config.schema, table, and alias-compatible source binding.`
    );
  }

  return {
    id: node.id,
    type: 'source',
    payload: {
      kind: 'postgres_table',
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

  if (dialect !== 'postgres') {
    throw new Error(
      `Preview graph artifact requires transform node ${node.id} to use dialect postgres.`
    );
  }
  if (!node.path) {
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
      entrypoint: node.path,
    },
  };
}

export function requireSinkPayload(
  node: CanonicalNode
): Extract<DesignGraphDraft['nodes'][number], { type: 'sink' }> {
  const config = readCanonicalNodeConfig(node);
  const schema = readConfigString(config, 'schema');
  const table = readConfigString(config, 'table');
  const materializationValue =
    readConfigString(config, 'materialization') ?? readConfigString(config, 'materialized');
  const writeModeValue = readConfigString(config, 'writeMode') ?? 'replace';

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

function readConfigString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
