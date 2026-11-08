// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { fireEvent, within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunSummaryItem } from '../../ports/runs';
import { RunListStateView } from './RunListStateView';
import type { RunControlCommandController } from './useRunControlCommands';

function buildSummary(overrides: Partial<RunSummaryItem>): RunSummaryItem {
  return {
    runId: 'run_1',
    planId: 'plan_1',
    status: 'running',
    environment: 'dev',
    gitSha: 'abc123',
    startedAt: '2026-05-18T10:00:00.000Z',
    ...overrides,
  };
}

describe('RunListStateView', () => {
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

  it('renders runs as a dense operational table instead of repeated cards', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/runs']}>
          <RunListStateView
            runs={[
              buildSummary({ runId: 'run_failed', status: 'failed', environment: 'prod' }),
              buildSummary({ runId: 'run_completed', status: 'completed', environment: 'dev' }),
            ]}
          />
        </MemoryRouter>
      );
    });

    expect(container.querySelector('[data-slot="run-operational-table"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="table-row"]').length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).toContain('Run ID');
    expect(container.textContent).toContain('Status');
    expect(container.textContent).toContain('Environment');
    expect(container.textContent).toContain('run_failed');
    expect(container.textContent).toContain('run_completed');
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });

  it('makes Run ID the only detail-navigation link and keeps Status last', async () => {
    // The former passive identity and separate View Details column wasted space and link semantics.
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/runs']}>
          <RunListStateView runs={[buildSummary({ runId: 'run_1' })]} />
        </MemoryRouter>
      );
    });
    const ui = within(container);
    const link = ui.getByRole<HTMLAnchorElement>('link', { name: 'run_1' });
    expect(link.getAttribute('href')).toBe('/runs/run_1');
    expect(link.tabIndex).toBe(0);
    expect(ui.queryByRole('button', { name: 'View Details' })).toBeNull();
    expect(ui.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Run ID',
      'Started',
      'Duration',
      'Environment',
      'Git SHA',
      'Status',
    ]);
  });

  it('keeps URL-owned filtering and exposes the current sort accessibly', async () => {
    // Moving columns must not move sort/filter authority into the renderer or lose aria-sort.
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/runs']}>
          <RunListStateView
            runs={[
              buildSummary({ runId: 'run_z', status: 'running', environment: 'dev' }),
              buildSummary({ runId: 'run_a', status: 'failed', environment: 'prod' }),
            ]}
          />
        </MemoryRouter>
      );
    });
    const ui = within(container);
    expect(ui.getByRole('columnheader', { name: 'Started' }).getAttribute('aria-sort')).toBe(
      'descending'
    );
    await act(async () => fireEvent.click(ui.getByRole('button', { name: 'Run ID' })));
    expect(ui.getByRole('columnheader', { name: 'Run ID' }).getAttribute('aria-sort')).toBe(
      'ascending'
    );
    expect(ui.getAllByRole('link').map((link) => link.textContent)).toEqual(['run_a', 'run_z']);
    await act(async () =>
      fireEvent.change(ui.getByRole('combobox', { name: 'Filter runs by status' }), {
        target: { value: 'failed' },
      })
    );
    expect(ui.queryByRole('link', { name: 'run_z' })).toBeNull();
    expect(ui.getByRole('link', { name: 'run_a' })).toBeTruthy();
    await act(async () =>
      fireEvent.change(ui.getByRole('textbox', { name: 'Filter runs' }), {
        target: { value: 'missing' },
      })
    );
    expect(ui.queryAllByRole('link')).toHaveLength(0);
    expect(ui.getByText('No runs match the current filters.')).toBeTruthy();
  });

  it('restores the same URL filters and sort after detail navigation and Back', async () => {
    // Replacing the callback with a link must preserve the list's existing browser-history state.
    const search = '?status=failed&q=prod&sort=runId&dir=asc';
    const router = createMemoryRouter(
      [
        {
          path: '/runs',
          element: (
            <RunListStateView
              runs={[
                buildSummary({ runId: 'run_z', status: 'failed', environment: 'prod' }),
                buildSummary({ runId: 'run_a', status: 'failed', environment: 'prod' }),
                buildSummary({ runId: 'run_other', status: 'completed', environment: 'dev' }),
              ]}
            />
          ),
        },
        { path: '/runs/:runId', element: <p>Selected run detail</p> },
      ],
      { initialEntries: ['/runs' + search] }
    );
    try {
      await act(async () => root.render(<RouterProvider router={router} />));
      const ui = within(container);
      expect(ui.getAllByRole('link').map((link) => link.textContent)).toEqual(['run_a', 'run_z']);
      await act(async () => fireEvent.click(ui.getByRole('link', { name: 'run_a' })));
      expect(router.state.location.pathname).toBe('/runs/run_a');
      expect(ui.getByText('Selected run detail')).toBeTruthy();
      await act(async () => router.navigate(-1));
      expect(router.state.location.search).toBe(search);
      expect(
        ui.getByRole<HTMLSelectElement>('combobox', { name: 'Filter runs by status' }).value
      ).toBe('failed');
      expect(ui.getByRole<HTMLInputElement>('textbox', { name: 'Filter runs' }).value).toBe('prod');
      expect(ui.getByRole('columnheader', { name: 'Run ID' }).getAttribute('aria-sort')).toBe(
        'ascending'
      );
      expect(ui.getAllByRole('link').map((link) => link.textContent)).toEqual(['run_a', 'run_z']);
    } finally {
      router.dispose();
    }
  });

  it('applies URL-stable status and text filters', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/runs?status=failed&q=prod']}>
          <RunListStateView
            runs={[
              buildSummary({ runId: 'run_failed', status: 'failed', environment: 'prod' }),
              buildSummary({ runId: 'run_completed', status: 'completed', environment: 'dev' }),
            ]}
          />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('run_failed');
    expect(container.textContent).not.toContain('run_completed');
    expect(
      (container.querySelector('select[name="run-status-filter"]') as HTMLSelectElement).value
    ).toBe('failed');
    expect(
      (container.querySelector('input[name="run-query-filter"]') as HTMLInputElement).value
    ).toBe('prod');
  });

  it('keeps initial loading distinct from an empty filtered result', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/runs']}>
          <RunListStateView runs={[]} isLoading />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Loading runs...');
    expect(container.textContent).not.toContain('No runs match the current filters.');
  });

  it('keeps real cancellation and recovery controls separate from identity navigation', async () => {
    // Removing View Details must not remove runtime commands or nest their buttons inside a link.
    const cancelRun = vi.fn();
    const recoverRun = vi.fn();
    const runControls: RunControlCommandController = {
      cancelRun,
      recoverRun,
      activity: null,
      outcome: null,
      failure: null,
      resetFeedback: vi.fn(),
    };

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/runs']}>
          <RunListStateView
            runs={[
              buildSummary({
                runId: 'run_active',
                controls: {
                  cancel: { available: true },
                  recover: { available: false, reason: 'run_active' },
                },
              }),
              buildSummary({
                runId: 'run_failed',
                status: 'failed',
                controls: {
                  cancel: { available: false, reason: 'run_terminal' },
                  recover: { available: true },
                },
              }),
            ]}
            runControls={runControls}
          />
        </MemoryRouter>
      );
    });

    act(() => {
      container.querySelector<HTMLButtonElement>('[aria-label="Cancel run"]')?.click();
    });

    expect(cancelRun).toHaveBeenCalledWith('run_active');
    const recover = within(container)
      .getAllByRole<HTMLButtonElement>('button', { name: 'Run plan again' })
      .find((button) => !button.disabled)!;
    expect(
      recover.closest('a'),
      'runtime commands remain siblings of the identity link'
    ).toBeNull();
    await act(async () => fireEvent.click(recover));
    expect(recoverRun).toHaveBeenCalledWith('run_failed');
    expect(within(container).getByRole('link', { name: 'run_failed' }).getAttribute('href')).toBe(
      '/runs/run_failed'
    );
  });
});
