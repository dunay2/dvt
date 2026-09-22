import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import {
  createDvtPostgresOutputSchemaDigestV1,
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DvtOperationalWorkloadContractV1,
  DvtOperationalWorkloadContractV2,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { DvtOperationalWorkloadProjector } from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import { DvtPostgresTargetProjectionPublisher } from '../../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import {
  buildDvtCrossPreviewDraft,
  buildDvtJoinPreviewDraft,
} from '../../fixtures/dvtJoinPreviewFixture.js';

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

type ExtendedJoinFixtureType = 'left' | 'right' | 'outer';
type SemiAntiJoinFixtureType = 'left_semi' | 'left_anti' | 'right_semi' | 'right_anti';

function joinHarness(finalJoinType: ExtendedJoinFixtureType): ReturnType<typeof harness> {
  const result = harness(3);
  const draft = buildDvtJoinPreviewDraft(3, finalJoinType);
  return {
    ...result,
    input: {
      ...result.input,
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
    },
  };
}

function semiAntiHarness(finalJoinType: SemiAntiJoinFixtureType): ReturnType<typeof harness> {
  const result = harness(2);
  const draft = buildDvtJoinPreviewDraft(2, finalJoinType);
  return {
    ...result,
    input: {
      ...result.input,
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
    },
  };
}

describe('N-input protected Preview lowering', () => {
  it.each([2, 3] as const)(
    'projects an explicit %i-input CrossRel through Preview without a predicate',
    async (count) => {
      const result = harness(count);
      const draft = buildDvtCrossPreviewDraft(count);
      const input = {
        ...result.input,
        draft,
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: draft.edges.map((edge) => edge.id),
      };

      const binding = await result.publisher.publish(input);
      const sql = Buffer.from(result.publish.mock.calls[0]![0].bytes).toString('utf8');

      expect(binding.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
      expect(sql.match(/CROSS JOIN/g)).toHaveLength(count - 1);
      expect(sql).not.toContain(' ON ');
    }
  );

  it.each([
    ['left_semi', 'EXISTS', ['order_id', 'client_id']],
    ['left_anti', 'NOT (EXISTS', ['order_id', 'client_id']],
    ['right_semi', 'EXISTS', ['client_id', 'country']],
    ['right_anti', 'NOT (EXISTS', ['client_id', 'country']],
  ] as const)(
    'projects %s through Preview with retained-side output and correlated %s',
    async (finalJoinType, quantifier, outputNames) => {
      const { input, publisher, publish } = semiAntiHarness(finalJoinType);

      const binding = await publisher.publish(input);
      const sql = Buffer.from(publish.mock.calls[0]![0].bytes)
        .toString('utf8')
        .replaceAll(/\s+/g, ' ');

      expect(binding.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
      expect(binding.schemaDigestSha256).toBe(
        createDvtPostgresOutputSchemaDigestV1({
          schemaVersion: 'dvt-postgres-output-schema.v1',
          columns: outputNames.map((name, ordinal) => ({
            ordinal,
            name,
            postgresType: 'text',
            nullable: true,
            defaultExpression: null,
            generatedExpression: null,
            collation: null,
          })),
          constraints: [],
          indexes: [],
        })
      );
      expect(sql).toContain(quantifier);
      expect(sql).not.toContain('DISTINCT');
      expect(sql).not.toContain(' NOT IN ');
    }
  );

  it.each([
    ['left', 'LEFT JOIN'],
    ['right', 'RIGHT JOIN'],
    ['outer', 'FULL JOIN'],
  ] as const)(
    'projects a mixed INNER to %s tree through Preview with the JOIN-family profile',
    async (finalJoinType, sqlJoin) => {
      const { input, publisher, publish } = joinHarness(finalJoinType);

      const binding = await publisher.publish(input);
      const sql = Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8');

      expect(binding.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
      expect(binding.schemaDigestSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(sql.match(/JOIN/g)).toHaveLength(2);
      expect(sql).toContain(
        `${sqlJoin} raw.order_details AS join_source_3 ON left_source.order_id = join_source_3.order_id`
      );
    }
  );

  it.each(['left_semi', 'left_anti', 'right_semi', 'right_anti'] as const)(
    'preserves %s as one Run workload with both lineage dependencies',
    async (finalJoinType) => {
      const { input, publisher, publish } = semiAntiHarness(finalJoinType);
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
                      relation: 'matched_orders',
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
      const workload = DvtOperationalWorkloadContractV2.schema.parse(
        result.graphSource.nodes[0]?.stepTypeConfig
      );
      expect(workload.executionIntent).toBe('run');
      expect(workload.graph.selectedNodeIds).toEqual([...draft.nodeIds].sort());
      expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
      expect(Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8')).toContain('EXISTS');
    }
  );

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
      expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
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

  it.each([
    ['left', 'LEFT JOIN'],
    ['right', 'RIGHT JOIN'],
    ['outer', 'FULL JOIN'],
  ] as const)(
    'preserves a mixed INNER to %s tree as one Run workload',
    async (finalJoinType, sqlJoin) => {
      const { input, publisher, publish } = joinHarness(finalJoinType);
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
      expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
      expect(workload.graph.selectedNodeIds).toEqual([...draft.nodeIds].sort());
      expect(workload.output).toMatchObject({
        disposition: 'table',
        target: { schema: 'analytics', relation: 'joined_orders' },
      });
      expect(workload.publicationBoundaries).toEqual([]);
      expect(Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8')).toContain(
        `${sqlJoin} raw.order_details AS join_source_3 ON left_source.order_id = join_source_3.order_id`
      );
    }
  );

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
