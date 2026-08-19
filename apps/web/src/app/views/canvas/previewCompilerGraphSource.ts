import {
  TRANSFORMATION_STEP_KIND,
  type GitArtifactRef,
  type TransformationSqlFirstCompilerGraphSourceV2,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

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
  const source = requireSourcePayload(scopedNodes.source);
  const transform = requireTransformPayload(scopedNodes.transform, args.sqlArtifact);
  const sink = requireSinkPayload(scopedNodes.sink);

  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'transformation-design-graph',
    sourceVersion: 'transformation-sql-first-v2',
    nodes: [
      {
        nodeId: source.id,
        stepKind: TRANSFORMATION_STEP_KIND.preparePostgresTransform,
        dependsOn: resolveDependencies(source.id),
        stepTypeConfig: {
          connectionRef: source.payload.connectionRef,
          targetSchema: sink.payload.schema,
          sourceSchema: source.payload.schema,
          sourceTable: source.payload.table,
          sourceAlias: source.payload.alias,
        },
        metadata: buildPreviewMetadata(scopedNodes.source),
      },
      {
        nodeId: transform.id,
        stepKind: TRANSFORMATION_STEP_KIND.postgresSqlTransform,
        dependsOn: resolveDependencies(transform.id),
        stepTypeConfig: {
          connectionRef: source.payload.connectionRef,
          dialect: 'postgres',
          entrypoint: transform.payload.entrypoint,
          sql: args.sqlText,
          sqlArtifact: transform.payload.sqlArtifact,
          sourceSchema: source.payload.schema,
          sourceTable: source.payload.table,
          sourceAlias: source.payload.alias,
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
          connectionRef: source.payload.connectionRef,
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
