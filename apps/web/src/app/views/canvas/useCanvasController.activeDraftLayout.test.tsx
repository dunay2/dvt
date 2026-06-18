import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  createTransformationAuthoringHarnessWithDraft,
  setCanvasLayoutNodePositions,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController active draft layout', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();
  });

  afterEach(() => {
    harness.cleanup();
  });

  async function replaceHarnessWithDraft(
    record: ReturnType<typeof buildRemoteDraftRecord>
  ): Promise<void> {
    harness.cleanup();
    harness = await createHarnessWithDraft(record);
  }

  async function replaceHarnessWithTransformationDraft(
    record: ReturnType<typeof buildRemoteDraftRecord>
  ): Promise<void> {
    harness.cleanup();
    harness = await createTransformationAuthoringHarnessWithDraft(record);
  }

  it('does not autosave pure layout edits after hydrating an existing remote draft', async () => {
    await replaceHarnessWithTransformationDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1', 'node_2', 'node_3'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
          node_3: { x: 200, y: 0 },
        },
        edges: [
          { sourceId: 'node_1', targetId: 'node_2' },
          { sourceId: 'node_2', targetId: 'node_3' },
        ],
      })
    );

    const storeState = harness.state.store as unknown as {
      canvasLayouts: Record<
        string,
        { nodePositions?: Record<string, { x: number; y: number }>; viewport?: unknown }
      >;
    };
    storeState.canvasLayouts = {
      ...storeState.canvasLayouts,
      'tenant-a::project-a::dev': {
        nodePositions: {
          node_1: { x: 48, y: 24 },
          node_2: { x: 148, y: 24 },
          node_3: { x: 248, y: 24 },
        },
      },
    };

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).not.toHaveBeenCalled();
  });

  it('does not snap node positions back to the hydrated remote draft after a local move', async () => {
    await replaceHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_2'],
        nodePositions: {
          node_2: { x: 220, y: 120 },
        },
        edges: [],
      })
    );

    setCanvasLayoutNodePositions(harness, {
      node_2: { x: 420, y: 260 },
    });

    await harness.renderProbe();

    expect(
      harness.getLatestResult()?.nodesWithImpact.find((node) => node.id === 'node_2')?.position
    ).toEqual({ x: 420, y: 260 });
  });
});
