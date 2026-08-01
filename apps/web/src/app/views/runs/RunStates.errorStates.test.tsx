// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveRunEventFeedHealthCopy } from '../../services/runs/runEventFeedHealthCopy';
import {
  RunDetailErrorState,
  RunEventFeedHealthState,
  RunMissingState,
  RunsErrorState,
} from './RunStates';
import { createRunStatesHarness } from './test/RunStatesHarness';

const feedCopy = resolveRunEventFeedHealthCopy('en');

describe('RunStates error states', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    harness = createRunStatesHarness();
  });

  afterEach(() => {
    harness.cleanup();
    vi.restoreAllMocks();
  });

  it('uses copy supplied by the host instead of resolving a second browser locale', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-ES');

    await harness.render(
      <RunEventFeedHealthState
        copy={feedCopy}
        health={{ state: 'loading', events: [], canRetry: false }}
      />
    );

    expect(harness.container.textContent).toContain('Loading run events...');
    expect(harness.container.textContent).not.toContain('Cargando eventos de ejecucion...');
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
        copy={feedCopy}
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

  it.each([
    ['loading', 'Loading'],
    ['live', 'Live'],
    ['degraded', 'Degraded'],
    ['complete', 'Complete'],
    ['failed', 'Failed'],
  ] as const)(
    'renders the shared %s feed state with text, not colour alone',
    async (state, label) => {
      await harness.render(
        <RunEventFeedHealthState copy={feedCopy} health={{ state, events: [], canRetry: false }} />
      );

      const status = harness.container.querySelector('[data-slot="run-event-feed-health"]');
      expect(status?.getAttribute('data-state')).toBe(state);
      expect(status?.textContent).toContain(label);
      expect(status?.getAttribute('role')).toBe('status');
      expect(harness.container.querySelector('button')).toBeNull();
    }
  );
});
