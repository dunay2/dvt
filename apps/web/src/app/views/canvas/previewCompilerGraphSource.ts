import {
  TRANSFORMATION_STEP_KIND,
  type GitArtifactRef,
  type TransformationSqlFirstCompilerGraphSourceV1,
} from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';

import {
  buildPreviewMetadata,
  requireSinkPayload,
  requireSourcePayload,
  requireTransformPayload,
  resolveScopedTransformationNodes,
} from './previewGraphNodePayloads';

export type PreviewGraphSourceArgs = {
  nodes: readonly CanonicalNode[];
  scopedNodeIds: readonly string[];
  sqlArtifact: GitArtifactRef;
  sqlText: string;
};

export function buildPreviewGraphSource(
  args: PreviewGraphSourceArgs
): TransformationSqlFirstCompilerGraphSourceV1 {
  const scopedNodes = resolveScopedTransformationNodes(args.nodes, args.scopedNodeIds);
  const source = requireSourcePayload(scopedNodes.source);
  const transform = requireTransformPayload(scopedNodes.transform, args.sqlArtifact);
  const sink = requireSinkPayload(scopedNodes.sink);

  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'transformation-design-graph',
    sourceVersion: 'transformation-sql-first-v1',
    nodes: [
      {
        nodeId: source.id,
        stepKind: TRANSFORMATION_STEP_KIND.preparePostgresTransform,
        dependsOn: [],
        stepTypeConfig: {
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
        dependsOn: [source.id],
        stepTypeConfig: {
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
        dependsOn: [transform.id],
        stepTypeConfig: {
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
