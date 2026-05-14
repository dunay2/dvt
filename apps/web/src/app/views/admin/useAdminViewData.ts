/** Owned concern: load admin read models through the admin read port. */
import { useMemo, useState } from 'react';
import {
  selectPlatformConnectionState,
  usePlatformHealthSnapshotQuery,
} from '../../../capabilities/platform-health';
import { useWorkspaceAuditQuery, useWorkspaceRolesQuery } from '../../queries/workspaceQueries';
import { useShellRuntime } from '../../shell/useShellRuntime';
import { filterAuditEntries } from './adminViewModel';

export function useAdminViewData() {
  const [searchQuery, setSearchQuery] = useState('');
  const platformHealth = usePlatformHealthSnapshotQuery();
  const { capabilitiesQuery } = useShellRuntime();
  const rolesQuery = useWorkspaceRolesQuery();
  const auditQuery = useWorkspaceAuditQuery();
  const roles = rolesQuery.data ?? [];
  const auditLog = auditQuery.data ?? [];
  const connectionStatus = selectPlatformConnectionState(
    platformHealth.data,
    platformHealth.isError
  );
  const filteredAuditLog = useMemo(
    () => filterAuditEntries(auditLog, searchQuery),
    [auditLog, searchQuery]
  );

  return {
    searchQuery,
    setSearchQuery,
    platformHealth,
    capabilities: capabilitiesQuery,
    roles,
    auditLog,
    connectionStatus,
    filteredAuditLog,
  };
}
