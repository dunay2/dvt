import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Link2,
  Radio,
  Search,
  Server,
  Shield,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  selectPlatformConnectionState,
  type PlatformConnectionState,
  type PlatformHealthSnapshot,
  usePlatformHealthSnapshotQuery,
} from '../../capabilities/platform-health';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';
import { resolveDataSource } from '../services/config/dataSource';
import { createWorkspaceService } from '../services/workspace/workspaceService';

const workspaceService = createWorkspaceService(resolveDataSource());

function getBackendStatusLabel(restStatus: PlatformConnectionState['rest']): string {
  switch (restStatus) {
    case 'ok':
      return 'Online';
    case 'degraded':
      return 'Degraded';
    default:
      return 'Offline';
  }
}

function getReadyzSummary(snapshot: PlatformHealthSnapshot | undefined): string {
  const readyzData = snapshot?.readyz.data;

  if (readyzData && 'reasonCode' in readyzData) {
    return readyzData.reasonCode;
  }

  return 'readyz endpoint healthy';
}

function getCapabilitiesEmptyState(isLoading: boolean, hasError: boolean): string {
  if (isLoading) {
    return 'Loading capabilities...';
  }

  if (hasError) {
    return 'Capabilities endpoint unavailable.';
  }

  return 'No capability data.';
}

function filterAuditEntries<TEntry extends { user: string; action: string; resource: string }>(
  auditLog: readonly TEntry[],
  searchQuery: string
): TEntry[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...auditLog];
  }

  return auditLog.filter(
    (entry) =>
      entry.user.toLowerCase().includes(normalizedQuery) ||
      entry.action.toLowerCase().includes(normalizedQuery) ||
      entry.resource.toLowerCase().includes(normalizedQuery)
  );
}

function StatusBadge({
  ok,
  label,
}: Readonly<{
  ok: boolean;
  label: string;
}>) {
  return (
    <Badge className={cn(ok ? 'bg-green-700 text-white' : 'bg-amber-700 text-white')}>
      {ok ? <CheckCircle2 className="mr-1 size-3" /> : <AlertTriangle className="mr-1 size-3" />}
      {label}
    </Badge>
  );
}

