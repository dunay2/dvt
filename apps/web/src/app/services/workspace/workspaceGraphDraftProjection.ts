import type {
  DesignGraphDraft,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
} from '@dvt/contracts';

import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export type WorkspaceGraphDraftSemanticGraph = {
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
};

function createDraftEdgeId(fromNodeId: string, toNodeId: string): string {
  return `draft_edge_${fromNodeId}_${toNodeId}`;
}

function projectDesignGraphNodeToCanonical(
  node: DesignGraphDraft['nodes'][number]
): CanonicalNode {
  switch (node.type) {
    case 'source':
      return {
        id: node.id,
        name: node.payload.alias,
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
        metadata: {
          config: {
            schema: node.payload.schema,
            table: node.payload.table,
            alias: node.payload.alias,
          },
        },
      };
    case 'sql_transform': {
      const entrypointSegments = node.payload.entrypoint.split('/');
      const entrypoint = entrypointSegments.at(-1) ?? node.payload.entrypoint;
      const transformName = entrypoint.replace(/\.[^.]+$/, '') || node.id;

      return {
        id: node.id,
        name: transformName,
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        path: node.payload.entrypoint,
        metadata: {
          config: {
            dialect: node.payload.dialect,
          },
        },
      };
    }
    case 'sink':
      return {
        id: node.id,
        name: node.payload.table,
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output',
        status: 'idle',
        tags: [],
        metadata: {
          config: {
            schema: node.payload.schema,
            table: node.payload.table,
            materialization: node.payload.materialization,
            writeMode: node.payload.writeMode,
          },
        },
      };
  }
}

export function projectDesignGraphDraft(
  draft: Pick<DesignGraphDraft, 'nodes' | 'edges'>
): WorkspaceGraphDraft {
  return {
    nodeIds: draft.nodes.map((node) => node.id),
    // The protected draft boundary owns structural graph state, not visual canvas layout.
    nodePositions: {},
    edges: draft.edges.map((edge) => ({
      sourceId: edge.fromNodeId,
      targetId: edge.toNodeId,
    })),
  };
}

export function projectDesignGraphDraftSemanticGraph(
  draft: Pick<DesignGraphDraft, 'nodes' | 'edges'>
): WorkspaceGraphDraftSemanticGraph {
  return {
    canonicalNodes: draft.nodes.map((node) => projectDesignGraphNodeToCanonical(node)),
    canonicalEdges: draft.edges.map((edge) => ({
      id: createDraftEdgeId(edge.fromNodeId, edge.toNodeId),
      sourceId: edge.fromNodeId,
      targetId: edge.toNodeId,
      relation: 'lineage',
    })),
  };
}

export function projectProtectedWorkspaceGraphDraftRecord(
  record: ProtectedWorkspaceGraphDraftRecord
): WorkspaceGraphDraftRecord {
  return {
    revision: record.revision,
    savedAt: record.updatedAt,
    draft: projectDesignGraphDraft(record.draft),
  };
}
