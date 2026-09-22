import { DvtOperationalWorkloadContractV2 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { DvtOperationalWorkloadProjector } from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import { repeatedSourceInput } from '../../fixtures/dvtRepeatedSourceFixture.js';
import { publisherHarness } from '../../fixtures/dvtRepeatedSourcePublisher.js';

describe('repeated source Run workload', () => {
  it('lowers configured Run to one workload with one physical dependency, rejecting stale projection', async () => {
    const input = repeatedSourceInput();
    input.draft.nodes[1]!.metadata!.config = {
      materialized: 'table',
      resultTarget: {
        schemaVersion: 'dvt-transform-result-target.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'local-postgres-proof',
        },
        schema: 'analytics',
        relation: 'related_records',
      },
    };
    const { publisher } = publisherHarness();
    const targetProjection = await publisher.publish(input);
    const projector = new DvtOperationalWorkloadProjector();
    const request = {
      ...input,
      targetProjection,
      draftRevision: 'revision-read-uses',
      canvasId: input.draft.canvas.id!,
    };
    const result = projector.project(request);
    if (!result.ok) throw new Error(result.reason);
    expect(result.graphSource.nodes).toHaveLength(1);
    const workload = DvtOperationalWorkloadContractV2.schema.parse(
      result.graphSource.nodes[0]!.stepTypeConfig
    );
    expect(workload.graph.selectedNodeIds).toEqual([...input.draft.nodeIds].sort());
    expect(workload.graph.selectedEdgeIds).toEqual(input.selectedEdgeIds);
    expect(workload.executionIntent).toBe('run');
    expect(
      projector.project({
        ...request,
        targetProjection: { ...targetProjection, semanticPlanSha256: 'a'.repeat(64) },
      })
    ).toMatchObject({
      ok: false,
      reason: 'Target projection is stale or belongs to another output or connection.',
    });
  });
});
