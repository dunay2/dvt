import {
  createDvtPostgresOutputSchemaDigestV1,
  DVT_POSTGRES_JOIN_PROFILE_ID,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  buildDvtCrossPreviewDraft,
  buildDvtJoinPreviewDraft,
} from '../../fixtures/dvtJoinPreviewFixture.js';
import { publicationHarness } from '../../fixtures/dvtProjectionPublicationHarness.js';

describe.each([false, true])('Multi-input publication (run=%s)', (run) => {
  it.each([
    ['inner', 2],
    ['inner', 3],
    ['cross', 2],
    ['cross', 3],
    ['left', 3],
    ['right', 3],
    ['outer', 3],
    ['left_semi', 2],
    ['left_anti', 2],
    ['right_semi', 2],
    ['right_anti', 2],
  ] as const)('preserves all dependencies for %s with %s inputs', async (kind, count) => {
    const draft =
      kind === 'cross' ? buildDvtCrossPreviewDraft(count) : buildDvtJoinPreviewDraft(count, kind);
    const harness = publicationHarness(draft, run);
    const before = globalThis.structuredClone(harness.input.draft);
    const { binding, graph, workload } = await harness.execute();
    expect(harness.publish).toHaveBeenCalledOnce();
    expect(binding.artifact.sha256).toBe(sha256Hex(harness.publish.mock.calls[0]![0].bytes));
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]?.dependsOn).toEqual([]);
    expect(workload.graph.selectedNodeIds).toEqual([...harness.input.selectedNodeIds].sort());
    expect(workload.graph.selectedEdgeIds).toEqual([...harness.input.selectedEdgeIds].sort());
    expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
    expect(workload.semantics).toHaveLength(1);
    expect(workload.output).toMatchObject(
      run
        ? { disposition: 'table', target: { schema: 'analytics', relation: 'result' } }
        : { kind: 'ephemeral-preview', nodeId: 'transform-orders' }
    );
    expect(harness.input.draft).toEqual(before);
  });
});

describe('Multi-input publication schema and admission', () => {
  it.each([
    ['left_semi', ['order_id', 'client_id']],
    ['left_anti', ['order_id', 'client_id']],
    ['right_semi', ['client_id', 'country']],
    ['right_anti', ['client_id', 'country']],
  ] as const)('publishes exactly the retained-side schema for %s', async (kind, names) => {
    const { binding } = await publicationHarness(buildDvtJoinPreviewDraft(2, kind)).execute();
    expect(binding.schemaDigestSha256).toBe(
      createDvtPostgresOutputSchemaDigestV1({
        schemaVersion: 'dvt-postgres-output-schema.v1',
        columns: names.map((name, ordinal) => ({
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
  });
  it.each([
    'missing input',
    'duplicate input',
    'missing edge',
    'closed edge',
    'mixed connection',
    'stale semantic hash',
    'changed physical binding',
  ])('rejects %s before publishing SQL', async (scenario) => {
    const { input, publisher, publish } = publicationHarness(buildDvtJoinPreviewDraft(3));
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
