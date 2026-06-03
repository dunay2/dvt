/** Owned concern: project workspace graph semantic truth into DBT-shaped graph snapshots for workspace read ports. */
import type { WorkspaceGraphAuthoringDraft, WorkspaceGraphDraftReadResponse } from '@dvt/contracts';

import type { WorkspaceGraphSnapshot } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { DbtColumn, DbtEdge, DbtNode, DbtNodeType } from '../../types/dbt';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from './workspaceGraphDraftProjection';

type DbtNodeTypeRule = Readonly<{
  type: DbtNodeType;
  kindIncludes: readonly string[];
  roles?: readonly CanonicalNode['role'][];
}>;

const DBT_NODE_TYPE_RULES: readonly DbtNodeTypeRule[] = [
  { type: 'SOURCE', kindIncludes: ['source'], roles: ['input'] },
  { type: 'TEST', kindIncludes: ['test'], roles: ['check'] },
  { type: 'EXPOSURE', kindIncludes: ['exposure'] },
  { type: 'METRIC', kindIncludes: ['metric'] },
  { type: 'SEED', kindIncludes: ['seed'] },
  { type: 'SNAPSHOT', kindIncludes: ['snapshot'] },
  { type: 'MACRO', kindIncludes: ['macro'] },
];

function matchesDbtNodeTypeRule(args: {
  rule: DbtNodeTypeRule;
  node: CanonicalNode;
  normalizedKind: string;
}): boolean {
  const { rule, node, normalizedKind } = args;

  return (
    rule.kindIncludes.some((kindPart) => normalizedKind.includes(kindPart)) ||
    (rule.roles?.includes(node.role) ?? false)
  );
}

function resolveDbtNodeType(node: CanonicalNode): DbtNodeType {
  const normalizedKind = node.kind.toLowerCase();
  const matchedRule = DBT_NODE_TYPE_RULES.find((rule) =>
    matchesDbtNodeTypeRule({ rule, node, normalizedKind })
  );

  return matchedRule?.type ?? 'MODEL';
}

function resolveDbtEdgeType(edge: CanonicalEdge): DbtEdge['type'] {
  switch (edge.relation) {
    case 'validation':
      return 'test';
    case 'consumption':
      return 'exposure';
    case 'metric':
      return 'metric';
    case 'custom':
    case 'lineage':
      return 'ref';
  }
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readMetadataObject(
  metadata: CanonicalNode['metadata'],
  key: string
): Record<string, unknown> | undefined {
  const value = metadata?.[key];

  return isRecordValue(value) ? { ...value } : undefined;
}

function readMetadataString(metadata: CanonicalNode['metadata'], key: string): string | undefined {
  const value = metadata?.[key];

  return typeof value === 'string' ? value : undefined;
}

function hasOptionalDbtColumnDescription(column: Record<string, unknown>): boolean {
  return column.description == null || typeof column.description === 'string';
}

function isDbtColumn(value: unknown): value is DbtColumn {
  if (!isRecordValue(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.nullable === 'boolean' &&
    hasOptionalDbtColumnDescription(value)
  );
}

function cloneDbtColumn(column: DbtColumn): DbtColumn {
  const clonedColumn: DbtColumn = {
    name: column.name,
    type: column.type,
    nullable: column.nullable,
  };

  if (column.description != null) {
    clonedColumn.description = column.description;
  }

  return clonedColumn;
}

function readMetadataColumns(metadata: CanonicalNode['metadata']): DbtColumn[] | undefined {
  const value = metadata?.columns;

  return Array.isArray(value) && value.every(isDbtColumn)
    ? value.map((column) => cloneDbtColumn(column))
    : undefined;
}

function projectCanonicalNodeToDbtNode(args: {
  node: CanonicalNode;
  dependencies: readonly string[];
}): DbtNode {
  const { node, dependencies } = args;
  const metadataPackage = readMetadataString(node.metadata, 'package');
  const dbtNode: DbtNode = {
    id: node.id,
    name: node.name,
    type: resolveDbtNodeType(node),
    package: metadataPackage ?? node.pluginId,
    path: node.path ?? '',
    tags: [...node.tags],
    status: node.status,
    dependencies: [...dependencies],
  };
  const config = readMetadataObject(node.metadata, 'config');
  const compiledSql = readMetadataString(node.metadata, 'compiledSql');
  const columns = readMetadataColumns(node.metadata);

  if (node.lastDuration != null) {
    dbtNode.lastDuration = node.lastDuration;
  }
  if (node.lastCost != null) {
    dbtNode.lastCost = node.lastCost;
  }
  if (node.description != null) {
    dbtNode.description = node.description;
  }
  if (config != null) {
    dbtNode.config = config;
  }
  if (compiledSql != null) {
    dbtNode.compiledSql = compiledSql;
  }
  if (columns != null) {
    dbtNode.columns = columns;
  }

  return dbtNode;
}

function buildDependenciesByNodeId(edges: readonly CanonicalEdge[]): Map<string, string[]> {
  const dependenciesByNodeId = new Map<string, string[]>();

  for (const edge of edges) {
    const dependencies = dependenciesByNodeId.get(edge.targetId) ?? [];
    dependencies.push(edge.sourceId);
    dependenciesByNodeId.set(edge.targetId, dependencies);
  }

  return dependenciesByNodeId;
}

export function projectWorkspaceGraphAuthoringDraftSnapshot(
  draft: WorkspaceGraphAuthoringDraft
): WorkspaceGraphSnapshot {
  const semanticGraph = projectWorkspaceGraphAuthoringDraftSemanticGraph(draft);
  const dependenciesByNodeId = buildDependenciesByNodeId(semanticGraph.canonicalEdges);

  return {
    nodes: semanticGraph.canonicalNodes.map((node) =>
      projectCanonicalNodeToDbtNode({
        node,
        dependencies: dependenciesByNodeId.get(node.id) ?? [],
      })
    ),
    edges: semanticGraph.canonicalEdges.map((edge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      type: resolveDbtEdgeType(edge),
    })),
  };
}

export function projectWorkspaceGraphDraftReadResponseSnapshot(
  response: WorkspaceGraphDraftReadResponse
): WorkspaceGraphSnapshot {
  switch (response.kind) {
    case 'ok':
      return projectWorkspaceGraphAuthoringDraftSnapshot(response.record.draft);
    case 'denied':
      throw new Error(
        `Workspace graph snapshot read denied for the current scope (${response.capability.reason}).`
      );
    case 'format_error':
      throw new Error(`Workspace graph snapshot read failed with ${response.formatError.reason}.`);
  }
}
