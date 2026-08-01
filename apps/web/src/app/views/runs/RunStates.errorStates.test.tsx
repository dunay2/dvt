// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RunDegradedState,
  RunDetailErrorState,
  RunMissingState,
  RunsErrorState,
} from './RunStates';
import { createRunStatesHarness } from './test/RunStatesHarness';

describe('RunStates error states', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    harness = createRunStatesHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('renders list, detail and missing state failures', async () => {
    await harness.render(
      <>
        <RunsErrorState message="Runtime service is unavailable" />
        <RunDetailErrorState runId="run_500" message="Runtime service is unavailable" />
        <RunMissingState runId="run_missing" />
      </>
    );

    expect(harness.container.textContent).toContain('Run list unavailable');
    expect(harness.container.textContent).toContain('Run workspace unavailable');
    expect(harness.container.textContent).toContain('Runtime service is unavailable');
    expect(harness.container.textContent).toContain('Run not found');
    expect(harness.container.textContent).toContain('run_missing');
  });

  it('renders the explicit degraded state notice', async () => {
    const onRetry = vi.fn();
    await harness.render(
      <RunDegradedState
        message="Timeline is temporarily unavailable because runtime event service is degraded."
        onRetry={onRetry}
      />
    );

    expect(harness.container.textContent).toContain('Timeline degraded');
    expect(harness.container.textContent).toContain(
      'Snapshot truth is still available for this run. Timeline detail is partial or temporarily unavailable.'
    );

    const retryButton = harness.container.querySelector<HTMLButtonElement>('button');
    expect(retryButton?.textContent).toBe('Retry timeline');
    retryButton?.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
