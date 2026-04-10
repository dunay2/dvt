import { FileText, Server, Shield, Users } from 'lucide-react';
import { ViewHeader } from '../components/domain';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchPanelClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { AdminAuditTab } from './admin/AdminAuditTab';
import { AdminPermissionsTab } from './admin/AdminPermissionsTab';
import { AdminPlatformTab } from './admin/AdminPlatformTab';
import { AdminRolesTab } from './admin/AdminRolesTab';
import { adminViewCopy as copy } from './admin/copy';
import { useAdminViewData } from './admin/useAdminViewData';

type AdminTabId = 'platform' | 'roles' | 'permissions' | 'audit';

export default function AdminView({
  initialTab = 'platform',
}: Readonly<{ initialTab?: AdminTabId }> = {}) {
  const {
    searchQuery,
    setSearchQuery,
    platformHealth,
    capabilities,
    roles,
    connectionStatus,
    filteredAuditLog,
  } = useAdminViewData();

  return (
    <RouteWorkbenchFrame
      header={
        <div className={routeWorkbenchHeaderBandClassName}>
          <ViewHeader
            className="border-0 bg-transparent px-0 py-0"
            title={copy.title}
            icon={<Shield className="size-6 text-[var(--status-danger)]" />}
          />
        </div>
      }
      bodyClassName="p-6"
    >
      <Tabs defaultValue={initialTab} className="mx-auto max-w-6xl">
        <TabsList className={cn(routeWorkbenchPanelClassName, 'border')}>
          <TabsTrigger value="platform">
            <Server className="mr-2 size-4" />
            {copy.tabs.platform}
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Users className="mr-2 size-4" />
            {copy.tabs.roles}
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="mr-2 size-4" />
            {copy.tabs.permissions}
          </TabsTrigger>
          <TabsTrigger value="audit">
            <FileText className="mr-2 size-4" />
            {copy.tabs.audit}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform">
          <AdminPlatformTab
            connectionStatus={connectionStatus}
            platformHealthSnapshot={platformHealth.data}
            capabilitiesData={capabilities.data}
            capabilitiesLoading={capabilities.isLoading}
            capabilitiesError={Boolean(capabilities.error)}
          />
        </TabsContent>

        <TabsContent value="roles">
          <AdminRolesTab roles={roles} />
        </TabsContent>

        <TabsContent value="permissions">
          <AdminPermissionsTab roles={roles} />
        </TabsContent>

        <TabsContent value="audit">
          <AdminAuditTab
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            entries={filteredAuditLog}
          />
        </TabsContent>
      </Tabs>
    </RouteWorkbenchFrame>
  );
}
