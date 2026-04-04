import { FileText, Server, Shield, Users } from 'lucide-react';
import { ViewHeader } from '../components/domain';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
    <div className="flex h-full flex-col bg-slate-950">
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <ViewHeader
          className="border-0 bg-transparent px-0 py-0"
          title={copy.title}
          icon={<Shield className="size-6 text-red-400" />}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue={initialTab} className="mx-auto max-w-6xl">
            <TabsList className="border border-slate-700 bg-slate-900">
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
        </div>
      </ScrollArea>
    </div>
  );
}
