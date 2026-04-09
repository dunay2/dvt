import { AlertTriangle, Edit, Minus, Plus } from 'lucide-react';

import { StatCard } from '../../components/domain';
import type { DiffSummary } from './diffViewModel';
import { diffViewCopy as copy } from './copy';

interface DiffSummaryCardsProps {
  summary: DiffSummary;
}

export function DiffSummaryCards({ summary }: DiffSummaryCardsProps) {
  return (
    <div className="border-b border-slate-700 p-6">
      <div className="grid max-w-4xl grid-cols-4 gap-4">
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
