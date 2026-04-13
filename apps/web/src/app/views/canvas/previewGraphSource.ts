import {
  type DesignNodeType,
  jcsCanonicalize,
  type DesignGraphDraft,
  type GenericGraphSourceV1,
  type GitArtifactRef,
} from '@dvt/contracts';

import { resolvePreviewStepKind } from '../../plugins/nodeTypeRegistry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export function buildPreviewGraphSource(
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[],
  scopedNodeIds: readonly string[]
): GenericGraphSourceV1 {
  const scopedNodeIdSet = new Set(scopedNodeIds);
  const scopedNodes = nodes
    .filter((node) => scopedNodeIdSet.has(node.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const dependsOnByNodeId = new Map<string, string[]>();

  for (const edge of edges) {
    if (!scopedNodeIdSet.has(edge.sourceId) || !scopedNodeIdSet.has(edge.targetId)) {
      continue;
    }

    const dependsOn = dependsOnByNodeId.get(edge.targetId) ?? [];
    dependsOn.push(edge.sourceId);
    dependsOnByNodeId.set(edge.targetId, dependsOn);
  }

  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'transformation-design-graph',
    sourceVersion: 'transformation-sql-first-v1',
    nodes: scopedNodes.map((node) => ({
      nodeId: node.id,
      stepKind: resolvePreviewStepKind(node.kind, node.role),
      dependsOn: [...(dependsOnByNodeId.get(node.id) ?? [])].sort((left, right) =>
        left.localeCompare(right)
      ),
      metadata: {
        displayName: node.name,
        ...(node.path ? { sourceRef: node.path } : {}),
        tags: {
          pluginId: node.pluginId,
          role: node.role,
          kind: node.kind,
        },
      },
    })),
  };
}

export function buildPreviewGraphSignature(
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[],
  scopedNodeIds: readonly string[]
): string {
  return jcsCanonicalize(buildPreviewGraphSource(nodes, edges, scopedNodeIds));
}

type PreviewArtifactContext = {
  tenantId: string;
  projectId: string;
  environmentId: string;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readConfigString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function resolveNodeRole(node: CanonicalNode): DesignNodeType {
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

function readCanonicalNodeConfig(node: CanonicalNode): Record<string, unknown> {
  return isPlainRecord(node.metadata?.config) ? node.metadata.config : {};
}

function requireSourcePayload(node: CanonicalNode): Extract<DesignGraphDraft['nodes'][number], { type: 'source' }> {
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

function requireTransformPayload(
  node: CanonicalNode,
  sqlArtifact: GitArtifactRef
): Extract<DesignGraphDraft['nodes'][number], { type: 'sql_transform' }> {
  const config = readCanonicalNodeConfig(node);
  const dialect = readConfigString(config, 'dialect') ?? 'postgres';

  if (dialect !== 'postgres') {
    throw new Error(`Preview graph artifact requires transform node ${node.id} to use dialect postgres.`);
  }
  if (!node.path) {
    throw new Error(`Preview graph artifact requires transform node ${node.id} to define a workspace file path.`);
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

function requireSinkPayload(node: CanonicalNode): Extract<DesignGraphDraft['nodes'][number], { type: 'sink' }> {
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

function buildPreviewDesignGraphDraft(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  sqlArtifact: GitArtifactRef;
  context: PreviewArtifactContext;
}): DesignGraphDraft {
  const scopedNodeIdSet = new Set(args.scopedNodeIds);
  const scopedNodes = args.nodes
    .filter((node) => scopedNodeIdSet.has(node.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const scopedEdges = args.edges
    .filter((edge) => scopedNodeIdSet.has(edge.sourceId) && scopedNodeIdSet.has(edge.targetId))
    .sort((left, right) =>
      left.sourceId === right.sourceId
        ? left.targetId.localeCompare(right.targetId)
        : left.sourceId.localeCompare(right.sourceId)
    );

  return {
    context: {
      tenantId: args.context.tenantId,
      projectId: args.context.projectId,
      environmentId: args.context.environmentId,
      executionTarget: 'postgres',
    },
    nodes: scopedNodes.map((node) => {
      const role = resolveNodeRole(node);
      if (role === 'source') {
        return requireSourcePayload(node);
      }
      if (role === 'sql_transform') {
        return requireTransformPayload(node, args.sqlArtifact);
      }
      return requireSinkPayload(node);
    }),
    edges: scopedEdges.map((edge) => ({
      fromNodeId: edge.sourceId,
      toNodeId: edge.targetId,
    })),
  };
}

function quoteYamlScalar(value: string): string {
  return JSON.stringify(value);
}

export function serializePreviewDesignGraphArtifact(
  designGraphDraft: DesignGraphDraft
): string {
  const lines = [
    'context:',
    `  tenantId: ${quoteYamlScalar(designGraphDraft.context.tenantId)}`,
    `  projectId: ${quoteYamlScalar(designGraphDraft.context.projectId)}`,
    `  environmentId: ${quoteYamlScalar(designGraphDraft.context.environmentId)}`,
    `  executionTarget: ${quoteYamlScalar(designGraphDraft.context.executionTarget)}`,
    'nodes:',
  ];

  for (const node of designGraphDraft.nodes) {
    lines.push(`  - id: ${quoteYamlScalar(node.id)}`);
    lines.push(`    type: ${quoteYamlScalar(node.type)}`);
    lines.push('    payload:');

    if (node.type === 'source') {
      lines.push(`      kind: ${quoteYamlScalar(node.payload.kind)}`);
      lines.push(`      schema: ${quoteYamlScalar(node.payload.schema)}`);
      lines.push(`      table: ${quoteYamlScalar(node.payload.table)}`);
      lines.push(`      alias: ${quoteYamlScalar(node.payload.alias)}`);
      continue;
    }

    if (node.type === 'sql_transform') {
      lines.push(`      dialect: ${quoteYamlScalar(node.payload.dialect)}`);
      lines.push(`      entrypoint: ${quoteYamlScalar(node.payload.entrypoint)}`);
      lines.push('      sqlArtifact:');
      lines.push(`        repo: ${quoteYamlScalar(node.payload.sqlArtifact.repo)}`);
      lines.push(`        path: ${quoteYamlScalar(node.payload.sqlArtifact.path)}`);
      lines.push(`        ref: ${quoteYamlScalar(node.payload.sqlArtifact.ref)}`);
      lines.push(`        commitSha: ${quoteYamlScalar(node.payload.sqlArtifact.commitSha)}`);
      lines.push(
        `        contentSha256: ${quoteYamlScalar(node.payload.sqlArtifact.contentSha256)}`
      );
      continue;
    }

    lines.push(`      kind: ${quoteYamlScalar(node.payload.kind)}`);
    lines.push(`      schema: ${quoteYamlScalar(node.payload.schema)}`);
    lines.push(`      table: ${quoteYamlScalar(node.payload.table)}`);
    lines.push(`      materialization: ${quoteYamlScalar(node.payload.materialization)}`);
    lines.push(`      writeMode: ${quoteYamlScalar(node.payload.writeMode)}`);
  }

  lines.push('edges:');
  if (designGraphDraft.edges.length === 0) {
    lines.push('  []');
  } else {
    for (const edge of designGraphDraft.edges) {
      lines.push(`  - fromNodeId: ${quoteYamlScalar(edge.fromNodeId)}`);
      lines.push(`    toNodeId: ${quoteYamlScalar(edge.toNodeId)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function buildPreviewDesignGraphArtifactContent(args: {
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[],
  scopedNodeIds: readonly string[],
  sqlArtifact: GitArtifactRef,
  context: PreviewArtifactContext,
}): string {
  return serializePreviewDesignGraphArtifact(
    buildPreviewDesignGraphDraft({
      nodes: args.nodes,
      edges: args.edges,
      scopedNodeIds: args.scopedNodeIds,
      sqlArtifact: args.sqlArtifact,
      context: args.context,
    })
  );
}
