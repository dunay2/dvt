// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BottomOperationalDrawerBody } from './OperationalDrawerPanels';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

function buildCanvasOperationalDrawerContribution(
  overrides?: Partial<OperationalDrawerContribution>
): OperationalDrawerContribution {
  return {
    source: 'canvas',
    title: 'Canvas operations',
    copy: {
      problemsAriaLabel: 'Canvas problems',
      noProblemsMessage: 'No current Canvas problems.',
      runsAriaLabel: 'Canvas runs',
      runReadyStatus: 'Run ready',
      runBlockedStatus: 'Run blocked',
      runActiveStatus: 'Active run',
      previewAriaLabel: 'Canvas execution preview',
      previewAction: 'Create Execution Preview',
      previewReadyStatus: 'Preview ready',
      previewBlockedStatus: 'Preview blocked',
      dataAriaLabel: 'Source data sample',
      dataIdleMessage: 'Open a source sample.',
      dataLoadingTemplate: 'Loading {nodeName}.',
      dataEmptyTemplate: '{nodeName} returned no rows.',
      dataConnectionNotFoundTemplate: 'Connection missing for {nodeName}.',
      dataSourceObjectNotFoundTemplate: 'Object missing for {nodeName}.',
      dataUnavailableTemplate: 'Sample unavailable for {nodeName}.',
      dataUnknownErrorTemplate: 'Sample failed for {nodeName}.',
      dataTruncatedTemplate: 'Showing {limit} rows.',
      dataCaptionTemplate: 'Sample from {nodeName}',
      dataNullValue: 'NULL',
      tabsAriaLabel: 'Canvas operational drawer',
      severity: { info: 'Info', warning: 'Warning', error: 'Error' },
    },
    tabs: [
      { id: 'log', label: 'Log', count: null },
      { id: 'problems', label: 'Problems', count: 1 },
      { id: 'runs', label: 'Runs', count: 1 },
      { id: 'preview', label: 'Preview', count: 1 },
      { id: 'data', label: 'Data', count: null },
    ],
    problems: {
      items: [
        {
          id: 'plan_integrity',
          severity: 'warning',
          message: 'Preview required before running.',
          detail: 'Execution Preview integrity',
        },
      ],
    },
    runs: {
      activeRunId: 'run-42',
      canStartRun: false,
      controls: null,
      onStartRun: vi.fn(),
      status: 'active',
      summary: 'Run run-42 is active.',
    },
    preview: {
      status: 'blocked',
      summary: 'Preview required before running.',
      blockers: ['Execution Preview integrity'],
      canPreview: true,
      onPreviewExecutionPlan: vi.fn(),
      selectionRecovery: null,
    },
    dataSample: { status: 'idle' },
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

  it('renders a bounded source sample as an accessible data table', async () => {
    const longPayload = '{"runId":"run_019fc867-d439-7319-995f-4af3457311ba","planId":"5579993a"}';
    const contribution = buildCanvasOperationalDrawerContribution({
      tabs: [
        { id: 'log', label: 'Log', count: null },
        { id: 'problems', label: 'Problems', count: 0 },
        { id: 'runs', label: 'Runs', count: null },
        { id: 'preview', label: 'Preview', count: null },
        { id: 'data', label: 'Data', count: 2 },
      ],
      dataSample: {
        status: 'ready',
        nodeName: 'orders',
        sample: {
          contractVersion: 1,
          connectionId: 'postgresql-local',
          objectId: 'relation/dvt/public/orders',
          columns: [
            { name: 'order_id', type: 'integer', nullable: false },
            { name: 'customer', type: 'text', nullable: true },
          ],
          rows: [{ values: ['1', longPayload] }, { values: ['2', null] }],
          limit: 20,
          truncated: true,
          sampledAt: '2026-08-17T10:00:00.000Z',
        },
      },
    });

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody activeTab="data" contribution={contribution} logBody={null} />
      );
    });

    const table = container.querySelector<HTMLTableElement>(
      '[data-slot="bottom-operational-data-table"]'
    );
    expect(table).not.toBeNull();
    expect(table?.querySelector('caption')?.textContent).toBe('Sample from orders');
    expect(
      Array.from(table?.querySelectorAll('th[scope="col"]') ?? []).map((cell) => cell.textContent)
    ).toEqual(['order_id', 'customer']);
    const longValue = Array.from(
      table?.querySelectorAll<HTMLElement>('[data-slot="bottom-operational-data-value"][title]') ??
        []
    ).find((value) => value.getAttribute('title') === longPayload);
    expect(longValue?.textContent).toBe(longPayload);
    expect(longValue?.getAttribute('title')).toBe(longPayload);
    expect(longValue?.getAttribute('aria-label')).toBe(longPayload);
    expect(table?.textContent).toContain('NULL');
    expect(container.textContent).toContain('Showing 20 rows.');
  });

  it('announces loading, empty, and governed failure states in the data panel', async () => {
    const baseContribution = buildCanvasOperationalDrawerContribution();

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="data"
          contribution={{
            ...baseContribution,
            dataSample: { status: 'loading', nodeName: 'orders' },
          }}
          logBody={null}
        />
      );
    });
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Loading orders.');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="data"
          contribution={{
            ...baseContribution,
            dataSample: {
              status: 'ready',
              nodeName: 'orders',
              sample: {
                contractVersion: 1,
                connectionId: 'postgresql-local',
                objectId: 'relation/dvt/public/orders',
                columns: [{ name: 'order_id', type: 'integer', nullable: false }],
                rows: [],
                limit: 20,
                truncated: false,
                sampledAt: '2026-08-17T10:00:00.000Z',
              },
            },
          }}
          logBody={null}
        />
      );
    });
    expect(container.textContent).toContain('orders returned no rows.');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="data"
          contribution={{
            ...baseContribution,
            dataSample: {
              status: 'error',
              nodeName: 'orders',
              reason: 'source_object_not_found',
            },
          }}
          logBody={null}
        />
      );
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Object missing for orders.'
    );
  });

  it('renders problems, runs, and preview bodies from the route contribution', async () => {
    const onPreviewExecutionPlan = vi.fn();
    const contribution = buildCanvasOperationalDrawerContribution({
      preview: {
        status: 'blocked',
        summary: 'Preview required before running.',
        blockers: ['Execution Preview integrity'],
        canPreview: true,
        onPreviewExecutionPlan,
        selectionRecovery: null,
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
    expect(container.textContent).toContain('Execution Preview integrity');
    expect(container.textContent).not.toContain('plan_integrity');
    expect(
      container.querySelector('[data-slot="bottom-operational-problem-severity"]')?.textContent
    ).toBe('Warning');

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
    ).toBe('Execution Preview integrity');
    expect(container.textContent).not.toContain('plan_integrity');

    const previewPanel = container.querySelector<HTMLElement>(
      '#bottom-operational-drawer-panel-preview'
    );
    expect(previewPanel?.getAttribute('role')).toBe('tabpanel');
    expect(previewPanel?.getAttribute('aria-labelledby')).toBe(
      'bottom-operational-drawer-tab-preview'
    );
    expect(previewPanel?.hidden).toBe(false);

    const previewButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="bottom-operational-preview-action"]'
    );
    expect(previewButton).not.toBeNull();
    expect(previewButton?.textContent).toContain('Create Execution Preview');

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
