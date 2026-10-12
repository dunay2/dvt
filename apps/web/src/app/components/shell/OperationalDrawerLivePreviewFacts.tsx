/**
 * Owned concern: present server-owned LIVE sample provenance and query limits.
 * @baseline GH-3577-COMPACT-DATA-GRID: loaded samples retain their authoritative context.
 * @decision Keep facts in a passive view with shared copy and stylesheet.
 * @consequence This view neither admits nor starts a query.
 * @version 1.0.0
 */
import type { DataPreviewProvenance } from '@dvt/contracts';
import { Clock, Info } from 'lucide-react';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';
import styles from './OperationalDrawerLivePreviewFacts.module.css';

export function OperationalDrawerLivePreviewFacts({
  provenance,
  copy,
  nodeName,
  notice,
}: Readonly<{
  provenance: Extract<DataPreviewProvenance, { mode: 'live' }>;
  nodeName?: string;
  notice?: string;
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
        {nodeName == null ? null : (
          <span className={styles.name} title={nodeName}>
            {nodeName}
          </span>
        )}
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
        <span
          className={styles.time}
          tabIndex={0}
          title={`${copy.dataQueriedAtLabel} ${provenance.queriedAt}`}
          aria-label={`${copy.dataQueriedAtLabel} ${provenance.queriedAt}`}
        >
          <Clock aria-hidden="true" />
          <time className={styles.srOnly} dateTime={provenance.queriedAt}>
            {provenance.queriedAt.replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC')}
          </time>
        </span>
        {provenance.navigation === 'bounded-first-page' ? (
          <details className={styles.limits}>
            <summary
              title={copy.dataBoundedLiveTemplate.replace('{limit}', String(provenance.limit))}
              aria-label={copy.dataBoundedLiveTemplate.replace('{limit}', String(provenance.limit))}
            >
              <Info aria-hidden="true" />
            </summary>
            <div className={styles.sources}>
              <p>{copy.dataBoundedLiveTemplate.replace('{limit}', String(provenance.limit))}</p>
              {notice == null ? null : <p>{notice}</p>}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
