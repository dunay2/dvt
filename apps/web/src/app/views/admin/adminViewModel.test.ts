import { describe, expect, it } from 'vitest';
import type { PlatformHealthSnapshot } from '../../../capabilities/platform-health';
import type { AuditLogEntry } from '../../types/dbt';
import {
  filterAuditEntries,
  getBackendStatusLabel,
  getCapabilitiesEmptyState,
  getReadyzSummary,
  getRolePermissionLabel,
} from './adminViewModel';

describe('adminViewModel', () => {
  it('maps backend rest status to labels', () => {
    expect(getBackendStatusLabel('ok')).toBe('Online');
    expect(getBackendStatusLabel('degraded')).toBe('Degraded');
    expect(getBackendStatusLabel('offline')).toBe('Offline');
  });

  it('returns readyz reason code when available', () => {
    const snapshot = {
      readyz: {
        data: {
          ok: false,
          status: 'degraded',
          reasonCode: 'runtime_unavailable',
          components: {},
        },
      },
    } as unknown as PlatformHealthSnapshot;
    expect(getReadyzSummary(snapshot)).toBe('runtime_unavailable');
  });

  it('returns capability empty-state message by query state', () => {
    expect(getCapabilitiesEmptyState(true, false)).toBe('Loading capabilities...');
    expect(getCapabilitiesEmptyState(false, true)).toBe('Capabilities endpoint unavailable.');
    expect(getCapabilitiesEmptyState(false, false)).toBe('No capability data.');
  });

  it('filters audit entries by user, action, and resource', () => {
    const entries: AuditLogEntry[] = [
      {
        id: '1',
        timestamp: '2026-04-04T10:00:00.000Z',
        user: 'anne',
        action: 'run.start',
        resource: 'plan://alpha',
        details: 'Started run',
        status: 'success',
      },
      {
        id: '2',
        timestamp: '2026-04-04T10:01:00.000Z',
        user: 'bob',
        action: 'role.update',
        resource: 'rbac://admin',
        details: 'Updated role',
        status: 'success',
      },
    ];

    expect(filterAuditEntries(entries, 'anne')).toHaveLength(1);
    expect(filterAuditEntries(entries, 'role.update')).toHaveLength(1);
    expect(filterAuditEntries(entries, 'rbac://admin')).toHaveLength(1);
    expect(filterAuditEntries(entries, 'missing')).toHaveLength(0);
  });

  it('formats permission keys as readable labels', () => {
    expect(getRolePermissionLabel('canManageRBAC')).toBe('Manage R B A C');
    expect(getRolePermissionLabel('canEditEdges')).toBe('Edit Edges');
  });
});

