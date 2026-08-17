// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RunListState, RunsEmptyState } from './RunStates';
import {
  buildSummary,
  createRunStatesHarness,
  setRunStatesLanguage,
} from './test/RunStatesHarness';

describe('RunStates list states', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    setRunStatesLanguage('en');
    harness = createRunStatesHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('renders run status, git sha and environment metadata', async () => {
    await harness.render(
      <RunListState
        runs={[
          buildSummary(),
          buildSummary({
            runId: 'run_456',
            status: 'failed',
            gitSha: 'zzz999yyy',
            environment: 'prod',
          }),
        ]}
      />
    );

    expect(harness.container.textContent).toContain('Runs');
    expect(harness.container.textContent).toContain('Run ID');
    expect(harness.container.textContent).toContain('run_123');
    expect(harness.container.textContent).toContain('run_456');
    expect(harness.container.textContent).toContain('running');
    expect(harness.container.textContent).toContain('failed');
    expect(harness.container.textContent).toContain('abc123def');
    expect(harness.container.textContent).toContain('zzz999yyy');
    expect(harness.container.textContent).toContain('Environment');
    expect(harness.container.textContent).toContain('dev');
    expect(harness.container.textContent).toContain('prod');
    expect(harness.container.textContent).toContain('View Details');
  });

  it('renders the governed empty state with canvas guidance', async () => {
    await harness.render(<RunsEmptyState />);

    expect(harness.container.textContent).toContain('No runs available');
    expect(harness.container.textContent).toContain('Go to canvas to preview and start a run');
  });

  it('renders list copy and known statuses in Spanish from the application language', async () => {
    setRunStatesLanguage('es');

    await harness.render(
      <RunListState
        runs={[
          buildSummary({ status: 'running' }),
          buildSummary({ runId: 'run_456', status: 'failed' }),
        ]}
      />
    );

    const content = harness.container.textContent ?? '';
    expect(content).toContain('Ejecuciones');
    expect(content).toContain('ID de ejecución');
    expect(content).toContain('Entorno');
    expect(content).toContain('En ejecución');
    expect(content).toContain('Fallida');
    expect(content).toContain('Ver detalles');
    expect(content).not.toContain('View Details');
    expect(content).not.toContain('Environment');
  });
});
