import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import {
  DVT_POSTGRES_SET_PROFILE_ID,
  DvtOperationalWorkloadContractV1,
  DvtOperationalWorkloadContractV2,
} from '@dvt/contracts';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { DvtOperationalWorkloadProjector } from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import {
  DvtPostgresTargetProjectionPublisher,
  type DvtPostgresTargetProjectionPublishInput,
} from '../../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import { buildDvtSetPreviewDraft } from '../../fixtures/dvtSetPreviewFixture.js';

function harness(wrapper?: 'aggregate' | 'window'): Readonly<{
  input: DvtPostgresTargetProjectionPublishInput;
  publisher: DvtPostgresTargetProjectionPublisher;
  publish: Mock<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>;
}> {
  const draft = buildDvtSetPreviewDraft(wrapper);
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

describe('protected UNION DISTINCT lowering', () => {
  it('publishes one ordered PostgreSQL UNION artifact and one Preview workload', async () => {
    const { input, publisher, publish } = harness();
    const binding = await publisher.publish(input);
    const result = new DvtOperationalWorkloadProjector().project({
      ...input,
      draftRevision: 'revision-set-1',
      canvasId: input.draft.canvas.id!,
      targetProjection: binding,
    });

    if (!result.ok) throw new Error(result.reason);
    const workload = DvtOperationalWorkloadContractV1.schema.parse(
      result.graphSource.nodes[0]?.stepTypeConfig
    );
    const sql = Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8');
    expect(binding.profileId).toBe(DVT_POSTGRES_SET_PROFILE_ID);
    expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_SET_PROFILE_ID);
    expect(workload.graph.selectedNodeIds).toEqual([...input.selectedNodeIds].sort());
    expect(result.graphSource.nodes).toHaveLength(1);
    expect(sql.match(/UNION/g)).toHaveLength(2);
    expect(sql).not.toMatch(/UNION\s+ALL/);
    expect(sql.indexOf('customers_north')).toBeLessThan(sql.indexOf('customers_south'));
    expect(sql.indexOf('customers_south')).toBeLessThan(sql.indexOf('customers_west'));
  });

  it('preserves the same Set profile as one Run workload', async () => {
    const { input, publisher, publish } = harness();
    const draft = {
      ...input.draft,
      nodes: input.draft.nodes.map((node) =>
        node.id === 'transform-customers'
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
                      connectionId: 'warehouse-main',
                    },
                    schema: 'analytics',
                    relation: 'distinct_customers',
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
      draftRevision: 'revision-set-2',
      canvasId: draft.canvas.id!,
      targetProjection: binding,
    });

    if (!result.ok) throw new Error(result.reason);
    const workload = DvtOperationalWorkloadContractV2.schema.parse(
      result.graphSource.nodes[0]?.stepTypeConfig
    );
    expect(workload.executionIntent).toBe('run');
    expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_SET_PROFILE_ID);
    expect(workload.output).toMatchObject({
      disposition: 'table',
      target: { schema: 'analytics', relation: 'distinct_customers' },
    });
    expect(Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8')).not.toMatch(
      /UNION\s+ALL/
    );
  });

  it.each([
    ['aggregate', /GROUP BY\s+customer_id/],
    ['window', /row_number\(\) OVER/],
  ] as const)(
    'publishes a Preview workload for the admitted %s wrapper',
    async (wrapper, sqlPattern) => {
      const { input, publisher, publish } = harness(wrapper);

      const binding = await publisher.publish(input);
      const result = new DvtOperationalWorkloadProjector().project({
        ...input,
        draftRevision: `revision-set-${wrapper}-preview`,
        canvasId: input.draft.canvas.id!,
        targetProjection: binding,
      });

      if (!result.ok) throw new Error(result.reason);
      expect(binding.profileId).toBe(DVT_POSTGRES_SET_PROFILE_ID);
      expect(Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8')).toMatch(sqlPattern);
    }
  );

  it.each(['aggregate', 'window'] as const)(
    'publishes a Run workload for the admitted %s wrapper',
    async (wrapper) => {
      const { input, publisher, publish } = harness(wrapper);
      const draft = {
        ...input.draft,
        nodes: input.draft.nodes.map((node) =>
          node.id === 'transform-customers'
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
                        connectionId: 'warehouse-main',
                      },
                      schema: 'analytics',
                      relation: `${wrapper}_customers`,
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
        draftRevision: `revision-set-${wrapper}-run`,
        canvasId: draft.canvas.id!,
        targetProjection: binding,
      });

      if (!result.ok) throw new Error(result.reason);
      const workload = DvtOperationalWorkloadContractV2.schema.parse(
        result.graphSource.nodes[0]?.stepTypeConfig
      );
      expect(workload.executionIntent).toBe('run');
      expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_SET_PROFILE_ID);
      expect(Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8')).toMatch(
        wrapper === 'aggregate' ? /GROUP BY\s+customer_id/ : /row_number\(\) OVER/
      );
    }
  );

  it.each(['missing input', 'mismatched physical table', 'stale semantic hash'])(
    'rejects %s before publishing SQL',
    async (scenario) => {
      const { input, publisher, publish } = harness();
      let candidate = globalThis.structuredClone(input);
      if (scenario === 'missing input') {
        candidate = {
          ...candidate,
          selectedNodeIds: candidate.selectedNodeIds.slice(1),
          selectedEdgeIds: candidate.selectedEdgeIds.slice(1),
        };
      }
      if (scenario === 'mismatched physical table') {
        candidate.draft.nodes[0]!.metadata!['tableName'] = 'other_table';
      }
      if (scenario === 'stale semantic hash') {
        const authority = candidate.draft.nodes.at(-1)!.metadata!['transformAuthoring'] as {
          semanticDocument: { semanticPlan: { sha256: string } };
        };
        authority.semanticDocument.semanticPlan.sha256 = 'a'.repeat(64);
      }

      await expect(publisher.publish(candidate)).rejects.toThrow();
      expect(publish).not.toHaveBeenCalled();
    }
  );
});
