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

export const RUN_EVENT_FEED_RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
export const RUN_EVENT_FEED_MAX_AUTOMATIC_RETRIES = RUN_EVENT_FEED_RETRY_DELAYS_MS.length;
export const RUN_EVENT_FEED_STALE_AFTER_MS = 10_000;
export const RUN_EVENT_FEED_MAX_TERMINAL_DRAIN_PAGES = 3;

export type RunEventFeedTerminalEventType = 'RunCancelled' | 'RunCompleted' | 'RunFailed';

export type RunEventFeedFailureKind =
  | 'authorization'
  | 'invariant'
  | 'missing-run'
  | 'terminal-drain-incomplete'
  | 'transport'
  | 'validation';

export type RunEventFeedFailure = {
  readonly kind: RunEventFeedFailureKind;
  readonly message: string;
  readonly retryable: boolean;
  readonly statusCode?: number;
};

type RunEventFeedSnapshot = {
  readonly runId: string;
  readonly events: readonly RunEvent[];
  readonly startedAt?: string;
  readonly nextAfterSeq?: number;
  readonly latestObservedSeq?: number;
  readonly lastSuccessfulFetchAt?: string;
  readonly consecutiveFailures: number;
  readonly nextRetryAt?: string;
  readonly failure?: RunEventFeedFailure;
  readonly expectedTerminalEventType?: RunEventFeedTerminalEventType;
  readonly terminalDrainPages?: number;
};

type RunBoundFeedPhase = Exclude<RunEventFeedPhase, 'idle'>;

export type RunEventFeedState =
  { readonly phase: 'idle' } | (RunEventFeedSnapshot & { readonly phase: RunBoundFeedPhase });

export type RunEventFeedTransition =
  | { readonly type: 'start'; readonly runId: string; readonly observedAt: string }
  | {
      readonly type: 'page-received';
      readonly runId: string;
      readonly page: RunEventTimelinePage;
      readonly observedAt: string;
    }
  | {
      readonly type: 'transient-failure';
      readonly runId: string;
      readonly observedAt: string;
      readonly failure: RunEventFeedFailure;
    }
  | {
      readonly type: 'terminal-observed';
      readonly runId: string;
      readonly expectedEventType: RunEventFeedTerminalEventType;
    }
  | { readonly type: 'retry-requested'; readonly runId: string }
  | {
      readonly type: 'non-retryable-failure';
      readonly runId: string;
      readonly failure: RunEventFeedFailure;
    }
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

function initialLoadingState(runId: string, observedAt: string): RunEventFeedState {
  return {
    phase: 'initial-loading',
    runId,
    events: [],
    startedAt: observedAt,
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
  const { failure: _failure, nextRetryAt: _nextRetryAt, ...retainedState } = state;
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
    ...retainedState,
    events: timeline.events,
    ...(nextAfterSeq === undefined ? {} : { nextAfterSeq }),
    ...(latestSeq === undefined ? {} : { latestObservedSeq: latestSeq }),
    lastSuccessfulFetchAt: observedAt,
    consecutiveFailures: 0,
  };
}

function retryDelayMs(consecutiveFailures: number): number | undefined {
  return RUN_EVENT_FEED_RETRY_DELAYS_MS[consecutiveFailures - 1];
}

function addMilliseconds(isoTimestamp: string, milliseconds: number): string {
  return new Date(Date.parse(isoTimestamp) + milliseconds).toISOString();
}

function isProjectionStale(state: RunEventFeedSnapshot, observedAt: string): boolean {
  const freshnessAnchor = state.lastSuccessfulFetchAt ?? state.startedAt ?? observedAt;
  return Date.parse(observedAt) - Date.parse(freshnessAnchor) >= RUN_EVENT_FEED_STALE_AFTER_MS;
}

function hasExpectedTerminalEvent(state: RunEventFeedSnapshot): boolean {
  return Boolean(
    state.expectedTerminalEventType &&
    state.events.some((event) => event.eventType === state.expectedTerminalEventType)
  );
}

function withoutRetrySchedule(state: RunEventFeedSnapshot): RunEventFeedSnapshot {
  const { nextRetryAt: _nextRetryAt, ...remaining } = state;
  return remaining;
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
    return result('applied', initialLoadingState(transition.runId, transition.observedAt));
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
      if (state.phase === 'terminal-draining') {
        if (hasExpectedTerminalEvent(snapshot)) {
          return result('applied', { ...snapshot, phase: 'complete' });
        }

        const terminalDrainPages = (state.terminalDrainPages ?? 0) + 1;
        if (terminalDrainPages >= RUN_EVENT_FEED_MAX_TERMINAL_DRAIN_PAGES) {
          return result('applied', {
            ...snapshot,
            phase: 'failed',
            terminalDrainPages,
            failure: {
              kind: 'terminal-drain-incomplete',
              message: `Terminal event ${state.expectedTerminalEventType ?? 'unknown'} was not observed.`,
              retryable: true,
            },
          });
        }

        return result('applied', {
          ...snapshot,
          phase: 'terminal-draining',
          terminalDrainPages,
        });
      }

      return result('applied', {
        ...snapshot,
        phase: 'live',
      });
    }

    case 'transient-failure': {
      if (!acceptsFailure(state.phase)) {
        return result('rejected-invalid-transition', state);
      }
      const consecutiveFailures = state.consecutiveFailures + 1;
      const delayMs = retryDelayMs(consecutiveFailures);
      const nextRetryAt =
        delayMs === undefined ? undefined : addMilliseconds(transition.observedAt, delayMs);

      if (state.phase === 'terminal-draining' && nextRetryAt === undefined) {
        return result('applied', {
          ...withoutRetrySchedule(state),
          phase: 'failed',
          consecutiveFailures,
          failure: transition.failure,
        });
      }

      if (nextRetryAt === undefined) {
        return result('applied', {
          ...withoutRetrySchedule(state),
          phase: state.events.length > 0 ? 'stale' : 'failed',
          consecutiveFailures,
          failure: transition.failure,
        });
      }

      const phase =
        state.phase === 'stale' || isProjectionStale(state, transition.observedAt)
          ? 'stale'
          : state.phase === 'terminal-draining'
            ? 'terminal-draining'
            : 'retrying';
      return result('applied', {
        ...withoutRetrySchedule(state),
        phase,
        consecutiveFailures,
        nextRetryAt,
        failure: transition.failure,
      });
    }

    case 'terminal-observed':
      if (!acceptsFailure(state.phase)) {
        return result('rejected-invalid-transition', state);
      }
      const terminalState = {
        ...state,
        expectedTerminalEventType: transition.expectedEventType,
        terminalDrainPages: state.terminalDrainPages ?? 0,
      };
      return result('applied', {
        ...terminalState,
        phase: hasExpectedTerminalEvent(terminalState) ? 'complete' : 'terminal-draining',
      });

    case 'retry-requested':
      if (!state.failure?.retryable) {
        return result('rejected-invalid-transition', state);
      }
      return result('applied', {
        ...withoutRetrySchedule(state),
        phase: state.expectedTerminalEventType ? 'terminal-draining' : 'retrying',
      });

    case 'non-retryable-failure':
      return acceptsFailure(state.phase)
        ? result('applied', {
            ...withoutRetrySchedule(state),
            phase: 'failed',
            failure: transition.failure,
          })
        : result('rejected-invalid-transition', state);
  }
}
