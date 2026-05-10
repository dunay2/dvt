/** Owned concern: load admin read models through the admin read port. */
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  selectPlatformConnectionState,
  usePlatformHealthSnapshotQuery,
} from '../../../capabilities/platform-health';
import { queryKeys } from '../../queries/queryKeys';
import { useShellRuntime } from '../../shell/useShellRuntime';
import { useWorkspaceAdminReadPort } from '../../services/AppServicesContext';
import { filterAuditEntries } from './adminViewModel';

export function useAdminViewData() {
  const workspaceAdminRead = useWorkspaceAdminReadPort();
  const [searchQuery, setSearchQuery] = useState('');
  const platformHealth = usePlatformHealthSnapshotQuery();
  const { capabilitiesQuery } = useShellRuntime();
  const rolesQuery = useQuery({
    queryKey: queryKeys.workspace.roles(),
    queryFn: () => workspaceAdminRead.getRoles(),
  });
  const auditQuery = useQuery({
    queryKey: queryKeys.workspace.audit(),
    queryFn: () => workspaceAdminRead.getAuditLog(),
  });
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
