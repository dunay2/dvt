/** Compose Admin operational diagnostics from one observed presentation model. */
import { AdminCapabilitiesCard } from './AdminCapabilitiesCard';
import { AdminPlatformSummaryCards } from './AdminPlatformSummaryCards';
import { AdminProbeDetailsCard } from './AdminProbeDetailsCard';
import type { AdminPlatformTabProps } from './platformTypes';
import styles from './AdminPlatform.module.css';

export function AdminPlatformTab({
  health,
  capabilitiesData,
  capabilitiesLoading,
  capabilitiesError,
}: Readonly<AdminPlatformTabProps>) {
  return (
    <div className={styles.layout}>
      <AdminPlatformSummaryCards health={health} />
      <div className={styles.detailsGrid}>
        <AdminProbeDetailsCard health={health} />
        <AdminCapabilitiesCard
          capabilitiesData={capabilitiesData}
          capabilitiesLoading={capabilitiesLoading}
          capabilitiesError={capabilitiesError}
        />
      </div>
    </div>
  );
}
