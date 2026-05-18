// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { RunSummaryItem } from '../../ports/runs';
import { RunListStateView } from './RunListStateView';

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
});
