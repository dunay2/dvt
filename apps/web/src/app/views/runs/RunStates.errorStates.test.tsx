// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RunDetailErrorState,
  RunEventFeedHealthState,
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

  it('renders an accessible retry only for a retryable degraded feed', async () => {
    const onRetry = vi.fn();
    await harness.render(
      <RunEventFeedHealthState
        health={{ state: 'degraded', events: [], canRetry: true }}
        onRetry={onRetry}
      />
    );

    expect(harness.container.textContent).toContain('Degraded');
    expect(harness.container.textContent).toContain(
      'Event updates are temporarily degraded. Previously received events remain visible.'
    );

    const retryButton = harness.container.querySelector<HTMLButtonElement>('button');
    expect(retryButton?.textContent).toBe('Retry event feed');
    retryButton?.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
