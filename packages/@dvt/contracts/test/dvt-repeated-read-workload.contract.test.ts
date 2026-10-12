import { describe, expect, it } from 'vitest';

import {
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DvtOperationalWorkloadContractV1,
  type DvtOperationalWorkloadV1,
} from '../src/index.js';

function buildRepeatedReadWorkload(intent: 'preview' | 'run'): DvtOperationalWorkloadV1 {
  const connectionRef = {
    schemaVersion: 'connection-ref.v1',
    provider: 'postgres',
    connectionId: 'warehouse',
  } as const;
  const target = {
    schemaVersion: 'dvt-transform-result-target.v1',
    connectionRef,
    schema: 'analytics',
    relation: 'records',
  };
  const shared: Omit<DvtOperationalWorkloadV1, 'schemaVersion' | 'output' | 'executionIntent'> = {
    scope: { tenantId: 'tenant', projectId: 'project', environmentId: 'environment' },
    graph: {
      draftRevision: 'revision',
      canvasId: 'canvas',
      selectedNodeIds: ['source', 'model'],
      selectedEdgeIds: ['source-model'],
    },
    semantics: [
      {
        transformNodeId: 'model',
        semanticPlanSha256: 'a'.repeat(64),
        profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
      },
    ],
    targetProjection: {
      profileId: DVT_POSTGRES_JOIN_PROFILE_ID,
      toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
      semanticPlanSha256: 'a'.repeat(64),
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: 'b'.repeat(64),
        storageUri: 's3://test/sql',
        sizeBytes: 100,
        encoding: 'utf-8',
      },
    },
    connectionRef,
  };
  return intent === 'run'
    ? {
        ...shared,
        schemaVersion: 'dvt-operational-workload.v1',
        targetProjection: { ...shared.targetProjection, schemaDigestSha256: 'c'.repeat(64) },
        executionIntent: 'run',
        publicationBoundaries: [],
        output: {
          kind: 'transform-result',
          nodeId: 'model',
          disposition: 'table',
          target: { ...target, schemaVersion: 'dvt-transform-result-target.v1' },
          publicationPolicy: 'postgres-stable-table-publication.v1',
        },
      }
    : {
        ...shared,
        schemaVersion: 'dvt-operational-workload.v1',
        output: { kind: 'ephemeral-preview', nodeId: 'model' },
        executionIntent: 'preview',
      };
}

describe.each(['preview', 'run'] as const)('repeated Read workload %s', (intent) => {
  it('admits one physical dependency without changing wire shape or logical profile', () => {
    const workload = buildRepeatedReadWorkload(intent);
    expect(DvtOperationalWorkloadContractV1.schema.parse(workload)).toEqual(workload);
  });

  it.each(['missing source', 'missing edge', 'duplicate source', 'duplicate edge', 'stale hash'])(
    'rejects %s even when repeated Reads are allowed',
    (corruption) => {
      const workload = buildRepeatedReadWorkload(intent);
      if (corruption === 'missing source') workload.graph.selectedNodeIds = ['model'];
      if (corruption === 'missing edge') workload.graph.selectedEdgeIds = [];
      if (corruption === 'duplicate source')
        workload.graph.selectedNodeIds = ['source', 'source', 'model'];
      if (corruption === 'duplicate edge') workload.graph.selectedEdgeIds.push('source-model');
      if (corruption === 'stale hash')
        workload.targetProjection.semanticPlanSha256 = 'd'.repeat(64);
      expect(DvtOperationalWorkloadContractV1.schema.safeParse(workload).success).toBe(false);
    }
  );
});
