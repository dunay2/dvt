import { describe, expect, it } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
  buildProjectAccessScope,
  buildTenantAccessScope,
  buildWorkspaceGraphDraftAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import { PROJECT_ONBOARDING_POLICY } from '../../../src/application/services/projectOnboardingPolicy.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

describe('accessDecision contract vocabulary', () => {
  it('owns project creation as one canonical tenant command action', () => {
    expect(AUTHORIZATION_ACTION.projectCreate).toEqual({
      kind: 'command',
      name: 'project:create',
    });
    expect(PROJECT_ONBOARDING_POLICY.createAction).toBe(AUTHORIZATION_ACTION.projectCreate);
  });

  it('names the exact minimum creator workspace profile from canonical actions', () => {
    expect(PROJECT_ONBOARDING_POLICY.creatorWorkspaceActions).toEqual([
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'workspace:files:view',
      'workspace:files:save',
      'workspace:source-import:view',
      'workspace:source-connection:create',
      'workspace:source-connection:rename',
      'workspace:source-connection:test',
      'workspace:source-import:import',
      'workspace:source-import:rebind',
      'workspace:plugins:view',
    ]);
  });

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
