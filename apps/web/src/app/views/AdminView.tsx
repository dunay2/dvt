/** Owned concern: render the selected passive Admin section from its durable URL contract. */
import { useSearchParams } from 'react-router';
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { AdminAuditTab } from './admin/AdminAuditTab';
import { AdminPermissionsTab } from './admin/AdminPermissionsTab';
import { AdminPlatformTab } from './admin/AdminPlatformTab';
import { AdminRolesTab } from './admin/AdminRolesTab';
import { adminViewCopy as copy } from './admin/copy';
import { useAdminViewData } from './admin/useAdminViewData';
import { resolveActiveAdminTab, type AdminTabId } from './admin/adminRoutePosition';
import styles from './AdminView.module.css';

export default function AdminView({
  initialTab = 'platform',
}: Readonly<{ initialTab?: AdminTabId }> = {}) {
  const [searchParams] = useSearchParams();
  const { searchQuery, setSearchQuery, health, capabilities, roles, filteredAuditLog } =
    useAdminViewData();
  const activeTab = resolveActiveAdminTab(searchParams, initialTab);
  const content =
    activeTab === 'platform' ? (
      <AdminPlatformTab
        health={health}
        capabilitiesData={capabilities.data}
        capabilitiesLoading={capabilities.isLoading}
        capabilitiesError={Boolean(capabilities.error)}
      />
    ) : activeTab === 'roles' ? (
      <AdminRolesTab roles={roles} />
    ) : activeTab === 'permissions' ? (
      <AdminPermissionsTab roles={roles} />
    ) : (
      <AdminAuditTab
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        entries={filteredAuditLog}
      />
    );
  return (
    <RouteWorkbenchFrame
      bodyContainerClassName={styles.surface}
      slots={{
        primarySurface: (
          <section
            className={styles.section}
            data-slot="admin-section"
            data-section={activeTab}
            aria-label={copy.tabs[activeTab]}
          >
            {content}
          </section>
        ),
      }}
    />
  );
}
