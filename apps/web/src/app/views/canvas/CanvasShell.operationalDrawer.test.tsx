// @vitest-environment jsdom

/** Owned concern: prove CanvasShell publishes Canvas operations into the bottom drawer. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import {
  createCanvasShellHarness,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellProps } from './canvasShell.types';
import { canvasViewCopy } from './copy';

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
    await renderShell({
      panels: {
        activeRunId: 'run-42',
      },
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
      ],
      runs: {
        activeRunId: 'run-42',
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
