/**
 * Owned concern: derive dense run event table rows from shared timeline
 * presentation semantics without owning event fetching or snapshot truth.
 */
import {
  buildRunEventPresentationModel,
  type RunEventLevel,
} from '../../services/runs/runEventPresentationModel';
import { resolveRunEventHeadline } from '../../services/runs/runEventPresentationCopy';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import type { RunEvent } from '../../types/engine';

export type RunEventTableRow = {
  readonly eventId: string;
  readonly eventType: string;
  readonly runSeq: number;
  readonly emittedAt: string;
  readonly emittedAtLabel: string;
  readonly level: RunEventLevel;
  readonly headline: string;
  readonly detail: string | null;
  readonly stepId: string | null;
};

export function buildRunEventTableRows(
  events: readonly RunEvent[],
  language: ApplicationLanguage = 'en'
): RunEventTableRow[] {
  return events.map((event) => {
    const presentation = buildRunEventPresentationModel(event);

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      runSeq: event.runSeq,
      emittedAt: event.emittedAt,
      emittedAtLabel: new Date(event.emittedAt).toLocaleString(
        language === 'es' ? 'es-ES' : 'en-US'
      ),
      level: presentation.level,
      headline: resolveRunEventHeadline(
        presentation.headlineKey,
        presentation.fallbackHeadline,
        language
      ),
      detail: presentation.detail,
      stepId: presentation.stepId,
    };
  });
}
