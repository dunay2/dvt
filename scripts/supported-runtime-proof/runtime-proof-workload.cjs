'use strict';

const GRAPH_SHA = 'a'.repeat(64);
const SQL_SHA = 'b'.repeat(64);

function buildRuntimeProofDraftSaveRequest(profile) {
  const { scope } = profile;
  const { source, sink, connectionRef } = profile.workload;

  return {
    scope,
    schemaVersion: 'workspace-graph-draft.v1',
    expectedRevision: 'initial',
    idempotencyKey: `${profile.profileId}-draft`,
    draft: {
      canvas: { kind: 'transformation', title: 'Supported runtime proof' },
      nodeIds: ['source_1', 'transform_1', 'sink_1'],
      nodePositions: {
        source_1: { x: 0, y: 0 },
        transform_1: { x: 240, y: 0 },
        sink_1: { x: 480, y: 0 },
      },
      nodes: [
        buildDraftNode('source_1', 'Orders source', 'postgres_table', 'input', {
          ...source,
          connectionRef,
        }),
        {
          ...buildDraftNode('transform_1', 'Orders transform', 'sql_transform', 'transform'),
          path: 'models/runtime-proof-orders.sql',
          metadata: {
            dialect: 'postgres',
            sqlArtifact: buildArtifact('models/runtime-proof-orders.sql', SQL_SHA),
          },
        },
        buildDraftNode('sink_1', 'Orders snapshot', 'postgres_table', 'output', sink),
      ],
      edges: [
        {
          id: 'edge_source_transform',
          sourceId: 'source_1',
          targetId: 'transform_1',
          relation: 'lineage',
        },
        {
          id: 'edge_transform_sink',
          sourceId: 'transform_1',
          targetId: 'sink_1',
          relation: 'lineage',
        },
      ],
    },
  };
}

function buildRuntimeProofPreviewRequest(profile) {
  const { scope } = profile;
  const { source, sink, connectionRef } = profile.workload;
  const sqlPath = 'models/runtime-proof-orders.sql';

  return {
    context: {
      runId: `preview-${profile.profileId}`,
      ...scope,
      targetAdapter: 'temporal',
    },
    previewProfile: 'planner-generic-v1',
    selection: { mode: 'upstream', nodeIds: ['sink_1'] },
    graphSource: {
      kind: 'generic-graph-v1',
      sourceFamily: 'dvt-substrait',
      sourceVersion: 'substrait-v1',
      nodes: [
        {
          nodeId: 'source_1',
          stepKind: 'PREPARE_POSTGRES_TRANSFORM',
          dependsOn: [],
          stepTypeConfig: {
            connectionRef,
            targetSchema: sink.schema,
            sourceSchema: source.schema,
            sourceTable: source.table,
            sourceAlias: source.table,
          },
        },
        {
          nodeId: 'transform_1',
          stepKind: 'POSTGRES_SQL_TRANSFORM',
          dependsOn: ['source_1'],
          stepTypeConfig: {
            connectionRef,
            dialect: 'postgres',
            entrypoint: sqlPath,
            sql: `select * from ${source.schema}.${source.table}`,
            sqlArtifact: buildArtifact(sqlPath, SQL_SHA),
            sourceSchema: source.schema,
            sourceTable: source.table,
            sourceAlias: source.table,
            sinkSchema: sink.schema,
            sinkTable: sink.table,
            materialization: 'table',
            writeMode: 'replace',
          },
        },
        {
          nodeId: 'sink_1',
          stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          dependsOn: ['transform_1'],
          stepTypeConfig: {
            connectionRef,
            sinkSchema: sink.schema,
            sinkTable: sink.table,
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      ],
    },
    provenance: {
      kind: 'transformation-git-artifacts',
      graphArtifact: buildArtifact('graphs/supported-runtime-proof.json', GRAPH_SHA),
      sqlArtifact: buildArtifact(sqlPath, SQL_SHA),
    },
  };
}

function buildRuntimeProofStartRequest(profile, planRef) {
  return {
    ...profile.scope,
    planRef,
    targetAdapter: 'temporal',
    selection: { mode: 'upstream', nodeIds: ['sink_1'] },
  };
}

function buildDraftNode(id, name, kind, role, relation) {
  return {
    id,
    name,
    pluginId: 'dbt',
    kind,
    role,
    status: 'idle',
    tags: ['runtime-proof'],
    ...(relation === undefined ? {} : { metadata: relation }),
  };
}

function buildArtifact(path, contentSha256) {
  return {
    repo: 'dunay2/dvt',
    ref: 'refs/heads/main',
    path,
    commitSha: 'supported-runtime-proof',
    contentSha256,
  };
}

module.exports = {
  buildRuntimeProofDraftSaveRequest,
  buildRuntimeProofPreviewRequest,
  buildRuntimeProofStartRequest,
};
