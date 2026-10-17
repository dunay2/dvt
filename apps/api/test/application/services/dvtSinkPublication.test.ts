/**
 * @baseline ADR-0064 / ADR-0066: protected selection owns one explicit publication boundary.
 * @decision Reuse projection and workload admission, never seed an executable result.
 * @consequence Sink identity and its full dependency closure survive lowering.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';

import { DvtOperationalWorkloadProjector } from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import { publicationHarness } from '../../fixtures/dvtProjectionPublicationHarness.js';
import { buildDvtSinkPublicationDraft } from '../../fixtures/dvtSinkPublicationFixture.js';

describe('protected explicit Sink lowering', () => {
  it.each(['sink', 'dvt:sink'])(
    'produces one workload for %s without an intermediate durable result',
    async (kind) => {
      const draft = buildDvtSinkPublicationDraft();
      draft.nodes.find((node) => node.id === 'sink-orders')!.kind = kind;
      const harness = publicationHarness(draft);
      const { graph, workload } = await harness.execute();
      expect(graph.nodes.map(({ nodeId }) => nodeId)).toEqual(['sink-orders']);
      expect(workload.output).toEqual({
        kind: 'transform-result',
        nodeId: 'transform-orders',
        disposition: 'ephemeral',
      });
      expect(workload).toMatchObject({
        executionIntent: 'run',
        graph: {
          selectedNodeIds: ['sink-orders', 'source-client', 'source-orders', 'transform-orders'],
          selectedEdgeIds: ['source-client-transform', 'source-orders-transform', 'transform-sink'],
        },
        publicationBoundaries: [
          {
            kind: 'sink',
            nodeId: 'sink-orders',
            inputNodeId: 'transform-orders',
            target: { schema: 'analytics', relation: 'orders_sink' },
          },
        ],
      });
      expect(harness.publish).toHaveBeenCalledOnce();
    }
  );

  it.each(['view', 'table'])(
    'rejects a %s Transform feeding the Sink before artifact publication',
    async (materialized) => {
      const draft = buildDvtSinkPublicationDraft();
      draft.nodes.find((node) => node.role === 'transform')!.metadata!.config = { materialized };
      const harness = publicationHarness(draft);
      await expect(harness.execute()).rejects.toThrow();
      expect(harness.publish).not.toHaveBeenCalled();
    }
  );

  it.each([
    'unconfirmed connection',
    'foreign connection',
    'append',
    'view',
    'missing input',
    'extra input',
    'multiple sinks',
  ] as const)('rejects %s before any artifact write', async (scenario) => {
    const draft = buildDvtSinkPublicationDraft();
    const sink = draft.nodes.find((node) => node.id === 'sink-orders')!;
    const config = sink.metadata!.config as Record<string, unknown>;
    if (scenario === 'unconfirmed connection') delete config.connectionRef;
    if (scenario === 'foreign connection')
      config.connectionRef = { ...(config.connectionRef as object), connectionId: 'foreign' };
    if (scenario === 'append') config.writeMode = 'append';
    if (scenario === 'view') config.materialization = 'view';
    if (scenario === 'missing input')
      draft.edges = draft.edges.filter((edge) => edge.targetId !== sink.id);
    if (scenario === 'extra input')
      draft.edges.push({
        id: 'extra',
        sourceId: 'source-orders',
        targetId: sink.id,
        relation: 'lineage',
      });
    if (scenario === 'multiple sinks') {
      draft.nodes.push({ ...sink, id: 'another-sink' });
      draft.nodeIds.push('another-sink');
      draft.edges.push({
        id: 'another-publication',
        sourceId: 'transform-orders',
        targetId: 'another-sink',
        relation: 'lineage',
      });
    }
    const harness = publicationHarness(draft);
    await expect(harness.execute()).rejects.toThrow();
    expect(harness.publish).not.toHaveBeenCalled();
  });

  it('rejects an omitted Sink edge from the protected selection', async () => {
    const harness = publicationHarness(buildDvtSinkPublicationDraft());
    await expect(
      harness.publisher.publish({
        ...harness.input,
        selectedEdgeIds: harness.input.selectedEdgeIds.filter((id) => id !== 'transform-sink'),
      })
    ).rejects.toThrow();
    expect(harness.publish).not.toHaveBeenCalled();
  });

  it('rejects stale semantic output identity during lowering', async () => {
    const harness = publicationHarness(buildDvtSinkPublicationDraft());
    const { binding } = await harness.execute();
    const result = new DvtOperationalWorkloadProjector().project({
      ...harness.input,
      canvasId: harness.input.draft.canvas.id!,
      draftRevision: 'revision-2',
      targetProjection: { ...binding, outputNodeId: 'sink-orders' },
    });
    expect(result).toMatchObject({ ok: false, cause: 'dvt_projection_stale' });
  });
});
