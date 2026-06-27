/** Owned concern: prove Canvas operational drawer read-model projection. */
import { describe, expect, it, vi } from 'vitest';

import { buildCanvasShellProps, buildPlanRunReadiness } from './CanvasShell.testHarness';
import { buildCanvasOperationalDrawerContribution } from './canvasOperationalDrawerContribution';

describe('buildCanvasOperationalDrawerContribution', () => {
  it('projects readiness blockers into actionable Problems and Preview counters', () => {
    const props = buildCanvasShellProps({
      chromeState: {
        canPlanGraph: true,
        canStartRun: false,
        planRunReadiness: buildPlanRunReadiness({
          blockers: ['plan_integrity', 'backpressure'],
          summary: 'Preview required before running.',
        }),
        planStatusSummary: 'Preview required before running.',
      },
    });
    const onPreviewExecutionPlan = vi.fn();

    const contribution = buildCanvasOperationalDrawerContribution({
      policy: props.layout.surfaceStrategy!.operationalDrawer,
      panels: props.panels,
      chromeState: props.chromeState,
      onPreviewExecutionPlan,
      onStartRun: vi.fn(),
    });

    expect(contribution.tabs).toEqual([
      { id: 'log', label: 'Log', count: null },
      { id: 'problems', label: 'Problems', count: 2 },
      { id: 'runs', label: 'Runs', count: 1 },
      { id: 'preview', label: 'Preview', count: 2 },
    ]);
    expect(contribution.problems.items).toEqual([
      expect.objectContaining({
        id: 'plan_integrity',
        severity: 'warning',
        detail: 'Execution Preview integrity',
        action: expect.objectContaining({ label: 'Preview execution plan' }),
      }),
      expect.objectContaining({
        id: 'backpressure',
        severity: 'warning',
        detail: 'Backpressure',
        action: null,
      }),
    ]);
    expect(contribution.runs).toMatchObject({
      activeRunId: null,
      canStartRun: false,
      status: 'blocked',
      summary: 'Preview required before running.',
    });
    expect(contribution.preview).toMatchObject({
      status: 'blocked',
      blockers: ['Execution Preview integrity', 'Backpressure'],
      canPreview: true,
    });
  });

  it('keeps run and preview status compact when the graph is ready', () => {
    const props = buildCanvasShellProps({
      panels: {
        activeRunId: null,
      },
      chromeState: {
        canPlanGraph: true,
        canStartRun: true,
        planRunReadiness: buildPlanRunReadiness({
          blockers: [],
          status: 'ready',
          summary: 'Preview ready.',
        }),
        planStatusSummary: 'Preview ready.',
      },
    });

    const contribution = buildCanvasOperationalDrawerContribution({
      policy: props.layout.surfaceStrategy!.operationalDrawer,
      panels: props.panels,
      chromeState: props.chromeState,
      onPreviewExecutionPlan: vi.fn(),
      onStartRun: vi.fn(),
    });

    expect(contribution.tabs.find((tab) => tab.id === 'problems')?.count).toBe(0);
    expect(contribution.tabs.find((tab) => tab.id === 'runs')?.count).toBeNull();
    expect(contribution.tabs.find((tab) => tab.id === 'preview')?.count).toBeNull();
    expect(contribution.problems.items).toEqual([]);
    expect(contribution.runs).toMatchObject({
      status: 'ready',
      summary: 'Run is ready after the current execution preview.',
    });
    expect(contribution.preview).toMatchObject({
      status: 'ready',
      summary: 'Preview ready.',
      blockers: [],
    });
  });
});
