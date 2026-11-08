/** Render complete endpoint observations without deriving another status policy. */
import { Server } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { adminViewCopy as copy } from './copy';
import { AdminStatusBadge } from './AdminStatusBadge';
import type { AdminPlatformTabProps } from './platformTypes';
import styles from './AdminPlatform.module.css';

export function AdminProbeDetailsCard({ health }: Readonly<Pick<AdminPlatformTabProps, 'health'>>) {
  return (
    <Card className={styles.card}>
      <div className={styles.sectionHeading}>
        <Server aria-hidden="true" className={styles.sectionIcon} />
        <div>
          <h3 className={styles.title}>{copy.sections.backendProbeTitle}</h3>
          <p className={styles.subtitle}>{copy.sections.backendProbeSubtitle}</p>
        </div>
      </div>
      <div className={styles.probeGrid}>
        {Object.values(health.probes).map((probe) => (
          <div
            key={probe.endpoint}
            className={styles.inset}
            data-slot="admin-health-probe"
            data-endpoint={probe.endpoint}
          >
            <div className={styles.probeHeading}>
              <span className={styles.endpoint}>{probe.endpoint}</span>
              <AdminStatusBadge tone={probe.tone} label={probe.status} />
            </div>
            <p className={styles.probeDetail}>{probe.detail}</p>
            <div className={styles.metadata}>
              HTTP {probe.statusCode ?? copy.states.notObserved} ·{' '}
              {probe.latencyMs == null ? copy.states.notObserved : `${probe.latencyMs} ms`}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.inset}>
        <div className={styles.label}>{copy.labels.apiBaseUrl}</div>
        <div className={styles.technicalValue}>{health.apiBaseUrl ?? copy.states.notResolved}</div>
        <div className={styles.metadata}>
          {health.fetchedAt == null ? (
            copy.states.noSnapshot
          ) : (
            <>
              {copy.labels.observedAt} <time dateTime={health.fetchedAt}>{health.fetchedAt}</time>
            </>
          )}
        </div>
        {health.refreshing ? <p className={styles.metadata}>{copy.states.refreshing}</p> : null}
      </div>
    </Card>
  );
}
