import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  selectPlatformConnectionState,
  usePlatformHealthSnapshotQuery,
} from '../../../capabilities/platform-health';
import { queryKeys } from '../../queries/queryKeys';
import { useCapabilitiesQuery } from '../../queries/useCapabilitiesQuery';
import { useWorkspaceService } from '../../services/AppServicesContext';
import { filterAuditEntries } from './adminViewModel';

export function useAdminViewData() {
  const workspaceService = useWorkspaceService();
  const [searchQuery, setSearchQuery] = useState('');
  const platformHealth = usePlatformHealthSnapshotQuery();
  const capabilities = useCapabilitiesQuery();
  const rolesQuery = useQuery({
    queryKey: queryKeys.workspace.roles(),
    queryFn: () => workspaceService.getRoles(),
  });
  const auditQuery = useQuery({
    queryKey: queryKeys.workspace.audit(),
    queryFn: () => workspaceService.getAuditLog(),
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
    capabilities,
    roles,
    auditLog,
    connectionStatus,
    filteredAuditLog,
  };
}

