/** Owned concern: show the security directory or its URL-selected section in the route workbench.
 * Opening the directory must not mount a section's data subscriptions.
 */
import { ChevronRight } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { AdminAuditTab } from './admin/AdminAuditTab';
import { AdminPermissionsTab } from './admin/AdminPermissionsTab';
import { AdminPlatformTab } from './admin/AdminPlatformTab';
import { AdminRolesTab } from './admin/AdminRolesTab';
import { adminNavigationCopy, type AdminNavigationCopy } from './admin/copy';
import { useAdminViewData } from './admin/useAdminViewData';
import {
  adminSectionNavigation,
  buildAdminSectionLocation,
  resolveActiveAdminTab,
  type AdminTabId,
} from './admin/adminRoutePosition';
import styles from './AdminView.module.css';

function AdminSectionContent({ activeTab }: Readonly<{ activeTab: AdminTabId }>) {
  const { searchQuery, setSearchQuery, health, capabilities, roles, filteredAuditLog } =
    useAdminViewData();
  switch (activeTab) {
    case 'platform':
      return (
        <AdminPlatformTab
          health={health}
          capabilitiesData={capabilities.data}
          capabilitiesLoading={capabilities.isLoading}
          capabilitiesError={Boolean(capabilities.error)}
        />
      );
    case 'roles':
      return <AdminRolesTab roles={roles} />;
    case 'permissions':
      return <AdminPermissionsTab roles={roles} />;
    case 'audit':
      return (
        <AdminAuditTab
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          entries={filteredAuditLog}
        />
      );
  }
}

function AdminSecurityNavigation({ copy }: Readonly<{ copy: AdminNavigationCopy }>) {
  const location = useLocation();
  return (
    <nav
      className={styles.directory}
      aria-labelledby="admin-security-heading"
      data-slot="admin-section-navigation"
    >
      <h2 id="admin-security-heading" className={styles.heading}>
        {copy.title}
      </h2>
      <ul className={styles.links}>
        {adminSectionNavigation.map(({ id, icon: Icon }) => (
          <li key={id}>
            <Button variant="outline" size="sm" className={styles.destination} asChild>
              <Link to={buildAdminSectionLocation(id, location)}>
                <Icon className={styles.icon} aria-hidden="true" />
                {copy.tabs[id]}
                <ChevronRight className={styles.chevron} aria-hidden="true" />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function AdminView() {
  const [searchParams] = useSearchParams();
  const activeTab = resolveActiveAdminTab(searchParams);
  const copy = useApplicationLanguageStore((state) => adminNavigationCopy[state.language]);
  return (
    <RouteWorkbenchFrame
      bodyContainerClassName={styles.surface}
      slots={{
        primarySurface:
          activeTab == null ? (
            <AdminSecurityNavigation copy={copy} />
          ) : (
            <section
              className={styles.section}
              data-slot="admin-section"
              data-section={activeTab}
              aria-label={copy.tabs[activeTab]}
            >
              <AdminSectionContent activeTab={activeTab} />
            </section>
          ),
      }}
    />
  );
}
