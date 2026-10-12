import { DVT_POSTGRES_SET_PROFILE_ID } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import { publicationHarness } from '../../fixtures/dvtProjectionPublicationHarness.js';
import { buildDvtSetPreviewDraft } from '../../fixtures/dvtSetPreviewFixture.js';

describe.each([false, true])('SET publication (run=%s)', (run) => {
  it.each([
    [undefined, 'union_distinct'],
    [undefined, 'intersect_distinct'],
    [undefined, 'except_distinct'],
    [undefined, 'intersect_all'],
    [undefined, 'except_all'],
    ['aggregate', 'union_distinct'],
    ['window', 'union_distinct'],
  ] as const)('publishes %s / %s with one scoped workload', async (wrapper, operation) => {
    const harness = publicationHarness(buildDvtSetPreviewDraft(wrapper, operation), run);
    const before = globalThis.structuredClone(harness.input.draft);
    const { binding, graph, workload } = await harness.execute();
    expect(harness.publish).toHaveBeenCalledOnce();
    expect(binding.artifact.sha256).toBe(sha256Hex(harness.publish.mock.calls[0]![0].bytes));
    expect(binding.profileId).toBe(DVT_POSTGRES_SET_PROFILE_ID);
    expect(workload.targetProjection.profileId).toBe(DVT_POSTGRES_SET_PROFILE_ID);
    expect(graph.nodes).toHaveLength(1);
    expect(workload.graph.selectedNodeIds).toEqual([...harness.input.selectedNodeIds].sort());
    expect(workload.graph.selectedEdgeIds).toEqual([...harness.input.selectedEdgeIds].sort());
    expect(workload.output).toMatchObject(
      run
        ? { disposition: 'table', target: { schema: 'analytics', relation: 'result' } }
        : { kind: 'ephemeral-preview', nodeId: 'transform-customers' }
    );
    expect(harness.input.draft).toEqual(before);
  });
});

describe('SET publication admission', () => {
  it.each(['missing input', 'mismatched physical table', 'stale semantic hash'])(
    'rejects %s before publishing SQL',
    async (scenario) => {
      const { input, publisher, publish } = publicationHarness(buildDvtSetPreviewDraft());
      const candidate = { ...globalThis.structuredClone(input) };
      if (scenario === 'missing input') {
        candidate.selectedNodeIds = candidate.selectedNodeIds.slice(1);
        candidate.selectedEdgeIds = candidate.selectedEdgeIds.slice(1);
      }
      if (scenario === 'mismatched physical table')
        candidate.draft.nodes[0]!.metadata!['tableName'] = 'other_table';
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
