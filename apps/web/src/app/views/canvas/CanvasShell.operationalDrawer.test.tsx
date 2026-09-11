// @vitest-environment jsdom

/** Owned concern: prove CanvasShell publishes Canvas operations into the bottom drawer. */
import { act, isValidElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellProps } from './canvasShell.types';
import { canvasViewCopy } from './copy';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { SemanticTransformFocusPanelProps } from './SemanticTransformFocusPanel';

describe('CanvasShell operational drawer registration', () => {
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
  });

  it('registers Canvas operational drawer tabs from the surface strategy', async () => {
    const onRun = vi.fn();
    const runControls = {
      runId: 'run-42',
      availability: {
        cancel: { available: true as const },
        recover: { available: false as const, reason: 'run_active' as const },
      },
      activity: null,
      outcome: null,
      failure: null,
      onCancel: vi.fn(),
      onRecover: vi.fn(),
    };
    await renderShell({
      panels: {
        activeRunId: 'run-42',
      },
      runControls,
      chromeCommands: {
        onRun,
      },
    });

    const contribution = useOperationalDrawerContributionStore.getState().contribution;

    expect(contribution).toMatchObject({
      source: 'canvas',
      title: 'Canvas operations',
      tabs: [
        { id: 'log', label: 'Log' },
        { id: 'problems', label: 'Problems' },
        { id: 'runs', label: 'Runs' },
        { id: 'preview', label: 'Preview' },
        { id: 'data', label: 'Data' },
        { id: 'semantic', label: 'Semantics' },
      ],
      runs: {
        activeRunId: 'run-42',
        controls: runControls,
      },
      preview: {
        status: 'blocked',
        summary: canvasViewCopy.planStatusPreviewRequiredMessage,
      },
    });
    expect(contribution?.problems.items).toEqual([
      expect.objectContaining({
        id: 'plan_integrity',
        severity: 'warning',
        message: canvasViewCopy.planStatusPreviewRequiredMessage,
      }),
    ]);

    contribution?.runs.onStartRun();
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('opens a real Substrait Transform in the semantic drawer on selection without changing geometry', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    const position = { x: 320, y: 140 };
    const onApplyNodeDraft = vi.fn();
    await renderShell({
      panels: {
        inspectorGraphNodes: [...fixture.sources, fixture.transform],
        inspectorAuthoring: { canEditNode: true, onApplyNodeDraft },
      },
      graph: {
        nodesWithImpact: [
          {
            id: fixture.transform.id,
            type: 'dbtNode',
            position,
            data: {
              ...fixture.transform,
              pluginKind: fixture.transform.kind,
              onInspectNode: vi.fn(),
            },
          },
        ],
      },
    });

    const projectedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        Array<{ position: { x: number; y: number }; data: Record<string, unknown> }> | undefined
    )?.[0];

    expect(projectedNode?.data.onSelectNode).toBeTypeOf('function');
    act(() => {
      (projectedNode?.data.onSelectNode as (() => void) | undefined)?.();
    });

    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('semantic');
    expect(useUiLayoutStore.getState().bottomDrawerVisible).toBe(true);
    expect(projectedNode?.position).toBe(position);

    const semanticBody = useOperationalDrawerContributionStore
      .getState()
      .contribution?.tabs.find((tab) => tab.id === 'semantic')?.content;
    expect(isValidElement<SemanticTransformFocusPanelProps>(semanticBody)).toBe(true);
    if (!isValidElement<SemanticTransformFocusPanelProps>(semanticBody)) {
      throw new Error('Expected the shared semantic Transform panel.');
    }
    semanticBody.props.onTransformChange(fixture.transform);
    expect(onApplyNodeDraft).toHaveBeenCalledOnce();
    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({ name: fixture.transform.name, dvt: expect.any(Object) })
    );
  });

  it('publishes no execution drawer for a surface strategy without execution operations', async () => {
    await renderShell({
      layout: {
        surfaceStrategy: {
          id: 'read-only-file-canvas',
          sourceImport: { placement: 'contextual-modal', openedFrom: [] },
          nodeWorkbench: {
            placement: 'contextual-overlay',
            openedFrom: ['double-click'],
            sections: ['properties', 'columns', 'tests', 'code'],
          },
          operationalDrawer: null,
          globalNavigation: {
            workbenchTabs: 'retired',
            fixedResourcePanel: 'retired',
            fixedInspectorPanel: 'retired',
          },
        },
      },
    });

    expect(useOperationalDrawerContributionStore.getState().contribution).toBeNull();
  });
});
