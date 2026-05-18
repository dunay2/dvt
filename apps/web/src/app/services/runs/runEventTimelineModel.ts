/**
 * Owned concern: normalize, merge, and pace run event chronology before
 * console or Runs workspace presentation renders it.
 */
import type { UiRunStatus, RunEventTimelinePage } from '../../ports/runs';
import type { RunEvent } from '../../types/engine';

export const RUN_EVENT_LIVE_POLL_INTERVAL_MS = 2_000;

export type RunEventTimelineModel = {
  readonly events: RunEvent[];
  readonly nextAfterSeq?: number;
};

function compareRunEvents(left: RunEvent, right: RunEvent): number {
  const runSeqDelta = left.runSeq - right.runSeq;
  if (runSeqDelta !== 0) {
    return runSeqDelta;
  }

  const emittedAtDelta = Date.parse(left.emittedAt) - Date.parse(right.emittedAt);
  if (Number.isFinite(emittedAtDelta) && emittedAtDelta !== 0) {
    return emittedAtDelta;
  }

  return left.eventId.localeCompare(right.eventId);
}

function dedupeAndSortRunEvents(events: readonly RunEvent[]): RunEvent[] {
  const byEventId = new Map<string, RunEvent>();

  for (const event of events) {
    if (!byEventId.has(event.eventId)) {
      byEventId.set(event.eventId, event);
    }
  }

  return [...byEventId.values()].sort(compareRunEvents);
}

function deriveNextAfterSeq(
  events: readonly RunEvent[],
  explicitNextAfterSeq: number | undefined
): number | undefined {
  if (explicitNextAfterSeq !== undefined) {
    return explicitNextAfterSeq;
  }

  const highestRunSeq = events.reduce<number | undefined>((highest, event) => {
    if (highest === undefined || event.runSeq > highest) {
      return event.runSeq;
    }

    return highest;
  }, undefined);

  return highestRunSeq;
}

export function isRunEventStreamLiveStatus(status: UiRunStatus | undefined): boolean {
  return status === 'pending' || status === 'running';
}

export function normalizeRunEventTimelinePage(page: RunEventTimelinePage): RunEventTimelineModel {
  const events = dedupeAndSortRunEvents(page.events);

  return {
    events,
    nextAfterSeq: deriveNextAfterSeq(events, page.nextAfterSeq),
  };
}

export function mergeRunEventTimelinePage(
  current: RunEventTimelineModel,
  page: RunEventTimelinePage
): RunEventTimelineModel {
  const nextEvents = dedupeAndSortRunEvents([...current.events, ...page.events]);

  return {
    events: nextEvents,
    nextAfterSeq: deriveNextAfterSeq(nextEvents, page.nextAfterSeq ?? current.nextAfterSeq),
  };
}
