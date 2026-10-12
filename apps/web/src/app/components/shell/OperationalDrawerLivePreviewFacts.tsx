/**
 * Owned concern: present server-owned LIVE sample provenance and query limits.
 * @baseline GH-3577-COMPACT-DATA-GRID: loaded samples retain their authoritative context.
 * @decision Keep facts in a passive view with shared copy and stylesheet.
 * @consequence This view neither admits nor starts a query.
 * @version 1.0.0
 */
import type { DataPreviewProvenance } from '@dvt/contracts';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';
import styles from './OperationalDrawerLivePreviewFacts.module.css';

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
    <div data-slot="live-preview-facts" className={styles.facts}>
      <div className={styles.summary}>
        <span className={styles.live}>LIVE</span>
        <details>
          <summary>{providers.join(' · ')}</summary>
          <ul className={styles.sources}>
            {provenance.sourceRefs.map((ref) => (
              <li key={JSON.stringify(ref)}>
                {ref.sourceObjectId}{' '}
                <span className={styles.connection}>({ref.connectionRef.connectionId})</span>
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
