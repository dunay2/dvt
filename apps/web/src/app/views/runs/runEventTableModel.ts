/**
 * Owned concern: derive dense run event table rows from shared timeline
 * presentation semantics without owning event fetching or snapshot truth.
 */
import { buildRunEventPresentationModel } from '../../services/runs/runEventPresentationModel';
import { resolveRunEventHeadline } from '../../services/runs/runEventPresentationCopy';
import type { RunEvent } from '../../types/engine';

export type RunEventTableRow = {
  readonly eventId: string;
  readonly eventType: string;
  readonly runSeq: number;
  readonly emittedAt: string;
  readonly emittedAtLabel: string;
  readonly level: string;
  readonly headline: string;
  readonly detail: string | null;
  readonly stepId: string | null;
};

export function buildRunEventTableRows(events: readonly RunEvent[]): RunEventTableRow[] {
  return events.map((event) => {
    const presentation = buildRunEventPresentationModel(event);

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      runSeq: event.runSeq,
      emittedAt: event.emittedAt,
      emittedAtLabel: new Date(event.emittedAt).toLocaleString(),
      level: presentation.level,
      headline: resolveRunEventHeadline(presentation.headlineKey, presentation.fallbackHeadline),
      detail: presentation.detail,
      stepId: presentation.stepId,
    };
  });
}
