import { AdminCapabilitiesCard } from './AdminCapabilitiesCard';
import { AdminPlatformSummaryCards } from './AdminPlatformSummaryCards';
import { AdminProbeDetailsCard } from './AdminProbeDetailsCard';
import type { AdminPlatformTabProps } from './platformTypes';

export function AdminPlatformTab({
  connectionStatus,
  platformHealthSnapshot,
  capabilitiesData,
  capabilitiesLoading,
  capabilitiesError,
}: Readonly<AdminPlatformTabProps>) {
  return (
    <div className="mt-6 space-y-6">
      <AdminPlatformSummaryCards
        connectionStatus={connectionStatus}
        platformHealthSnapshot={platformHealthSnapshot}
        capabilitiesData={capabilitiesData}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminProbeDetailsCard platformHealthSnapshot={platformHealthSnapshot} />
        <AdminCapabilitiesCard
          capabilitiesData={capabilitiesData}
          capabilitiesLoading={capabilitiesLoading}
          capabilitiesError={capabilitiesError}
        />
      </div>
    </div>
  );
}

