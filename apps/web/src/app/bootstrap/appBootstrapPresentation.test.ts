import { describe, expect, it } from 'vitest';

import {
  BOOTSTRAP_STEP_ORDER,
  canCompleteBootstrapSteps,
  createBootstrapStepState,
  createInitialBootstrapStepState,
  formatBootstrapBuildDate,
  resolveBootstrapScreenPresentation,
  resolveBootstrapStepDetail,
  type BootstrapStep,
  type BootstrapStepState,
  type BootstrapStepStateById,
} from './appBootstrapPresentation';

function createCompleteBootstrapStepState(): BootstrapStepStateById {
  return {
    hydrate: createBootstrapStepState('hydrate', 'complete'),
    services: createBootstrapStepState('services', 'complete'),
    capabilities: createBootstrapStepState('capabilities', 'complete'),
    health: createBootstrapStepState('health', 'complete'),
    route: createBootstrapStepState('route', 'complete'),
  };
}

function withStepState(
  state: BootstrapStepStateById,
  step: BootstrapStep,
  stepState: BootstrapStepState
): BootstrapStepStateById {
  return {
    ...state,
    [step]: stepState,
  };
}

describe('appBootstrapPresentation', () => {
  it('derives the initial loading presentation without requiring the DOM', () => {
    const initialState = createInitialBootstrapStepState();
    const presentation = resolveBootstrapScreenPresentation(initialState);

    expect(BOOTSTRAP_STEP_ORDER.map((step) => initialState[step].status)).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
    expect(presentation.state).toBe('loading');
    expect(presentation.title).toBe('Preparing Raven');
    expect(presentation.announcement).toEqual({
      label: 'Raven startup status',
      text: 'Preparing Raven. Loading startup modules in order. The workspace opens once bootstrap settles.',
      busy: true,
    });
    expect(presentation.progress).toMatchObject({
      tone: 'loading',
      label: '0/5 startup checks settled',
      settledCount: 0,
      totalCount: 5,
    });
  });

  it('treats failed health as a settled failure when the route can render', () => {
    const state = {
      ...createCompleteBootstrapStepState(),
      health: createBootstrapStepState('health', 'failed', 'Request to /healthz failed (NETWORK)'),
    };
    const presentation = resolveBootstrapScreenPresentation(state);

    expect(canCompleteBootstrapSteps(state)).toBe(true);
    expect(presentation.state).toBe('complete');
    expect(presentation.progress.label).toBe('5/5 startup checks settled');
    expect(presentation.progress.segments.map((segment) => segment.status)).toEqual([
      'complete',
      'complete',
      'complete',
      'failed',
      'complete',
    ]);
  });

  it('keeps pending, blocked, and error steps out of allowed startup completion', () => {
    const completeState = createCompleteBootstrapStepState();

    expect(canCompleteBootstrapSteps(completeState)).toBe(true);
    expect(
      canCompleteBootstrapSteps(
        withStepState(completeState, 'route', createBootstrapStepState('route', 'pending'))
      )
    ).toBe(false);
    expect(
      canCompleteBootstrapSteps(
        withStepState(completeState, 'route', createBootstrapStepState('route', 'blocked'))
      )
    ).toBe(false);
    expect(
      canCompleteBootstrapSteps(
        withStepState(completeState, 'route', createBootstrapStepState('route', 'error'))
      )
    ).toBe(false);
  });

  it('uses the latest blocked detail as the aggregate blocked message', () => {
    const state = {
      ...createCompleteBootstrapStepState(),
      capabilities: createBootstrapStepState('capabilities', 'blocked', 'Capabilities blocked.'),
      route: createBootstrapStepState('route', 'blocked', 'Route backend is not ready.'),
    };
    const presentation = resolveBootstrapScreenPresentation(state);

    expect(presentation.state).toBe('blocked');
    expect(presentation.title).toBe('Raven is waiting for startup prerequisites');
    expect(presentation.message).toBe('Route backend is not ready.');
    expect(presentation.progress.label).toBe(
      '3/5 startup checks settled. Required startup blockers remain.'
    );
  });

  it('lets startup errors take precedence over blockers', () => {
    const state = {
      ...createCompleteBootstrapStepState(),
      health: createBootstrapStepState('health', 'blocked', 'Health probe still pending.'),
      route: createBootstrapStepState('route', 'error', 'Route failed while loading.'),
    };
    const presentation = resolveBootstrapScreenPresentation(state);

    expect(presentation.state).toBe('error');
    expect(presentation.title).toBe('Raven could not finish startup');
    expect(presentation.message).toBe('Route failed while loading.');
    expect(presentation.progress.label).toBe(
      '3/5 startup checks settled. Startup error needs attention.'
    );
  });

  it('keeps default details and build metadata formatting in the presentation model', () => {
    expect(resolveBootstrapStepDetail('route', 'error')).toBe(
      'Preparing initial route failed during startup.'
    );
    expect(formatBootstrapBuildDate('2026-04-18T10:20:00.000Z')).toBe('2026-04-18 10:20 UTC');
    expect(formatBootstrapBuildDate('not-a-date')).toBe('not-a-date');
  });
});
