/** Present server-owned LIVE facts. This view neither admits nor starts a query. */
import type { DataPreviewProvenance } from '@dvt/contracts';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

export function OperationalDrawerLivePreviewFacts({
  provenance,
  copy,
}: Readonly<{
  provenance: Extract<DataPreviewProvenance, { mode: 'live' }>;
  copy: Pick<
    OperationalDrawerContribution['copy'],
    'dataQueriedAtLabel' | 'dataBoundedLiveTemplate'
  >;
}>): JSX.Element {
  const providers = [
    ...new Set(
      provenance.sourceRefs.map(({ connectionRef }) =>
        connectionRef.provider === 'postgres' ? 'PostgreSQL' : connectionRef.provider
      )
    ),
  ];
  return (
    <div data-slot="live-preview-facts" className="mb-3 space-y-2 text-xs text-(--text-muted)">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-semibold text-cyan-400">
          LIVE
        </span>
        <details>
          <summary className="cursor-pointer">{providers.join(' · ')}</summary>
          <ul className="mt-1 space-y-1 break-all">
            {provenance.sourceRefs.map((ref) => (
              <li key={JSON.stringify(ref)}>
                {ref.sourceObjectId}{' '}
                <span className="opacity-70">({ref.connectionRef.connectionId})</span>
              </li>
            ))}
          </ul>
        </details>
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
