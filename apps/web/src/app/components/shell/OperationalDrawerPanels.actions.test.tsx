// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BottomOperationalDrawerBody,
  BottomOperationalProblemsPanel,
  BottomOperationalRunsPanel,
} from './OperationalDrawerPanels';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

function buildContribution(
  overrides?: Partial<OperationalDrawerContribution>
): OperationalDrawerContribution {
  return {
    source: 'canvas',
    title: 'Canvas operations',
    tabs: [
      { id: 'log', label: 'Log', count: null },
      { id: 'problems', label: 'Problems', count: 1 },
      { id: 'runs', label: 'Runs', count: 1 },
      { id: 'preview', label: 'Preview', count: 1 },
    ],
    problems: {
      items: [
        {
          id: 'plan_integrity',
          severity: 'warning',
          message: 'Preview required before running.',
          detail: 'plan_integrity',
          action: {
            label: 'Preview execution plan',
            onAction: vi.fn(),
          },
        },
      ],
    },
    runs: {
      activeRunId: null,
      canStartRun: false,
      status: 'blocked',
      summary: 'Preview required before running.',
    },
    preview: {
      status: 'blocked',
      summary: 'Preview required before running.',
      blockers: ['plan_integrity'],
      canPreview: true,
      onPreviewExecutionPlan: vi.fn(),
    },
    ...overrides,
  };
}

describe('OperationalDrawerPanels action surfaces', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders readiness problem actions from the contribution model', async () => {
    const onAction = vi.fn();
    const contribution = buildContribution({
      problems: {
        items: [
          {
            id: 'plan_integrity',
            severity: 'warning',
            message: 'Preview required before running.',
            detail: 'plan_integrity',
            action: { label: 'Preview execution plan', onAction },
          },
        ],
      },
    });

    await act(async () => {
      root.render(<BottomOperationalProblemsPanel contribution={contribution} />);
    });

    const action = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Preview execution plan')
    );

    expect(action).not.toBeNull();
    fireEvent.click(action!);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders run readiness summaries without needing a live run id', async () => {
    await act(async () => {
      root.render(<BottomOperationalRunsPanel contribution={buildContribution()} />);
    });

    expect(container.textContent).toContain('Run blocked');
    expect(container.textContent).toContain('Preview required before running.');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="runs"
          contribution={buildContribution({
            runs: {
              activeRunId: null,
              canStartRun: true,
              status: 'ready',
              summary: 'Run is ready after the current execution preview.',
            },
          })}
          logBody={<div />}
        />
      );
    });

    expect(container.textContent).toContain('Run ready');
    expect(container.textContent).toContain('Run is ready after the current execution preview.');
  });
});
