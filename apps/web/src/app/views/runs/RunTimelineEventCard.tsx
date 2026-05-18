/**
 * Owned concern: render one structured run timeline event from shared event
 * presentation semantics without owning event fetching or snapshot truth.
 */
import { Badge } from '../../components/ui/badge';
import { resolveRunEventHeadline } from '../../services/runs/runEventPresentationCopy';
import { buildRunEventPresentationModel } from '../../services/runs/runEventPresentationModel';
import type { RunEvent } from '../../types/engine';
import { runStatesCopy as copy } from './runStatesCopy';

type RunTimelineEventCardProps = {
  event: RunEvent;
};

export function RunTimelineEventCard({ event }: RunTimelineEventCardProps) {
  const presentation = buildRunEventPresentationModel(event);
  const headline = resolveRunEventHeadline(presentation.headlineKey, presentation.fallbackHeadline);

  return (
    <div className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{event.eventType}</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {presentation.level}
          </Badge>
        </div>
        <span className="text-slate-400">{new Date(event.emittedAt).toLocaleString()}</span>
      </div>
      <div className="mt-1">{headline}</div>
      {presentation.detail ? (
        <div className="mt-1 text-slate-300">{presentation.detail}</div>
      ) : null}
      {presentation.stepId ? (
        <div className="mt-1 text-slate-400">
          {copy.stepLabel} {presentation.stepId}
        </div>
      ) : null}
    </div>
  );
}
