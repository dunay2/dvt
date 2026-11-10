/** Owned concern: load admin read models through the admin read port. */
import { useMemo, useState } from 'react';
import { usePlatformHealthSnapshotQuery } from '../../../capabilities/platform-health';
import { useWorkspaceAuditQuery, useWorkspaceRolesQuery } from '../../queries/workspaceQueries';
import { useShellRuntime } from '../../shell/useShellRuntime';
import { buildAdminPlatformHealthPresentation, filterAuditEntries } from './adminViewModel';

export function useAdminViewData() {
  const [searchQuery, setSearchQuery] = useState('');
  const platformHealth = usePlatformHealthSnapshotQuery();
  const { capabilitiesQuery } = useShellRuntime();
  const rolesQuery = useWorkspaceRolesQuery();
  const auditQuery = useWorkspaceAuditQuery();
  const roles = rolesQuery.data ?? [];
  const auditLog = auditQuery.data ?? [];
  const health = buildAdminPlatformHealthPresentation({
    data: platformHealth.data,
    isError: platformHealth.isError,
    error: platformHealth.error,
    isPending: platformHealth.isPending,
    isFetching: platformHealth.isFetching,
    failureCount: platformHealth.failureCount,
    dataUpdatedAt: platformHealth.dataUpdatedAt,
    errorUpdatedAt: platformHealth.errorUpdatedAt,
  });
  const filteredAuditLog = useMemo(
    () => filterAuditEntries(auditLog, searchQuery),
    [auditLog, searchQuery]
  );

  return {
    searchQuery,
    setSearchQuery,
    health,
    capabilities: capabilitiesQuery,
    roles,
    auditLog,
    filteredAuditLog,
  };
}
