import { describe, expect, it } from 'vitest';
import {
  createPlatformHealthSnapshot,
  createReadyzProbe,
  createVersionProbe,
  createDbReadyProbe,
  createPlatformEndpointFailure,
} from '../../../capabilities/platform-health/testing/platformHealthFixtures';
import type { AuditLogEntry } from '../../types/dbt';
import {
  filterAuditEntries,
  getBackendStatusLabel,
  getCapabilitiesEmptyState,
  buildAdminPlatformHealthPresentation,
  type AdminHealthQueryState,
  getRolePermissionLabel,
} from './adminViewModel';

function queryState(overrides: Partial<AdminHealthQueryState> = {}): AdminHealthQueryState {
  return {
    data: createPlatformHealthSnapshot(),
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    failureCount: 0,
    dataUpdatedAt: 1,
    errorUpdatedAt: 0,
    ...overrides,
  };
}

describe('adminViewModel', () => {
  it('maps backend rest status to labels', () => {
    expect(getBackendStatusLabel('ok')).toBe('Online');
    expect(getBackendStatusLabel('degraded')).toBe('Degraded');
    expect(getBackendStatusLabel('offline')).toBe('Offline');
  });

  it('keeps initial checking distinct from offline or a successful observation', () => {
    // Initial loading previously inherited Offline from the lower-level selector.
    const presentation = buildAdminPlatformHealthPresentation(
      queryState({ data: undefined, isPending: true, isFetching: true })
    );
    expect(presentation.backend).toMatchObject({ status: 'Checking', tone: 'neutral' });
    expect(presentation.probes.readyz).toMatchObject({
      status: 'Checking',
      tone: 'neutral',
      statusCode: null,
    });
    expect(presentation.probes.healthz.status).not.toBe('Healthy');
  });

  it('does not report an unobserved readiness probe as healthy', () => {
    // Missing observations previously fell through to a fabricated healthy message.
    const presentation = buildAdminPlatformHealthPresentation(queryState({ data: undefined }));
    expect(presentation.probes.readyz).toMatchObject({ status: 'No observation', tone: 'neutral' });
    expect(presentation.backend.status).toBe('Not checked');
  });

  it.each([null, 404, 405])(
    'preserves excluded or absent optional endpoint facts (%s)',
    (statusCode) => {
      // Unrequested and optional-absence states must not become amber backend failures.
      const presentation = buildAdminPlatformHealthPresentation(
        queryState({
          data: createPlatformHealthSnapshot({
            readyz: createReadyzProbe({
              availability: 'not_enabled',
              statusCode,
              latencyMs: statusCode == null ? null : 7,
              data: null,
            }),
          }),
        })
      );
      expect(presentation.probes.readyz).toMatchObject({
        status: statusCode == null ? 'Not requested' : 'Not exposed',
        tone: 'neutral',
        statusCode,
      });
      expect(presentation.probes.readyz.detail).not.toMatch(/healthy/i);
    }
  );

  it('projects successful readiness and the API service version from actual data', () => {
    const presentation = buildAdminPlatformHealthPresentation(queryState());
    expect(presentation.backend.status).toBe('Online');
    expect(presentation.probes.readyz).toMatchObject({ status: 'Ready', tone: 'success' });
    expect(presentation.probes.dbReady).toMatchObject({ status: 'Ready', tone: 'success' });
    expect(presentation.probes.version).toMatchObject({
      status: '1.0.0',
      detail: 'API service: dvt-api',
    });
  });

  it.each([401, 403, 500])(
    'does not infer success from available transport carrying HTTP %s',
    (statusCode) => {
      // The version badge previously treated availability === available as success even with errors.
      const presentation = buildAdminPlatformHealthPresentation(
        queryState({
          data: createPlatformHealthSnapshot({
            version: createVersionProbe({
              statusCode,
              error: createPlatformEndpointFailure({
                kind: 'http',
                statusCode,
                message: 'Observed failure',
              }),
            }),
          }),
        })
      );
      expect(presentation.probes.version).toMatchObject({
        status: statusCode < 500 ? 'Access denied' : 'Probe failed',
        tone: 'danger',
        detail: 'Observed failure',
      });
    }
  );

  it.each(['network', 'invalid_json'] as const)(
    'preserves %s probe errors instead of claiming readiness',
    (kind) => {
      const presentation = buildAdminPlatformHealthPresentation(
        queryState({
          data: createPlatformHealthSnapshot({
            readyz: createReadyzProbe({
              data: null,
              error: createPlatformEndpointFailure({ kind, message: 'No usable response' }),
            }),
          }),
        })
      );
      expect(presentation.probes.readyz).toMatchObject({
        status: 'Probe failed',
        tone: 'danger',
        detail: 'No usable response',
      });
    }
  );

  it('preserves backend not-ready reasons and HTTP facts for readiness and database probes', () => {
    const presentation = buildAdminPlatformHealthPresentation(
      queryState({
        data: createPlatformHealthSnapshot({
          readyz: createReadyzProbe({
            statusCode: 503,
            data: { ok: false, status: 'not_ready', reasonCode: 'adapter_unavailable' },
            error: createPlatformEndpointFailure({ kind: 'http', statusCode: 503 }),
          }),
          dbReady: createDbReadyProbe({
            statusCode: 503,
            data: { ok: false, reason: 'database unavailable' },
            error: createPlatformEndpointFailure({ kind: 'http', statusCode: 503 }),
          }),
        }),
      })
    );
    expect(presentation.probes.readyz).toMatchObject({
      status: 'Not ready',
      tone: 'warning',
      detail: 'adapter_unavailable',
      statusCode: 503,
    });
    expect(presentation.probes.dbReady).toMatchObject({
      status: 'Not ready',
      detail: 'database unavailable',
      statusCode: 503,
    });
  });

  it('labels cached results historical when the current refresh failed', () => {
    // Cached healthy data is useful evidence, but must not impersonate the failed current query.
    const presentation = buildAdminPlatformHealthPresentation(
      queryState({ isError: true, error: new Error('Health connection lost'), errorUpdatedAt: 2 })
    );
    expect(presentation.backend).toMatchObject({
      status: 'Refresh failed',
      tone: 'danger',
      detail: 'Health connection lost',
    });
    expect(presentation.stale).toBe(true);
    expect(presentation.probes.readyz).toMatchObject({
      status: 'Last observed: Ready',
      tone: 'neutral',
    });
    expect(presentation.probes.readyz.detail).toContain('2026-03-31T00:00:00.000Z');
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
