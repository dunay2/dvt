/**
 * @baseline ADR-0064 / ADR-0066: semantic results and publication have distinct identities.
 * @decision Admit exactly one explicit Sink for a transient Transform result.
 * @consequence Invalid combinations cannot become executable publication intent.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';

import {
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DvtOperationalWorkloadContractV1,
  type DvtOperationalRunWorkloadV1,
} from '../src/index.js';

function sinkWorkload(): DvtOperationalRunWorkloadV1 {
  const connectionRef: DvtOperationalRunWorkloadV1['connectionRef'] = {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-a',
    provider: 'postgres',
  };
  return {
    schemaVersion: 'dvt-operational-workload.v1',
    executionIntent: 'run',
    scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    graph: {
      draftRevision: 'revision-a',
      canvasId: 'canvas-a',
      selectedNodeIds: ['source-a', 'transform-a', 'sink-a'],
      selectedEdgeIds: ['source-transform', 'transform-sink'],
    },
    semantics: [
      {
        transformNodeId: 'transform-a',
        semanticPlanSha256: 'a'.repeat(64),
        profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
      },
    ],
    connectionRef,
    targetProjection: {
      profileId: DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
      toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
      semanticPlanSha256: 'a'.repeat(64),
      schemaDigestSha256: 'c'.repeat(64),
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: 'b'.repeat(64),
        storageUri: 's3://artifacts/compiled.sql',
        sizeBytes: 10,
        encoding: 'utf-8',
      },
    },
    output: { kind: 'transform-result', nodeId: 'transform-a', disposition: 'ephemeral' },
    publicationBoundaries: [
      {
        kind: 'sink',
        nodeId: 'sink-a',
        inputNodeId: 'transform-a',
        target: { connectionRef, schema: 'analytics', relation: 'orders' },
        publicationPolicy: 'postgres-stable-table-publication.v1',
      },
    ],
  };
}

describe('one explicit Sink publication', () => {
  it('binds a transient result and a distinct publication to the selected graph', () => {
    const candidate = sinkWorkload();
    expect(DvtOperationalWorkloadContractV1.schema.parse(candidate)).toEqual(candidate);
  });

  it.each([
    [
      'no publication',
      (value: ReturnType<typeof sinkWorkload>) => {
        value.publicationBoundaries = [];
      },
    ],
    [
      'multiple publications',
      (value: ReturnType<typeof sinkWorkload>) => {
        value.publicationBoundaries.push({ ...value.publicationBoundaries[0]!, nodeId: 'sink-b' });
      },
    ],
    [
      'wrong input',
      (value: ReturnType<typeof sinkWorkload>) => {
        value.publicationBoundaries[0]!.inputNodeId = 'source-a';
      },
    ],
    [
      'Transform as Sink',
      (value: ReturnType<typeof sinkWorkload>) => {
        value.publicationBoundaries[0]!.nodeId = 'transform-a';
      },
    ],
    [
      'unselected Sink',
      (value: ReturnType<typeof sinkWorkload>) => {
        value.publicationBoundaries[0]!.nodeId = 'sink-other';
      },
    ],
    [
      'foreign connection',
      (value: ReturnType<typeof sinkWorkload>) => {
        value.publicationBoundaries[0]!.target.connectionRef = {
          ...value.connectionRef,
          connectionId: 'other',
        };
      },
    ],
    [
      'missing edge',
      (value: ReturnType<typeof sinkWorkload>) => {
        value.graph.selectedEdgeIds.pop();
      },
    ],
    [
      'extra node',
      (value: ReturnType<typeof sinkWorkload>) => {
        value.graph.selectedNodeIds.push('ignored');
      },
    ],
    [
      'double publication',
      (value: ReturnType<typeof sinkWorkload>) => {
        Object.assign(value.output, {
          disposition: 'table',
          target: {
            schemaVersion: 'dvt-transform-result-target.v1',
            ...value.publicationBoundaries[0]!.target,
          },
          publicationPolicy: 'postgres-stable-table-publication.v1',
        });
      },
    ],
    [
      'target on transient result',
      (value: ReturnType<typeof sinkWorkload>) => {
        Object.assign(value.output, { target: value.publicationBoundaries[0]!.target });
      },
    ],
    [
      'preview with publication',
      (value: ReturnType<typeof sinkWorkload>) => {
        Object.assign(value, { executionIntent: 'preview' });
      },
    ],
  ])('rejects %s', (_label, mutate) => {
    const candidate = sinkWorkload();
    mutate(candidate);
    expect(DvtOperationalWorkloadContractV1.schema.safeParse(candidate).success).toBe(false);
  });
});