export default function AdminView() {
  const [searchQuery, setSearchQuery] = useState('');
  const platformHealth = usePlatformHealthSnapshotQuery();
  const capabilities = useCapabilitiesQuery();
  const rolesQuery = useQuery({
    queryKey: ['workspace', 'roles'],
    queryFn: () => workspaceService.getRoles(),
  });
  const auditQuery = useQuery({
    queryKey: ['workspace', 'audit'],
    queryFn: () => workspaceService.getAuditLog(),
  });
  const roles = rolesQuery.data ?? [];
  const auditLog = auditQuery.data ?? [];
  const connectionStatus = selectPlatformConnectionState(
    platformHealth.data,
    platformHealth.isError
  );
  const filteredAuditLog = filterAuditEntries(auditLog, searchQuery);

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="size-6 text-red-400" />
            <h1 className="text-xl font-semibold">Admin & RBAC</h1>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="platform" className="mx-auto max-w-6xl">
            <TabsList className="border border-slate-700 bg-slate-900">
              <TabsTrigger value="platform">
                <Server className="mr-2 size-4" />
                Platform
              </TabsTrigger>
              <TabsTrigger value="roles">
                <Users className="mr-2 size-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="permissions">
                <Shield className="mr-2 size-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="audit">
                <FileText className="mr-2 size-4" />
                Audit Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="platform" className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-slate-700 bg-slate-900 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Backend status
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {getBackendStatusLabel(connectionStatus.rest)}
                      </div>
                    </div>
                    <Activity
                      className={cn(
                        'size-5',
                        connectionStatus.rest === 'ok' && 'text-green-400',
                        connectionStatus.rest === 'degraded' && 'text-amber-400',
                        connectionStatus.rest === 'offline' && 'text-red-400'
                      )}
                    />
                  </div>
                  <div className="mt-4 text-sm text-slate-400">
                    REST: {connectionStatus.rest} - events: {connectionStatus.liveEvents}
                  </div>
                </Card>

                <Card className="border-slate-700 bg-slate-900 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">Version</div>
                      <div className="mt-2 text-lg font-semibold">
                        {platformHealth.data?.version.data?.version ?? 'unknown'}
                      </div>
                    </div>
                    <Radio className="size-5 text-cyan-400" />
                  </div>
                  <div className="mt-4 text-sm text-slate-400">
                    {platformHealth.data?.version.data?.name ?? 'backend'} - API{' '}
                    {capabilities.data?.apiVersion ?? 'n/a'}
                  </div>
                </Card>

                <Card className="border-slate-700 bg-slate-900 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Readiness
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {platformHealth.data?.readyz.data?.status ?? 'unavailable'}
                      </div>
                    </div>
                    <Link2 className="size-5 text-violet-400" />
                  </div>
                  <div className="mt-4 text-sm text-slate-400">
                    {getReadyzSummary(platformHealth.data)}
                  </div>
                </Card>

                <Card className="border-slate-700 bg-slate-900 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Data source mode
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {platformHealth.data?.dataSourceMode ?? 'unknown'}
                      </div>
                    </div>
                    <Database className="size-5 text-emerald-400" />
                  </div>
                  <div className="mt-4 text-sm text-slate-400">
                    API base: {platformHealth.data?.apiBaseUrl ?? 'not resolved'}
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-slate-700 bg-slate-900 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Server className="size-5 text-blue-400" />
                    <div>
                      <h3 className="font-semibold">Backend probe details</h3>
                      <p className="text-sm text-slate-400">
                        What is up, what responded, and which base URL the shell is using.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">/healthz</span>
                        <StatusBadge
                          ok={platformHealth.data?.healthz.data.status === 'healthy'}
                          label={platformHealth.data?.healthz.data.status ?? 'offline'}
                        />
                      </div>
                      <div className="text-xs text-slate-400">
                        intent reconciler:{' '}
                        {platformHealth.data?.healthz.data.components.intentReconciler.status ??
                          'n/a'}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        HTTP {platformHealth.data?.healthz.statusCode ?? 'n/a'} -{' '}
                        {platformHealth.data?.healthz.latencyMs ?? 'n/a'} ms
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">/readyz</span>
                        <StatusBadge
                          ok={platformHealth.data?.readyz.data?.ok === true}
                          label={platformHealth.data?.readyz.data?.status ?? 'unavailable'}
                        />
                      </div>
                      <div className="text-xs text-slate-400">
                        {platformHealth.data?.readyz.availability === 'available'
                          ? (platformHealth.data?.readyz.error?.message ?? 'endpoint responded')
                          : 'endpoint not enabled'}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        HTTP {platformHealth.data?.readyz.statusCode ?? 'n/a'} -{' '}
                        {platformHealth.data?.readyz.latencyMs ?? 'n/a'} ms
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">/version</span>
                        <StatusBadge
                          ok={platformHealth.data?.version.availability === 'available'}
                          label={platformHealth.data?.version.statusCode?.toString() ?? 'n/a'}
                        />
                      </div>
                      <div className="font-mono text-xs text-slate-400">
                        {platformHealth.data?.version.data
                          ? `${platformHealth.data.version.data.name}@${platformHealth.data.version.data.version}`
                          : (platformHealth.data?.version.error?.message ?? 'endpoint not enabled')}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        HTTP {platformHealth.data?.version.statusCode ?? 'n/a'} -{' '}
                        {platformHealth.data?.version.latencyMs ?? 'n/a'} ms
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">/db/ready</span>
                        <StatusBadge
                          ok={platformHealth.data?.dbReady.data?.ok === true}
                          label={platformHealth.data?.dbReady.statusCode?.toString() ?? 'n/a'}
                        />
                      </div>
                      <div className="text-xs text-slate-400">
                        {platformHealth.data?.dbReady.data?.reason ??
                          platformHealth.data?.dbReady.error?.message ??
                          'endpoint not enabled'}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        HTTP {platformHealth.data?.dbReady.statusCode ?? 'n/a'} -{' '}
                        {platformHealth.data?.dbReady.latencyMs ?? 'n/a'} ms
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          API base URL
                        </div>
                        <div className="mt-2 break-all font-mono text-sm text-slate-200">
                          {platformHealth.data?.apiBaseUrl ?? 'not resolved'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Data source mode
                        </div>
                        <div className="mt-2 text-sm text-slate-200">
                          {platformHealth.data?.dataSourceMode ?? 'unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      fetched at {platformHealth.data?.fetchedAt ?? 'n/a'}
                    </div>
                  </div>
                </Card>

                <Card className="border-slate-700 bg-slate-900 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Radio className="size-5 text-cyan-400" />
                    <div>
                      <h3 className="font-semibold">Capabilities in use</h3>
                      <p className="text-sm text-slate-400">
                        What the backend reports as available for this frontend.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Frontend compatibility
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          apiVersion: {capabilities.data?.apiVersion ?? 'n/a'}
                        </Badge>
                        <Badge variant="outline">
                          minFrontendVersion: {capabilities.data?.minFrontendVersion ?? 'n/a'}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                      <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">
                        Plugin availability
                      </div>
                      <div className="space-y-2">
                        {capabilities.data ? (
                          Object.entries(capabilities.data.plugins).map(([pluginId, info]) => (
                            <div
                              key={pluginId}
                              className="flex items-center justify-between rounded border border-slate-800 px-3 py-2"
                            >
                              <span className="font-mono text-sm text-slate-200">{pluginId}</span>
                              <div className="flex items-center gap-2">
                                {info.reason && (
                                  <span className="text-xs text-slate-500">{info.reason}</span>
                                )}
                                <StatusBadge
                                  ok={info.available}
                                  label={info.available ? 'available' : 'blocked'}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-400">
                            {getCapabilitiesEmptyState(
                              capabilities.isLoading,
                              Boolean(capabilities.error)
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="mt-6 space-y-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-300">Manage user roles and permissions</p>
                <Button variant="default">Create Role</Button>
              </div>

              {roles.map((role) => (
                <Card key={role.id} className="border-slate-700 bg-slate-900 p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-2 font-semibold">{role.name}</h3>
                      {Object.keys(role.scope).length > 0 && (
                        <div className="flex gap-2">
                          {Object.entries(role.scope).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-5 gap-3 text-sm">
                    {Object.entries(role.permissions).map(([perm, enabled]) => (
                      <div
                        key={perm}
                        className={cn(
                          'flex items-center gap-2 rounded border p-2',
                          enabled
                            ? 'border-green-800 bg-green-900/20 text-green-400'
                            : 'border-slate-700 bg-gray-900/20 text-slate-400'
                        )}
                      >
                        {enabled ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                        <span className="text-xs">
                          {perm
                            .replace('can', '')
                            .replaceAll(/([A-Z])/g, ' $1')
                            .trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="permissions" className="mt-6">
              <Card className="border-slate-700 bg-slate-900">
                <div className="p-5">
                  <h3 className="mb-4 font-semibold">Permission Matrix</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-white">Role</TableHead>
                          <TableHead className="text-center text-white">Plan</TableHead>
                          <TableHead className="text-center text-white">Run</TableHead>
                          <TableHead className="text-center text-white">Edit Edges</TableHead>
                          <TableHead className="text-center text-white">Manage Plugins</TableHead>
                          <TableHead className="text-center text-white">Manage RBAC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roles.map((role) => (
                          <TableRow key={role.id} className="border-slate-700">
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canPlan ? (
                                <CheckCircle2 className="mx-auto size-4 text-green-400" />
                              ) : (
                                <XCircle className="mx-auto size-4 text-gray-600" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canRun ? (
                                <CheckCircle2 className="mx-auto size-4 text-green-400" />
                              ) : (
                                <XCircle className="mx-auto size-4 text-gray-600" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canEditEdges ? (
                                <CheckCircle2 className="mx-auto size-4 text-green-400" />
                              ) : (
                                <XCircle className="mx-auto size-4 text-gray-600" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canManagePlugins ? (
                                <CheckCircle2 className="mx-auto size-4 text-green-400" />
                              ) : (
                                <XCircle className="mx-auto size-4 text-gray-600" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {role.permissions.canManageRBAC ? (
                                <CheckCircle2 className="mx-auto size-4 text-green-400" />
                              ) : (
                                <XCircle className="mx-auto size-4 text-gray-600" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search audit log..."
                    className="border-slate-600 bg-slate-950 pl-10"
                  />
                </div>
              </div>

              <Card className="border-slate-700 bg-slate-900">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-white">Timestamp</TableHead>
                      <TableHead className="text-white">User</TableHead>
                      <TableHead className="text-white">Action</TableHead>
                      <TableHead className="text-white">Resource</TableHead>
                      <TableHead className="text-white">Details</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLog.map((entry) => (
                      <TableRow key={entry.id} className="border-slate-700">
                        <TableCell className="font-mono text-xs text-slate-300">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{entry.user}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.resource}</TableCell>
                        <TableCell className="max-w-md truncate text-sm text-slate-300">
                          {entry.details}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              entry.status === 'success' && 'bg-green-600',
                              entry.status === 'failed' && 'bg-red-600'
                            )}
                          >
                            {entry.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
