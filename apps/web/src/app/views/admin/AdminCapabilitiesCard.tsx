/** Present exact capability facts independently from endpoint observation status. */
import { Radio } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { adminViewCopy as copy } from './copy';
import { getCapabilitiesEmptyState } from './adminViewModel';
import { AdminStatusBadge } from './AdminStatusBadge';
import type { AdminPlatformTabProps } from './platformTypes';
import styles from './AdminPlatform.module.css';

type CapabilitiesProps = Pick<
  AdminPlatformTabProps,
  'capabilitiesData' | 'capabilitiesLoading' | 'capabilitiesError'
>;

export function AdminCapabilitiesCard({
  capabilitiesData,
  capabilitiesLoading,
  capabilitiesError,
}: Readonly<CapabilitiesProps>) {
  return (
    <Card className={styles.card}>
      <div className={styles.sectionHeading}>
        <Radio aria-hidden="true" className={styles.sectionIcon} />
        <div>
          <h3 className={styles.title}>{copy.sections.capabilitiesTitle}</h3>
          <p className={styles.subtitle}>{copy.sections.capabilitiesSubtitle}</p>
        </div>
      </div>
      {capabilitiesData != null && capabilitiesError ? (
        <p className={styles.warning} role="status">
          {copy.states.capabilitiesStale}
        </p>
      ) : null}
      <div className={styles.inset}>
        <div className={styles.label}>{copy.labels.frontendCompatibility}</div>
        <div className={styles.compatibility}>
          <Badge variant="outline">
            apiVersion: {capabilitiesData?.apiVersion ?? copy.states.notObserved}
          </Badge>
          <Badge variant="outline">
            minFrontendVersion: {capabilitiesData?.minFrontendVersion ?? copy.states.notObserved}
          </Badge>
        </div>
      </div>
      <div className={styles.inset}>
        <div className={styles.label}>{copy.labels.pluginAvailability}</div>
        <div className={styles.pluginList}>
          {capabilitiesData ? (
            Object.entries(capabilitiesData.plugins).map(([pluginId, info]) => (
              <div
                key={pluginId}
                className={styles.plugin}
                data-slot="admin-plugin-capability"
                data-plugin-id={pluginId}
              >
                <span className={styles.pluginId}>{pluginId}</span>
                {info.reason ? <span className={styles.probeDetail}>{info.reason}</span> : null}
                <AdminStatusBadge
                  tone={info.available ? 'success' : 'warning'}
                  label={info.available ? 'available' : 'blocked'}
                />
              </div>
            ))
          ) : (
            <p className={styles.subtitle}>
              {getCapabilitiesEmptyState(capabilitiesLoading, capabilitiesError)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
