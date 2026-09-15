// @vitest-environment jsdom

/** Owned concern: prove Transform single-click semantics and double-click authoritative rows. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import { buildCanvasTransformOutputSampleAuthority } from './canvasTransformOutputSample.testSupport';

describe('CanvasShell Transform output sample', () => {
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<unknown>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => unmountShell());

  it('keeps single-click semantic and loads exact published rows on double-click', async () => {
    const { currentPlan, publication, source, transform } =
      buildCanvasTransformOutputSampleAuthority();
    const previewSourceObjectRows = vi.fn().mockResolvedValue({
      contractVersion: 1,
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/analytics/orders_enriched',
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-15T10:00:03.000Z',
    });

    await renderShell({
      panels: { inspectorGraphNodes: [source, transform] },
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
      warehouseSourceDataSampleQuery: { previewSourceObjectRows },
      runOutputPreviewAuthority: {
        currentPlan,
        isCurrentPlanStale: false,
      },
      runSnapshot: { runId: 'run-1', status: 'completed', publication },
    });
    const node = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{ data: DbtNodeData }>
    )[0]!.data;

    act(() => node.onSelectNode?.(transform.id));
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('semantic');
    expect(previewSourceObjectRows).not.toHaveBeenCalled();

    await act(async () => {
      node.onOpenNode?.(transform.id);
      await Promise.resolve();
    });

    expect(previewSourceObjectRows).toHaveBeenCalledWith({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/analytics/orders_enriched',
      expectedPublicationToken: publication.publication.token,
      limit: 20,
    });
    const dataState = useOperationalDrawerContributionStore.getState();
    expect(dataState.activeTab).toBe(`data:${transform.id}`);
    expect(
      dataState.contribution?.tabs.find((tab) => tab.id === `data:${transform.id}`)
    ).toMatchObject({
      dataSample: { status: 'ready', nodeName: transform.name },
    });
  });
});
