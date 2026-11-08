/** Present the same observed health facts used by endpoint details. */
import { Activity, Database, Link2, Radio } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { adminViewCopy as copy } from './copy';
import type { AdminPlatformTabProps } from './platformTypes';
import styles from './AdminPlatform.module.css';

export function AdminPlatformSummaryCards({
  health,
}: Readonly<Pick<AdminPlatformTabProps, 'health'>>) {
  const summaries = [
    { id: 'backend', label: copy.labels.backendStatus, icon: Activity, ...health.backend },
    { id: 'version', label: copy.labels.version, icon: Radio, ...health.probes.version },
    { id: 'readyz', label: copy.labels.readiness, icon: Link2, ...health.probes.readyz },
    {
      id: 'dbReady',
      label: copy.labels.databaseReadiness,
      icon: Database,
      ...health.probes.dbReady,
    },
  ];
  return (
    <div className={styles.summaryGrid}>
      {summaries.map(({ id, label, icon: Icon, status, tone, detail }) => (
        <Card
          key={id}
          className={styles.card}
          data-slot="admin-health-summary"
          data-probe={id}
          data-tone={tone}
        >
          <div className={styles.cardHeading}>
            <div className={styles.summaryContent}>
              <div className={styles.label}>{label}</div>
              <div className={styles.value} data-slot="admin-health-status">
                {status}
              </div>
            </div>
            <Icon aria-hidden="true" className={cn(styles.icon, styles[tone])} />
          </div>
          <p className={styles.detail}>{detail}</p>
        </Card>
      ))}
    </div>
  );
}
