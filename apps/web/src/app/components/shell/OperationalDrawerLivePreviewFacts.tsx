/** Present server-owned LIVE facts. This view neither admits nor starts a query. */
import type { SourceDataSampleResponse } from '@dvt/contracts';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

export function OperationalDrawerLivePreviewFacts({
  provenance,
  copy,
}: Readonly<{
  provenance: SourceDataSampleResponse['provenance'];
  copy: Pick<
    OperationalDrawerContribution['copy'],
    'dataQueriedAtLabel' | 'dataBoundedLiveTemplate'
  >;
}>): JSX.Element {
  const provider = provenance.sourceRefs[0]?.connectionRef.provider;
  return (
    <div
      data-slot="source-live-preview-facts"
      className="mb-3 space-y-2 text-xs text-(--text-muted)"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-semibold text-cyan-400">
          LIVE
        </span>
        <span>{provider === 'postgres' ? 'PostgreSQL' : provider}</span>
        <span>
          {copy.dataQueriedAtLabel}{' '}
          <time dateTime={provenance.queriedAt}>
            {provenance.queriedAt.replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC')}
          </time>
        </span>
      </div>
      {provenance.navigation === 'bounded-first-page' ? (
        <p>{copy.dataBoundedLiveTemplate.replace('{limit}', String(provenance.limit))}</p>
      ) : null}
    </div>
  );
}
