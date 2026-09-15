// @vitest-environment jsdom

/** Owned concern: prove Transform single-click semantics and double-click exploratory rows. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';

describe('CanvasShell Transform data sample', () => {
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<unknown>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => unmountShell());

  it('keeps single-click semantic and explores current rows on double-click', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    const transform = fixture.transform;
    const previewTransformRows = vi.fn().mockResolvedValue({
      contractVersion: 1,
      canvasId: 'canvas-test',
      transformNodeId: transform.id,
      draftRevision: 'revision-7',
      semanticPlanSha256: 'a'.repeat(64),
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-15T10:00:03.000Z',
    });

    await renderShell({
      panels: { inspectorGraphNodes: [...fixture.sources, transform] },
      graph: {
        nodesWithImpact: [
          {
            id: transform.id,
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: { ...transform, pluginKind: transform.kind },
          },
        ],
      },
      canvasTransformDataSampleQuery: { previewTransformRows },
    });
    const node = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{ data: DbtNodeData }>
    )[0]!.data;

    act(() => node.onSelectNode?.(transform.id));
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('semantic');
    expect(previewTransformRows).not.toHaveBeenCalled();

    await act(async () => {
      node.onOpenNode?.(transform.id);
      await Promise.resolve();
    });

    expect(previewTransformRows).toHaveBeenCalledWith({
      canvasId: 'canvas-test',
      transformNodeId: transform.id,
      limit: 20,
    });
    const dataState = useOperationalDrawerContributionStore.getState();
    expect(dataState.activeTab).toBe(`data:${transform.id}`);
    expect(
      dataState.contribution?.tabs.find((tab) => tab.id === `data:${transform.id}`)
    ).toMatchObject({
      dataSample: {
        status: 'ready',
        nodeName: transform.name,
        sample: { rows: [{ values: ['1'] }] },
      },
    });
  });
});
