/**
 * Owned concern: render ObservePlanRunReadiness as visible Canvas execution UX.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import type { PlanRunReadinessBlocker, PlanRunReadinessReadModel } from './canvasPlanReadiness';

type PlanRunReadinessPanelProps = {
  readonly readiness: PlanRunReadinessReadModel;
  readonly density?: 'compact' | 'full';
};

const blockerLabels: Record<PlanRunReadinessBlocker, string> = {
  adapter_degraded: 'Adapter degraded',
  authorization_denied: 'Authorization denied',
  backpressure: 'Backpressure',
  capability_mismatch: 'Capability mismatch',
  plan_integrity: 'Execution Preview integrity',
};

export function PlanRunReadinessPanel({
  readiness,
  density = 'full',
}: PlanRunReadinessPanelProps): JSX.Element {
  const ready = readiness.status === 'ready';
  const StatusIcon = ready ? CheckCircle2 : AlertTriangle;

  return (
    <section
      aria-label="Execution readiness"
      aria-live="polite"
      data-slot="plan-run-readiness-panel"
      data-status={readiness.status}
      className={cn(
        'min-w-0 rounded-md border px-3 py-2 text-xs',
        ready
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-50',
        density === 'compact' ? 'max-w-[28rem]' : 'w-full'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <StatusIcon
          className={cn('size-4 shrink-0', ready ? 'text-emerald-300' : 'text-amber-300')}
        />
        <span className="font-semibold">Execution readiness</span>
        <Badge
          data-slot="plan-run-readiness-status"
          variant="outline"
          className={cn(
            'ml-auto shrink-0 border-current px-2 py-0 text-[0.68rem] uppercase tracking-normal',
            ready ? 'text-emerald-100' : 'text-amber-100'
          )}
        >
          {ready ? 'Ready' : 'Blocked'}
        </Badge>
      </div>

      <p
        data-slot="plan-run-readiness-summary"
        className="mt-1 line-clamp-2 min-w-0 text-[0.72rem] leading-5 text-[color:var(--text-secondary)]"
        title={readiness.summary}
      >
        {readiness.summary}
      </p>

      <ul data-slot="plan-run-readiness-blockers" className="mt-2 flex min-w-0 flex-wrap gap-1.5">
        {readiness.blockers.length === 0 ? (
          <li
            data-slot="plan-run-readiness-no-blockers"
            className="rounded border border-emerald-500/30 px-2 py-0.5 text-[0.68rem] text-emerald-100"
          >
            No blockers
          </li>
        ) : (
          readiness.blockers.map((blocker) => (
            <li key={blocker}>
              <Badge
                data-slot="plan-run-readiness-blocker"
                data-blocker={blocker}
                variant="outline"
                className="gap-1 border-amber-400/40 px-2 py-0 text-[0.68rem] text-amber-50"
              >
                <span>{blockerLabels[blocker]}</span>
                <code className="font-mono text-[0.64rem] text-amber-100/80">{blocker}</code>
              </Badge>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
