import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportSourcesResult } from '../../ports/workspace';
import {
  buildRemoteDraftRecord,
  clearHarnessRemoteDraftRecord,
  createHarnessWithDraft,
  setHarnessRemoteDraftRecord,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController source import contract', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = await createHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    );
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('invalidates the protected draft query and prepares focus when imported sources complete', async () => {
    const storeState = harness.state.store as Record<string, unknown>;
    storeState.inspectorPanelVisible = false;
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleSourceImportComplete({
        success: true,
        sourcesCreated: 2,
        tablesImported: 2,
        yamlFiles: ['models/sources/src_erp.yml'],
        importedNodeIds: ['src_erp_orders', 'src_erp_customers'],
        grouping: 'schema',
        options: {
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        },
      });
    });

    expect(harness.state.store.setCurrentPlan).toHaveBeenCalledWith(null);
    expect(harness.state.store.setSelectedNodes).toHaveBeenCalledWith([
      'src_erp_orders',
      'src_erp_customers',
    ]);
    expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith('src_erp_orders');
    expect(harness.state.store.showInspectorPanel).not.toHaveBeenCalled();
    expect(harness.state.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
    });
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([
      'src_erp_orders',
      'src_erp_customers',
    ]);

    await act(async () => {
      harness.getLatestResult()?.handleImportedNodeFocusComplete();
    });

    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([]);
  });

  it('persists imported source nodes near the canvas context-menu anchor', async () => {
    await harness.renderProbe();
    harness.state.store.setCanvasNodePositions.mockClear();

    await act(async () => {
      const complete = harness.getLatestResult()?.handleSourceImportComplete as
        | ((
            result: ImportSourcesResult,
            context: { canvasPosition: { x: number; y: number } }
          ) => void)
        | undefined;

      complete?.(
        {
          success: true,
          sourcesCreated: 2,
          tablesImported: 2,
          yamlFiles: ['models/sources/src_erp.yml'],
          importedNodeIds: ['src_erp_orders', 'src_erp_customers'],
          grouping: 'schema',
          options: {
            includeColumns: true,
            addTests: false,
            addFreshness: false,
          },
        },
        { canvasPosition: { x: 420, y: 260 } }
      );
    });

    expect(harness.state.store.setCanvasNodePositions).toHaveBeenCalledWith(
      'tenant-a::project-a::dev',
      expect.objectContaining({
        node_1: { x: 0, y: 0 },
        node_2: { x: 100, y: 0 },
        src_erp_orders: { x: 420, y: 260 },
        src_erp_customers: { x: 660, y: 260 },
      })
    );
  });

  it('ignores source import completion once the canvas is blocked by missing_remote', async () => {
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
    await harness.renderProbe();

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();

    const storeActions = harness.state.store as typeof harness.state.store & {
      setCurrentPlan: ReturnType<typeof vi.fn>;
      setSelectedNodes: ReturnType<typeof vi.fn>;
      setInspectorNode: ReturnType<typeof vi.fn>;
      showInspectorPanel: ReturnType<typeof vi.fn>;
    };

    storeActions.setCurrentPlan.mockClear();
    storeActions.setSelectedNodes.mockClear();
    storeActions.setInspectorNode.mockClear();
    storeActions.showInspectorPanel.mockClear();
    harness.state.queryClient.invalidateQueries.mockClear();

    await act(async () => {
      harness.getLatestResult()?.handleSourceImportComplete({
        success: true,
        sourcesCreated: 1,
        tablesImported: 1,
        yamlFiles: ['models/sources/src_erp.yml'],
        importedNodeIds: ['node_3'],
        grouping: 'schema',
        options: {
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        },
      });
    });

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(storeActions.setCurrentPlan).not.toHaveBeenCalled();
    expect(storeActions.setSelectedNodes).not.toHaveBeenCalled();
    expect(storeActions.setInspectorNode).not.toHaveBeenCalled();
    expect(storeActions.showInspectorPanel).not.toHaveBeenCalled();
    expect(harness.state.queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([]);
  });
});
