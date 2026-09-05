// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { resolveAppBootstrapCopy } from './appBootstrapCopy';
import {
  BOOTSTRAP_STEP_ORDER,
  canCompleteBootstrapSteps,
  createBootstrapStepState,
  createInitialBootstrapStepState,
  formatBootstrapBuildDate,
  isBootstrapStepStartupAllowed,
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

  it('owns the single status-to-startup-allowance rule', () => {
    expect(
      ['pending', 'complete', 'degraded', 'failed', 'blocked', 'error'].map((status) =>
        isBootstrapStepStartupAllowed(status as BootstrapStepState['status'])
      )
    ).toEqual([false, true, true, true, false, false]);
  });

  it.each([
    {
      name: 'uses the latest blocked detail as the aggregate blocked message',
      overrides: {
        capabilities: createBootstrapStepState('capabilities', 'blocked', 'Capabilities blocked.'),
        route: createBootstrapStepState('route', 'blocked', 'Route backend is not ready.'),
      },
      expected: {
        state: 'blocked',
        title: 'Raven is waiting for startup prerequisites',
        message: 'Route backend is not ready.',
        progressLabel: '3/5 startup checks settled. Required startup blockers remain.',
      },
    },
    {
      name: 'lets startup errors take precedence over blockers',
      overrides: {
        health: createBootstrapStepState('health', 'blocked', 'Health probe still pending.'),
        route: createBootstrapStepState('route', 'error', 'Route failed while loading.'),
      },
      expected: {
        state: 'error',
        title: 'Raven could not finish startup',
        message: 'Route failed while loading.',
        progressLabel: '3/5 startup checks settled. Startup error needs attention.',
      },
    },
  ])('$name', ({ overrides, expected }) => {
    const presentation = resolveBootstrapScreenPresentation({
      ...createCompleteBootstrapStepState(),
      ...overrides,
    });

    expect(presentation.state).toBe(expected.state);
    expect(presentation.title).toBe(expected.title);
    expect(presentation.message).toBe(expected.message);
    expect(presentation.progress.label).toBe(expected.progressLabel);
  });

  it('keeps default details and build metadata formatting in the presentation model', () => {
    expect(resolveBootstrapStepDetail('route', 'error')).toBe(
      'Preparing initial route failed during startup.'
    );
    expect(formatBootstrapBuildDate('2026-04-18T10:20:00.000Z')).toBe('2026-04-18 10:20 UTC');
    expect(formatBootstrapBuildDate('not-a-date')).toBe('not-a-date');
  });

  it('derives startup copy from the active locale catalog', () => {
    const spanishCopy = resolveAppBootstrapCopy('es-ES');
    const state = createInitialBootstrapStepState(spanishCopy);
    const presentation = resolveBootstrapScreenPresentation(state, spanishCopy);

    expect(presentation.title).toBe('Preparando Raven');
    expect(presentation.announcement.label).toBe('Estado de arranque de Raven');
    expect(presentation.steps[0]?.label).toBe('Hidratando la aplicacion');
    expect(presentation.progress.kicker).toBe('Preparacion de arranque');
    expect(presentation.progress.listLabel).toBe('Comprobaciones de preparacion de arranque');
    expect(presentation.progress.label).toBe('0/5 comprobaciones de arranque resueltas');
    expect(resolveBootstrapStepDetail('route', 'error', spanishCopy)).toBe(
      'Preparando ruta inicial fallo durante el arranque.'
    );
  });
});
