import type {
  PlatformConnectionState,
  PlatformHealthSnapshot,
} from '../../../capabilities/platform-health';
import type { AuditLogEntry, Role } from '../../types/dbt';

export function getBackendStatusLabel(restStatus: PlatformConnectionState['rest']): string {
  switch (restStatus) {
    case 'ok':
      return 'Online';
    case 'degraded':
      return 'Degraded';
    default:
      return 'Offline';
  }
}

export function getReadyzSummary(snapshot: PlatformHealthSnapshot | undefined): string {
  const readyzData = snapshot?.readyz.data;
  if (readyzData && 'reasonCode' in readyzData) {
    return readyzData.reasonCode;
  }
  return 'readyz endpoint healthy';
}

export function getCapabilitiesEmptyState(isLoading: boolean, hasError: boolean): string {
  if (isLoading) {
    return 'Loading capabilities...';
  }
  if (hasError) {
    return 'Capabilities endpoint unavailable.';
  }
  return 'No capability data.';
}

export function filterAuditEntries(
  auditLog: readonly AuditLogEntry[],
  searchQuery: string
): AuditLogEntry[] {
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

export function getRolePermissionLabel(permissionKey: keyof Role['permissions']): string {
  return permissionKey
    .replace('can', '')
    .replaceAll(/([A-Z])/g, ' $1')
    .trim();
}
