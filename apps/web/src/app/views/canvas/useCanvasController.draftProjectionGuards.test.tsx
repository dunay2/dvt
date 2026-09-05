import { afterEach, describe, expect, it } from 'vitest';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  setHarnessRemoteDraftRecord,
  type CanvasControllerHarness,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController persisted draft projection guards', () => {
  let harness: CanvasControllerHarness | null = null;

  afterEach(() => {
    harness?.cleanup();
    harness = null;
  });

  it('renders an intentionally empty persisted draft without falling back to the snapshot graph', async () => {
    harness = await createHarnessWithDraft(
      buildRemoteDraftRecord(
        {
          nodeIds: [],
          nodePositions: {},
          edges: [],
        },
        'rev-empty',
        '2026-04-16T00:00:00Z'
      )
    );

    expect(harness.getLatestResult()?.nodesWithImpact).toEqual([]);
    expect(harness.getLatestResult()?.edges).toEqual([]);
  });

  it('does not auto-merge unrelated snapshot nodes into an active persisted draft', async () => {
    harness = setupCanvasControllerHarness();
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
          },
          edges: [],
        },
        'rev-1',
        '2026-04-16T00:00:00Z'
      )
    );

    await harness.renderProbe();

    harness.state.graphData.nodes = [...harness.state.graphData.nodes, { id: 'node_3' }];
    harness.state.canonicalNodes = [
      ...harness.state.canonicalNodes,
      {
        id: 'node_3',
        name: 'payments',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ];

    await harness.renderProbe();

    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
  });
});
