/** Owned concern: nodePropertyTopologyRows. */

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveDvtConnectionProvenance } from '../../views/canvas/canvasDvtConnectionProvenance';
import type { NodePropertyRow, NodePropertyTableRow } from './nodePropertiesContracts';
import { addRow, formatWords } from './nodePropertyValues';
import { NODE_PROPERTY_ROW_ID } from './nodePropertiesContracts';

export type SourceRelationship = Readonly<{
  id: string;
  relatedNodeName: string;
  relation: string;
}>;

export function isInspectorSource(node: CanonicalNode): boolean {
  return node.kind === 'dvt:source' || node.kind === 'dbt:source';
}

/** Adapt property rows without using translated direction labels as topology identity. */
export function readSourceRelationships(
  rows: readonly NodePropertyTableRow[]
): readonly SourceRelationship[] {
  return rows.flatMap((row): SourceRelationship[] => {
    const relatedNodeName = row.cells.node?.trim();
    if (!row.id.startsWith('output:') || !relatedNodeName) return [];
    return [{ id: row.id, relatedNodeName, relation: row.cells.relation?.trim() || '—' }];
  });
}

export function buildSummaryRows(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): NodePropertyRow[] {
  const rows: NodePropertyRow[] = [];
  const nodeNameById = new Map(nodes.map((candidate) => [candidate.id, candidate.name]));
  const downstreamNodes = edges
    .filter((edge) => edge.sourceId === node.id)
    .map((edge) => nodeNameById.get(edge.targetId) ?? edge.targetId);

  addRow(rows, NODE_PROPERTY_ROW_ID.nodeId, 'Node ID', node.id);
  addRow(rows, NODE_PROPERTY_ROW_ID.kind, 'Kind', node.kind);
  addRow(rows, NODE_PROPERTY_ROW_ID.role, 'Role', formatWords(node.role));
  addRow(rows, NODE_PROPERTY_ROW_ID.status, 'Status', formatWords(node.status));
  addRow(rows, NODE_PROPERTY_ROW_ID.plugin, 'Plugin', node.pluginId);
  if (!isInspectorSource(node)) {
    const upstreamNodes = edges
      .filter((edge) => edge.targetId === node.id)
      .map((edge) => nodeNameById.get(edge.sourceId) ?? edge.sourceId);
    addRow(
      rows,
      NODE_PROPERTY_ROW_ID.upstreamNodes,
      'Upstream nodes',
      formatTopologyNames(upstreamNodes)
    );
  }
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.downstreamNodes,
    'Downstream nodes',
    formatTopologyNames(downstreamNodes)
  );
  addRow(rows, NODE_PROPERTY_ROW_ID.tags, 'Tags', formatTopologyNames(node.tags));
  return rows;
}

export function buildInputsOutputsRows(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): readonly NodePropertyTableRow[] {
  const nodeNameById = new Map(nodes.map((candidate) => [candidate.id, candidate.name]));
  const rows: NodePropertyTableRow[] = [];
  const context: TopologyRowContext = {
    nodeId: node.id,
    source: isInspectorSource(node),
    nodeNameById,
    inheritedConnection: readInheritedConnection({ node, nodes, edges }),
  };
  for (const edge of edges) {
    const input = buildInputTopologyRow(edge, context);
    if (input) rows.push(input);
    const output = buildOutputTopologyRow(edge, context);
    if (output) rows.push(output);
  }
  return rows;
}

type TopologyRowContext = Readonly<{
  nodeId: string;
  source: boolean;
  nodeNameById: ReadonlyMap<string, string>;
  inheritedConnection: string | undefined;
}>;

function readInheritedConnection({
  node,
  nodes,
  edges,
}: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): string | undefined {
  if (node.pluginId !== 'dvt') return undefined;
  if (node.kind !== 'dvt:transform') return undefined;
  const provenance = resolveDvtConnectionProvenance({ node, nodes, edges });
  if (provenance.kind !== 'resolved') return undefined;
  return `${provenance.connectionRef.provider} · ${provenance.connectionRef.connectionId}`;
}

function buildInputTopologyRow(
  edge: CanonicalEdge,
  context: TopologyRowContext
): NodePropertyTableRow | undefined {
  if (context.source) return undefined;
  if (edge.targetId !== context.nodeId) return undefined;
  const cells: Record<string, string> = {
    direction: 'Input',
    node: context.nodeNameById.get(edge.sourceId) ?? edge.sourceId,
    nodeId: edge.sourceId,
    relation: edge.relation,
  };
  if (edge.relation === 'lineage') {
    if (context.inheritedConnection != null) cells.connection = context.inheritedConnection;
  }
  return { id: `input:${edge.id}`, cells };
}

function buildOutputTopologyRow(
  edge: CanonicalEdge,
  context: TopologyRowContext
): NodePropertyTableRow | undefined {
  if (edge.sourceId !== context.nodeId) return undefined;
  const downstreamName = context.nodeNameById.get(edge.targetId);
  if (context.source) {
    if (!downstreamName?.trim()) return undefined;
    if (edge.targetId === context.nodeId) return undefined;
  }
  return {
    id: `output:${edge.id}`,
    cells: {
      direction: 'Output',
      node: downstreamName ?? edge.targetId,
      nodeId: edge.targetId,
      relation: edge.relation,
    },
  };
}

function formatTopologyNames(names: readonly string[]): string {
  return names.length > 0 ? names.join(', ') : '0';
}
