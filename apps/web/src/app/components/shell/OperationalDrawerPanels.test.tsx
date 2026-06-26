// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BottomOperationalDrawerBody,
  BottomOperationalDrawerTabs,
} from './OperationalDrawerPanels';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

function buildCanvasOperationalDrawerContribution(
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
        },
      ],
    },
    runs: {
      activeRunId: 'run-42',
      canStartRun: false,
      status: 'active',
      summary: 'Run run-42 is active.',
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

describe('OperationalDrawerPanels', () => {
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
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders operational drawer tabs as component-owned presentation', async () => {
    const onSelectTab = vi.fn();
    const contribution = buildCanvasOperationalDrawerContribution();

    await act(async () => {
      root.render(
        <BottomOperationalDrawerTabs
          activeTab="log"
          contribution={contribution}
          onSelectTab={onSelectTab}
        />
      );
    });

    const tabs = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="bottom-operational-drawer-tab"]')
    );

    expect(tabs.map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Log',
      'Problems 1',
      'Runs 1',
      'Preview 1',
    ]);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      fireEvent.click(tabs[3]!);
    });

    expect(onSelectTab).toHaveBeenCalledWith('preview');
  });

  it('renders problems, runs, and preview bodies from the route contribution', async () => {
    const onPreviewExecutionPlan = vi.fn();
    const contribution = buildCanvasOperationalDrawerContribution({
      preview: {
        status: 'blocked',
        summary: 'Preview required before running.',
        blockers: ['plan_integrity'],
        canPreview: true,
        onPreviewExecutionPlan,
      },
    });

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="problems"
          contribution={contribution}
          logBody={<div data-testid="log-body">log stream</div>}
        />
      );
    });

    expect(container.textContent).toContain('Preview required before running.');
    expect(container.textContent).toContain('plan_integrity');
    expect(
      container.querySelector('[data-slot="bottom-operational-problem-severity"]')?.textContent
    ).toBe('warning');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="runs"
          contribution={contribution}
          logBody={<div data-testid="log-body">log stream</div>}
        />
      );
    });

    expect(container.textContent).toContain('Active run');
    expect(container.textContent).toContain('run-42');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="preview"
          contribution={contribution}
          logBody={<div data-testid="log-body">log stream</div>}
        />
      );
    });

    expect(container.textContent).toContain('Preview required before running.');
    expect(
      container.querySelector('[data-slot="bottom-operational-preview-blocker"]')?.textContent
    ).toBe('plan_integrity');

    const previewButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Preview execution plan')
    );
    expect(previewButton).not.toBeNull();

    await act(async () => {
      fireEvent.click(previewButton!);
    });

    expect(onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
  });

  it('delegates to log body when no route contribution owns the drawer', async () => {
    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="problems"
          contribution={null}
          logBody={<div data-testid="log-body">log stream</div>}
        />
      );
    });

    expect(container.textContent).toBe('log stream');
  });
});
