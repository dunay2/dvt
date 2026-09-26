/** Owned concern: nodePropertyTopologyRows. */

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveInheritedDvtConnectionRef } from '../../views/canvas/canvasDvtAuthoringModel';
import type { NodePropertyRow, NodePropertyTableRow } from './nodePropertiesContracts';
import { addRow, formatWords } from './nodePropertyValues';
import { NODE_PROPERTY_ROW_ID } from './nodePropertiesContracts';

export type SourceRelationship = Readonly<{
  id: string;
  direction: 'input' | 'output';
  relatedNodeName: string;
  relation: string;
}>;

/** Adapt property rows without using translated direction labels as topology identity. */
export function readSourceRelationships(
  rows: readonly NodePropertyTableRow[]
): readonly SourceRelationship[] {
  return rows.flatMap((row): SourceRelationship[] => {
    const direction = row.id.startsWith('input:')
      ? 'input'
      : row.id.startsWith('output:')
        ? 'output'
        : null;
    const relatedNodeName = row.cells.node?.trim();
    if (direction == null || !relatedNodeName) return [];
    return [
      { id: row.id, direction, relatedNodeName, relation: row.cells.relation?.trim() || '—' },
    ];
  });
}

export function buildSummaryRows(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): NodePropertyRow[] {
  const rows: NodePropertyRow[] = [];
  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const upstreamNodes = edges
    .filter((edge) => edge.targetId === node.id)
    .map((edge) => nodeById.get(edge.sourceId)?.name ?? edge.sourceId);
  const downstreamNodes = edges
    .filter((edge) => edge.sourceId === node.id)
    .map((edge) => nodeById.get(edge.targetId)?.name ?? edge.targetId);

  addRow(rows, NODE_PROPERTY_ROW_ID.nodeId, 'Node ID', node.id);
  addRow(rows, NODE_PROPERTY_ROW_ID.kind, 'Kind', node.kind);
  addRow(rows, NODE_PROPERTY_ROW_ID.role, 'Role', formatWords(node.role));
  addRow(rows, NODE_PROPERTY_ROW_ID.status, 'Status', formatWords(node.status));
  addRow(rows, NODE_PROPERTY_ROW_ID.plugin, 'Plugin', node.pluginId);
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.upstreamNodes,
    'Upstream nodes',
    upstreamNodes.length > 0 ? upstreamNodes.join(', ') : '0'
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.downstreamNodes,
    'Downstream nodes',
    downstreamNodes.length > 0 ? downstreamNodes.join(', ') : '0'
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.tags,
    'Tags',
    node.tags.length > 0 ? node.tags.join(', ') : '0'
  );
  return rows;
}

export function buildInputsOutputsRows(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): readonly NodePropertyTableRow[] {
  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const rows: NodePropertyTableRow[] = [];
  const inheritedConnectionRef =
    node.pluginId === 'dvt' && node.kind === 'dvt:transform'
      ? resolveInheritedDvtConnectionRef({ node, nodes, edges })
      : undefined;
  const inheritedConnection =
    inheritedConnectionRef == null
      ? undefined
      : `${inheritedConnectionRef.provider} · ${inheritedConnectionRef.connectionId}`;
  let inheritedConnectionProjected = false;

  for (const edge of edges) {
    if (edge.targetId === node.id) {
      const upstreamNode = nodeById.get(edge.sourceId);
      const upstreamConnectionRef =
        upstreamNode == null || inheritedConnectionRef == null
          ? undefined
          : resolveInheritedDvtConnectionRef({ node: upstreamNode, nodes, edges });
      const projectsInheritedConnection: boolean =
        !inheritedConnectionProjected &&
        inheritedConnectionRef != null &&
        upstreamConnectionRef != null &&
        inheritedConnectionRef.provider === upstreamConnectionRef.provider &&
        inheritedConnectionRef.connectionId === upstreamConnectionRef.connectionId;
      inheritedConnectionProjected ||= projectsInheritedConnection;
      rows.push({
        id: `input:${edge.id}`,
        cells: {
          direction: 'Input',
          node: upstreamNode?.name ?? edge.sourceId,
          nodeId: edge.sourceId,
          relation: edge.relation,
          ...(projectsInheritedConnection && inheritedConnection != null
            ? { connection: inheritedConnection }
            : {}),
        },
      });
    }

    if (edge.sourceId === node.id) {
      const downstreamNode = nodeById.get(edge.targetId);
      rows.push({
        id: `output:${edge.id}`,
        cells: {
          direction: 'Output',
          node: downstreamNode?.name ?? edge.targetId,
          nodeId: edge.targetId,
          relation: edge.relation,
        },
      });
    }
  }

  return rows;
}
