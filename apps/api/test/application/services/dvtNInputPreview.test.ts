import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import {
  DVT_POSTGRES_INNER_JOIN_PROFILE_ID,
  DvtOperationalWorkloadContractV1,
  DvtOperationalWorkloadContractV2,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { DvtOperationalWorkloadProjector } from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import { DvtPostgresTargetProjectionPublisher } from '../../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import { buildDvtJoinPreviewDraft } from '../../fixtures/dvtJoinPreviewFixture.js';

function harness(inputCount: 2 | 3 = 3): {
  input: import('../../../src/application/services/dvtPostgresTargetProjectionPublisher.js').DvtPostgresTargetProjectionPublishInput;
  publisher: DvtPostgresTargetProjectionPublisher;
  publish: ReturnType<typeof vi.fn<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>>;
} {
  const draft = buildDvtJoinPreviewDraft(inputCount);
  const publish = vi.fn<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>(
    async (request) => ({ ...request, disposition: 'created' })
  );
  const publisher = new DvtPostgresTargetProjectionPublisher({
    artifactStore: { publish },
    locateArtifact: ({ sha256 }) => `s3://artifacts/tenants/tenant-a/${sha256}`,
  });
  const input = {
    scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    draft,
    selectedNodeIds: draft.nodeIds,
    selectedEdgeIds: draft.edges.map((edge) => edge.id),
  };
  return { input, publisher, publish };
}

describe('N-input protected Preview lowering', () => {
  it.each([2, 3] as const)(
    'preserves all %i sources in one SQL artifact and one workload',
    async (count) => {
      const { input, publisher, publish } = harness(count);
      const before = JSON.stringify(input.draft);
      const binding = await publisher.publish(input);
      const result = new DvtOperationalWorkloadProjector().project({
        ...input,
        draftRevision: 'revision-1',
        canvasId: input.draft.canvas.id!,
        targetProjection: binding,
      });
      if (!result.ok) throw new Error(result.reason);
      expect(result.graphSource.nodes).toHaveLength(1);
      expect(result.graphSource.nodes[0]?.dependsOn).toEqual([]);
      const workload = DvtOperationalWorkloadContractV1.schema.parse(
        result.graphSource.nodes[0]?.stepTypeConfig
      );
      expect(workload.graph.selectedNodeIds).toEqual([...input.selectedNodeIds].sort());
      expect(workload.graph.selectedEdgeIds).toEqual([...input.selectedEdgeIds].sort());
      expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_INNER_JOIN_PROFILE_ID);
      expect(workload.semantics).toHaveLength(1);
      expect(workload.output).toEqual({ kind: 'ephemeral-preview', nodeId: 'transform-orders' });
      expect(publish).toHaveBeenCalledOnce();
      const sql = Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8');
      expect(sql.match(/JOIN/g)).toHaveLength(count - 1);
      expect(sql).toContain('left_source.client_id = right_source.client_id');
      if (count === 3) {
        expect(sql).toContain('left_source.order_id = join_source_3.order_id');
        expect(sql).toContain('join_source_3.product AS product');
        expect(sql).not.toContain('join_source_3.order_id AS');
      }
      expect(JSON.stringify(input.draft)).toBe(before);
    }
  );

  it('preserves a three-source JOIN as one Run workload', async () => {
    const { input, publisher } = harness(3);
    const draft = {
      ...input.draft,
      nodes: input.draft.nodes.map((node) =>
        node.id === 'transform-orders'
          ? {
              ...node,
              metadata: {
                ...node.metadata,
                config: {
                  materialized: 'table',
                  resultTarget: {
                    schemaVersion: 'dvt-transform-result-target.v1',
                    connectionRef: {
                      schemaVersion: 'connection-ref.v1',
                      provider: 'postgres',
                      connectionId: 'local-postgres-proof',
                    },
                    schema: 'analytics',
                    relation: 'joined_orders',
                  },
                },
              },
            }
          : node
      ),
    };
    const binding = await publisher.publish({ ...input, draft });
    const result = new DvtOperationalWorkloadProjector().project({
      ...input,
      draft,
      draftRevision: 'revision-1',
      canvasId: draft.canvas.id!,
      targetProjection: binding,
    });

    if (!result.ok) throw new Error(result.reason);
    expect(result.graphSource.nodes).toHaveLength(1);
    const workload = DvtOperationalWorkloadContractV2.schema.parse(
      result.graphSource.nodes[0]?.stepTypeConfig
    );
    expect(workload.executionIntent).toBe('run');
    expect(workload.graph.selectedNodeIds).toEqual([...draft.nodeIds].sort());
    expect(workload.output).toMatchObject({
      disposition: 'table',
      target: { schema: 'analytics', relation: 'joined_orders' },
    });
    expect(workload.publicationBoundaries).toEqual([]);
  });

  it.each([
    'missing input',
    'duplicate input',
    'missing edge',
    'closed edge',
    'mixed connection',
    'stale semantic hash',
    'changed physical binding',
  ])('rejects %s before publishing any SQL', async (scenario) => {
    const { input, publisher, publish } = harness();
    const candidate = { ...globalThis.structuredClone(input) };
    if (scenario === 'missing input')
      candidate.selectedNodeIds = candidate.selectedNodeIds.slice(1);
    if (scenario === 'duplicate input')
      candidate.selectedNodeIds = [...candidate.selectedNodeIds, candidate.selectedNodeIds[0]!];
    if (scenario === 'missing edge') candidate.selectedEdgeIds = candidate.selectedEdgeIds.slice(1);
    if (scenario === 'closed edge')
      candidate.draft.edges[1]!.metadata = { executionGate: 'closed' };
    if (scenario === 'changed physical binding')
      candidate.draft.nodes[1]!.metadata!['tableName'] = 'another_table';
    if (scenario === 'mixed connection') {
      const ref = candidate.draft.nodes[1]!.metadata!['connectedSourceRef'] as {
        connectionRef: { connectionId: string };
      };
      ref.connectionRef.connectionId = 'another-connection';
    }
    if (scenario === 'stale semantic hash') {
      const authority = candidate.draft.nodes.at(-1)!.metadata!['transformAuthoring'] as {
        semanticDocument: { semanticPlan: { sha256: string } };
      };
      authority.semanticDocument.semanticPlan.sha256 = 'a'.repeat(64);
    }
    await expect(publisher.publish(candidate)).rejects.toThrow();
    expect(publish).not.toHaveBeenCalled();
  });
});
