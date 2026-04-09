import { AlertTriangle, Edit, Minus, Plus } from 'lucide-react';

import { StatCard } from '../../components/domain';
import { cn } from '../../components/ui/utils';
import type { DiffSummary } from './diffViewModel';
import { diffViewCopy as copy } from './copy';

interface DiffSummaryCardsProps {
  summary: DiffSummary;
  className?: string;
}

export function DiffSummaryCards({ summary, className }: DiffSummaryCardsProps) {
  return (
    <div
      data-slot="diff-summary-cards"
      className={cn(
        'border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-6 py-4',
        className
      )}
    >
      <div className="mx-auto grid max-w-5xl grid-cols-4 gap-4">
        <StatCard
          icon={<Plus className="size-5" />}
          value={summary.added}
          label={copy.summary.added}
          tone="success"
        />
        <StatCard
          icon={<Minus className="size-5" />}
          value={summary.removed}
          label={copy.summary.removed}
          tone="danger"
        />
        <StatCard
          icon={<Edit className="size-5" />}
          value={summary.changed}
          label={copy.summary.changed}
          tone="info"
        />
        <StatCard
          icon={<AlertTriangle className="size-5" />}
          value={summary.breaking}
          label={copy.summary.breaking}
          tone="warning"
        />
      </div>
    </div>
  );
}
