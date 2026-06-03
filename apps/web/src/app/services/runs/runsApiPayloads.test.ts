import { describe, expect, it } from 'vitest';

import type { SessionContextPort } from '../../ports/sessionContext';
import { makeRunContext } from '../../testing/contractTestUtils';
import { buildTenantScopeQuery } from './runsApiPayloads';

function createSessionContextMock(): SessionContextPort {
  return {
    getWorkspaceScope: () => ({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      targetAdapter: 'temporal' as const,
    }),
    getWorkspaceScopeSnapshot: () => ({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      targetAdapter: 'temporal' as const,
    }),
    subscribeWorkspaceScope: () => () => {},
    buildRunContext: (runId) =>
      makeRunContext(runId, {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        targetAdapter: 'temporal',
      }),
  };
}

describe('buildTenantScopeQuery', () => {
  it('includes tenantId when workspace scope is disabled', () => {
    const session = createSessionContextMock();
    const query = buildTenantScopeQuery(session, false);

    expect(query).toBe('tenantId=tenant-1');
  });

  it('includes tenantId, projectId, and environmentId when workspace scope is enabled', () => {
    const session = createSessionContextMock();
    const query = buildTenantScopeQuery(session, true);

    expect(query).toContain('tenantId=tenant-1');
    expect(query).toContain('projectId=project-1');
    expect(query).toContain('environmentId=env-1');
  });

  it('returns URLSearchParams-compatible string with proper encoding', () => {
    const session = createSessionContextMock();
    const query = buildTenantScopeQuery(session, true);

    expect(() => new URLSearchParams(query)).not.toThrow();
  });
});
