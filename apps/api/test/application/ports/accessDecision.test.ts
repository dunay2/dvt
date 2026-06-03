import { describe, expect, it } from 'vitest';

import {
  buildEnvironmentAccessScope,
  buildProjectAccessScope,
  buildTenantAccessScope,
  buildWorkspaceGraphDraftAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

describe('accessDecision contract vocabulary', () => {
  it('builds a tenant-owned access scope explicitly', () => {
    expect(buildTenantAccessScope(TenantId.unsafe('tenant-a'))).toEqual({
      resource: 'tenant',
      tenantId: TenantId.unsafe('tenant-a'),
    });
  });

  it('builds a project-owned access scope explicitly', () => {
    expect(
      buildProjectAccessScope(TenantId.unsafe('tenant-a'), ProjectId.unsafe('project-a'))
    ).toEqual({
      resource: 'project',
      tenantId: TenantId.unsafe('tenant-a'),
      projectId: ProjectId.unsafe('project-a'),
    });
  });

  it('builds an environment-owned access scope explicitly', () => {
    expect(
      buildEnvironmentAccessScope(
        TenantId.unsafe('tenant-a'),
        ProjectId.unsafe('project-a'),
        EnvironmentId.unsafe('env-a')
      )
    ).toEqual({
      resource: 'environment',
      tenantId: TenantId.unsafe('tenant-a'),
      projectId: ProjectId.unsafe('project-a'),
      environmentId: EnvironmentId.unsafe('env-a'),
    });
  });

  it('builds a workspace-graph-draft access scope explicitly', () => {
    expect(
      buildWorkspaceGraphDraftAccessScope(
        TenantId.unsafe('tenant-a'),
        ProjectId.unsafe('project-a'),
        EnvironmentId.unsafe('env-a')
      )
    ).toEqual({
      resource: 'workspace-graph-draft',
      tenantId: TenantId.unsafe('tenant-a'),
      projectId: ProjectId.unsafe('project-a'),
      environmentId: EnvironmentId.unsafe('env-a'),
    });
  });
});
