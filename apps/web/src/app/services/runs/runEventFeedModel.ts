/**
 * Owned concern: model one recoverable, cursor-backed run-event feed without
 * owning transport scheduling or authoritative run lifecycle state.
 */
import type { RunEventTimelinePage } from '../../ports/runs';
import type { RunEvent } from '../../types/engine';
import { mergeRunEventTimelinePage } from './runEventTimelineModel';

export type RunEventFeedPhase =
  | 'idle'
  | 'initial-loading'
  | 'live'
  | 'retrying'
  | 'stale'
  | 'terminal-draining'
  | 'complete'
  | 'failed';

type RunEventFeedSnapshot = {
  readonly runId: string;
  readonly events: readonly RunEvent[];
  readonly nextAfterSeq?: number;
  readonly latestObservedSeq?: number;
  readonly lastSuccessfulFetchAt?: string;
  readonly consecutiveFailures: number;
};

type RunBoundFeedPhase = Exclude<RunEventFeedPhase, 'idle'>;

export type RunEventFeedState =
  { readonly phase: 'idle' } | (RunEventFeedSnapshot & { readonly phase: RunBoundFeedPhase });

export type RunEventFeedTransition =
  | { readonly type: 'start'; readonly runId: string }
  | {
      readonly type: 'page-received';
      readonly runId: string;
      readonly page: RunEventTimelinePage;
      readonly observedAt: string;
    }
  | { readonly type: 'transient-failure'; readonly runId: string }
  | { readonly type: 'mark-stale'; readonly runId: string }
  | { readonly type: 'terminal-observed'; readonly runId: string }
  | {
      readonly type: 'terminal-drain-completed';
      readonly runId: string;
      readonly page: RunEventTimelinePage;
      readonly observedAt: string;
    }
  | { readonly type: 'non-retryable-failure'; readonly runId: string }
  | { readonly type: 'reset' };

export type RunEventFeedTransitionDisposition =
  | 'applied'
  | 'ignored-stale-run'
  | 'ignored-stale-page'
  | 'rejected-invalid-page'
  | 'rejected-invalid-transition';

export type RunEventFeedTransitionResult = {
  readonly disposition: RunEventFeedTransitionDisposition;
  readonly state: RunEventFeedState;
};

function initialLoadingState(runId: string): RunEventFeedState {
  return {
    phase: 'initial-loading',
    runId,
    events: [],
    consecutiveFailures: 0,
  };
}

function result(
  disposition: RunEventFeedTransitionDisposition,
  state: RunEventFeedState
): RunEventFeedTransitionResult {
  return { disposition, state };
}

function latestObservedSeq(events: readonly RunEvent[]): number | undefined {
  return events.reduce<number | undefined>((latest, event) => {
    if (latest === undefined || event.runSeq > latest) {
      return event.runSeq;
    }
    return latest;
  }, undefined);
}

function hasCursorRegression(state: RunEventFeedSnapshot, page: RunEventTimelinePage): boolean {
  return (
    state.nextAfterSeq !== undefined &&
    page.nextAfterSeq !== undefined &&
    page.nextAfterSeq < state.nextAfterSeq
  );
}

function containsForeignRunEvents(
  state: RunEventFeedSnapshot,
  page: RunEventTimelinePage
): boolean {
  return page.events.some((event) => event.runId !== state.runId);
}

function mergeSuccessfulPage(
  state: RunEventFeedSnapshot,
  page: RunEventTimelinePage,
  observedAt: string
): RunEventFeedSnapshot {
  const timeline = mergeRunEventTimelinePage(
    {
      events: [...state.events],
      ...(state.nextAfterSeq === undefined ? {} : { nextAfterSeq: state.nextAfterSeq }),
    },
    page
  );
  const latestSeq = latestObservedSeq(timeline.events);
  let nextAfterSeq = state.nextAfterSeq;
  if (
    timeline.nextAfterSeq !== undefined &&
    (nextAfterSeq === undefined || timeline.nextAfterSeq > nextAfterSeq)
  ) {
    nextAfterSeq = timeline.nextAfterSeq;
  }

  return {
    runId: state.runId,
    events: timeline.events,
    ...(nextAfterSeq === undefined ? {} : { nextAfterSeq }),
    ...(latestSeq === undefined ? {} : { latestObservedSeq: latestSeq }),
    lastSuccessfulFetchAt: observedAt,
    consecutiveFailures: 0,
  };
}

function acceptsPage(phase: RunBoundFeedPhase): boolean {
  return (
    phase === 'initial-loading' ||
    phase === 'live' ||
    phase === 'retrying' ||
    phase === 'stale' ||
    phase === 'terminal-draining'
  );
}

function acceptsFailure(phase: RunBoundFeedPhase): boolean {
  return phase !== 'complete' && phase !== 'failed';
}

export function createRunEventFeedState(): RunEventFeedState {
  return { phase: 'idle' };
}

export function transitionRunEventFeed(
  state: RunEventFeedState,
  transition: RunEventFeedTransition
): RunEventFeedTransitionResult {
  if (transition.type === 'reset') {
    return result('applied', createRunEventFeedState());
  }

  if (transition.type === 'start') {
    if (state.phase !== 'idle' && state.runId === transition.runId) {
      return result('applied', state);
    }
    return result('applied', initialLoadingState(transition.runId));
  }

  if (state.phase === 'idle') {
    return result('rejected-invalid-transition', state);
  }

  if (transition.runId !== state.runId) {
    return result('ignored-stale-run', state);
  }

  switch (transition.type) {
    case 'page-received': {
      if (!acceptsPage(state.phase)) {
        return result('rejected-invalid-transition', state);
      }
      if (containsForeignRunEvents(state, transition.page)) {
        return result('rejected-invalid-page', state);
      }
      if (hasCursorRegression(state, transition.page)) {
        return result('ignored-stale-page', state);
      }
      const snapshot = mergeSuccessfulPage(state, transition.page, transition.observedAt);
      return result('applied', {
        ...snapshot,
        phase: state.phase === 'terminal-draining' ? 'terminal-draining' : 'live',
      });
    }

    case 'transient-failure': {
      if (!acceptsFailure(state.phase)) {
        return result('rejected-invalid-transition', state);
      }
      const phase =
        state.phase === 'stale' || state.phase === 'terminal-draining' ? state.phase : 'retrying';
      return result('applied', {
        ...state,
        phase,
        consecutiveFailures: state.consecutiveFailures + 1,
      });
    }

    case 'mark-stale':
      return state.phase === 'retrying'
        ? result('applied', { ...state, phase: 'stale' })
        : result('rejected-invalid-transition', state);

    case 'terminal-observed':
      if (!acceptsFailure(state.phase)) {
        return result('rejected-invalid-transition', state);
      }
      return result(
        'applied',
        state.phase === 'terminal-draining' ? state : { ...state, phase: 'terminal-draining' }
      );

    case 'terminal-drain-completed': {
      if (state.phase !== 'terminal-draining') {
        return result('rejected-invalid-transition', state);
      }
      if (containsForeignRunEvents(state, transition.page)) {
        return result('rejected-invalid-page', state);
      }
      if (hasCursorRegression(state, transition.page)) {
        return result('ignored-stale-page', state);
      }
      return result('applied', {
        ...mergeSuccessfulPage(state, transition.page, transition.observedAt),
        phase: 'complete',
      });
    }

    case 'non-retryable-failure':
      return acceptsFailure(state.phase)
        ? result('applied', { ...state, phase: 'failed' })
        : result('rejected-invalid-transition', state);
  }
}
