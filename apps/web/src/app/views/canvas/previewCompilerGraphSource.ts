import {
  TRANSFORMATION_STEP_KIND,
  type GitArtifactRef,
  type TransformationSqlFirstCompilerGraphSourceV2,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveDvtSubstraitInnerJoinEntry } from './canvasDvtSubstraitJoinComposition';

import {
  buildPreviewMetadata,
  requireSinkPayload,
  requireSourcePayload,
  requireTransformPayload,
  resolveScopedTransformationNodes,
} from './previewGraphNodePayloads';

export type PreviewGraphSourceArgs = {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  sqlArtifact: GitArtifactRef;
  sqlText: string;
};

export function buildPreviewGraphSource(
  args: PreviewGraphSourceArgs
): TransformationSqlFirstCompilerGraphSourceV2 {
  const resolveDependencies = (targetNodeId: string): string[] =>
    args.scopedNodeIds.filter((sourceNodeId) =>
      args.edges.some((edge) => edge.sourceId === sourceNodeId && edge.targetId === targetNodeId)
    );
  const scopedNodes = resolveScopedTransformationNodes(args.nodes, args.scopedNodeIds);
  const scopedNodeIdSet = new Set(args.scopedNodeIds);
  const inputNodes = args.nodes.filter(
    (node) => scopedNodeIdSet.has(node.id) && node.role === 'input'
  );
  if (inputNodes.length < 1 || inputNodes.length > 2) {
    throw new Error('Preview graph source requires one or two scoped source nodes.');
  }
  const joinEntry =
    inputNodes.length === 2
      ? resolveDvtSubstraitInnerJoinEntry({
          targetNode: scopedNodes.transform,
          nodes: args.nodes.filter((node) => scopedNodeIdSet.has(node.id)),
          edges: args.edges.filter(
            (edge) => scopedNodeIdSet.has(edge.sourceId) && scopedNodeIdSet.has(edge.targetId)
          ),
          requirePersistedAuthority: true,
        })
      : null;
  if (inputNodes.length === 2 && joinEntry == null) {
    throw new Error('Preview graph source requires the admitted persisted Substrait INNER JOIN.');
  }
  const orderedSourceNodes = joinEntry
    ? [joinEntry.left.nodeId, joinEntry.right.nodeId].map((nodeId) => {
        const node = inputNodes.find((candidate) => candidate.id === nodeId);
        if (!node) throw new Error('Substrait INNER JOIN source is outside the Preview scope.');
        return node;
      })
    : inputNodes;
  const sourceBindings = orderedSourceNodes.map((node) => ({
    node,
    designSource: requireSourcePayload(node),
  }));
  const primarySource = sourceBindings[0];
  if (!primarySource) throw new Error('Preview graph source requires at least one source node.');
  const transform = requireTransformPayload(scopedNodes.transform, args.sqlArtifact);
  const sink = requireSinkPayload(scopedNodes.sink);

  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'transformation-design-graph',
    sourceVersion: 'transformation-sql-first-v2',
    nodes: [
      ...sourceBindings.map(({ node, designSource }) => ({
        nodeId: designSource.id,
        stepKind: TRANSFORMATION_STEP_KIND.preparePostgresTransform,
        dependsOn: resolveDependencies(designSource.id),
        stepTypeConfig: {
          connectionRef: designSource.payload.connectionRef,
          targetSchema: sink.payload.schema,
          sourceSchema: designSource.payload.schema,
          sourceTable: designSource.payload.table,
          sourceAlias: designSource.payload.alias,
        },
        metadata: buildPreviewMetadata(node),
      })),
      {
        nodeId: transform.id,
        stepKind: TRANSFORMATION_STEP_KIND.postgresSqlTransform,
        dependsOn: resolveDependencies(transform.id),
        stepTypeConfig: {
          connectionRef: primarySource.designSource.payload.connectionRef,
          dialect: 'postgres',
          entrypoint: transform.payload.entrypoint,
          sql: args.sqlText,
          sqlArtifact: transform.payload.sqlArtifact,
          sourceSchema: primarySource.designSource.payload.schema,
          sourceTable: primarySource.designSource.payload.table,
          sourceAlias: primarySource.designSource.payload.alias,
          sinkSchema: sink.payload.schema,
          sinkTable: sink.payload.table,
          materialization: sink.payload.materialization,
          writeMode: sink.payload.writeMode,
        },
        metadata: buildPreviewMetadata(scopedNodes.transform),
      },
      {
        nodeId: sink.id,
        stepKind: TRANSFORMATION_STEP_KIND.captureMaterializationEvidence,
        dependsOn: resolveDependencies(sink.id),
        stepTypeConfig: {
          connectionRef: primarySource.designSource.payload.connectionRef,
          sinkSchema: sink.payload.schema,
          sinkTable: sink.payload.table,
          materialization: sink.payload.materialization,
          writeMode: sink.payload.writeMode,
        },
        metadata: buildPreviewMetadata(scopedNodes.sink),
      },
    ],
  };
}
