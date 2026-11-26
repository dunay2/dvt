/**
 * Owned concern: present the selected run's persisted result evidence.
 * Corner: current target rows require the separately scoped publication reader.
 */
import type { ReactNode } from 'react';

import { NodePropertyFacts } from '../../components/inspector/NodePropertyFacts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import type { MaterializationEvidence, RunSnapshot } from '../../ports/runs';
import { RunDvtPostgresPublicationCard } from './RunDvtPostgresPublicationCard';
import { useRunStatesCopy } from './runStatesCopy';

type RunResultPanelProps = Readonly<{
  publication: RunSnapshot['publication'];
  evidence: MaterializationEvidence | undefined;
  durationLabel: string | undefined;
  locale: string;
  publicationRows?: ReactNode;
}>;

export function RunResultPanel({
  publication,
  evidence,
  durationLabel,
  locale,
  publicationRows,
}: RunResultPanelProps) {
  const { copy } = useRunStatesCopy();
  return (
    <>
      {publication && (
        <>
          <RunDvtPostgresPublicationCard evidence={publication} locale={locale} />
          {publicationRows}
        </>
      )}
      {(evidence || !publication) && (
        <Card data-slot="run-materialization-card">
          <CardHeader>
            <CardTitle>{copy.materializationTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {evidence ? (
              <NodePropertyFacts
                rows={[
                  { label: copy.executorLabel, value: evidence.executor },
                  { label: copy.environmentLabel, value: evidence.environmentId },
                  { label: copy.sinkTableLabel, value: evidence.sinkTable },
                  {
                    label: copy.rowsWrittenLabel,
                    value: evidence.rowsWritten.toLocaleString(locale),
                  },
                  {
                    label: copy.startedLabel,
                    value: new Date(evidence.startedAt).toLocaleString(locale),
                  },
                  {
                    label: copy.completedLabel,
                    value: new Date(evidence.completedAt).toLocaleString(locale),
                  },
                  { label: copy.durationLabel, value: durationLabel },
                ]}
              />
            ) : (
              <CardDescription>{copy.noResultEvidence}</CardDescription>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
