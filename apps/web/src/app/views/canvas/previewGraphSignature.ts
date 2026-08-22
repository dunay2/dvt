import { type ConnectionRef } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import { resolvePreviewStepKind } from '../../plugins/nodeTypeRegistry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveEffectiveDvtConnectionRef } from './canvasDvtAuthoringModel';

export function buildPreviewGraphSignature(
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[],
  scopedNodeIds: readonly string[]
): string {
  return jcsCanonicalize(buildPreviewSignatureGraphSource(nodes, edges, scopedNodeIds));
}

function buildPreviewSignatureGraphSource(
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[],
  scopedNodeIds: readonly string[]
): {
  kind: 'generic-graph-v1';
  sourceFamily: 'transformation-design-graph';
  sourceVersion: 'transformation-sql-first-v2';
  nodes: Array<{
    nodeId: string;
    stepKind: string;
    dependsOn: string[];
    connectionRef?: ConnectionRef;
    metadata: {
      displayName: string;
      sourceRef?: string;
      tags: {
        pluginId: string;
        role: string;
        kind: string;
      };
    };
  }>;
} {
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
    sourceVersion: 'transformation-sql-first-v2',
    nodes: scopedNodes.map((node) => ({
      nodeId: node.id,
      stepKind: resolvePreviewStepKind(node.kind, node.role),
      dependsOn: [...(dependsOnByNodeId.get(node.id) ?? [])].sort((left, right) =>
        left.localeCompare(right)
      ),
      ...(node.kind === 'dvt:source'
        ? { connectionRef: resolveEffectiveDvtConnectionRef(node) }
        : {}),
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
