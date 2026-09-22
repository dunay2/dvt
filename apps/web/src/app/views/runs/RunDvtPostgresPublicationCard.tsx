import type { DvtPostgresPublicationEvidence } from '@dvt/contracts';

import { Card } from '../../components/ui/card';
import { useRunStatesCopy } from './runStatesCopy';

export function RunDvtPostgresPublicationCard({
  evidence,
  locale,
}: Readonly<{
  evidence: DvtPostgresPublicationEvidence;
  locale: string;
}>) {
  const { copy } = useRunStatesCopy();

  return (
    <Card
      data-slot="run-dvt-postgres-publication-card"
      className="border-slate-700 bg-slate-900 p-5"
    >
      <h3 className="mb-3 text-sm font-semibold">{copy.dvtPublicationTitle}</h3>
      <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        <div>
          <span className="text-slate-400">{copy.dvtPublicationTargetLabel}</span>
          <div data-slot="run-dvt-publication-target" className="font-mono">
            {evidence.target.schema}.{evidence.target.relation}
          </div>
        </div>
        <div>
          <span className="text-slate-400">{copy.rowsWrittenLabel}</span>
          <div>{evidence.rowsWritten.toLocaleString(locale)}</div>
        </div>
        <div>
          <span className="text-slate-400">{copy.dvtPublicationOutcomeLabel}</span>
          <div>{copy.dvtPublicationOutcomeLabels[evidence.publication.outcome]}</div>
        </div>
        <div>
          <span className="text-slate-400">{copy.completedLabel}</span>
          <div>{new Date(evidence.completedAt).toLocaleString(locale)}</div>
        </div>
        <div className="md:col-span-2">
          <span className="text-slate-400">{copy.diagnosticsPlanShaLabel}</span>
          <div data-slot="run-dvt-publication-plan-sha" className="break-all font-mono text-xs">
            {evidence.plan.sha256}
          </div>
        </div>
        <div className="md:col-span-2">
          <span className="text-slate-400">{copy.dvtPublicationTokenLabel}</span>
          <div data-slot="run-dvt-publication-token" className="break-all font-mono text-xs">
            {evidence.publication.token}
          </div>
        </div>
      </div>
    </Card>
  );
}
