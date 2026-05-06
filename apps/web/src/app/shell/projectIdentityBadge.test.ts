/** Owned concern: verify shell project identity projection without render concerns. */
import { describe, expect, it } from 'vitest';

import type { WorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { buildProjectIdentityBadge } from './projectIdentityBadge';

const WORKSPACE_BOOTSTRAP: WorkspaceBootstrapConfig = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
  gitBranch: 'main',
  gitSha: 'abc123',
  tenantOptions: [{ value: 'tenant-a', label: 'Tenant A' }],
  projectOptions: [{ value: 'project-a', label: 'Project A' }],
  environmentOptions: [{ value: 'dev', label: 'Development' }],
};

describe('project identity badge', () => {
  it('projects workspace scope into read-only shell identity labels', () => {
    const badge = buildProjectIdentityBadge({
      workspaceBootstrap: WORKSPACE_BOOTSTRAP,
      selectedTenant: 'tenant-a',
      selectedProject: 'project-a',
      selectedEnvironment: 'dev',
    });

    expect(badge).toEqual({
      tenantId: 'tenant-a',
      tenantLabel: 'Tenant A',
      projectId: 'project-a',
      projectLabel: 'Project A',
      environmentId: 'dev',
      environmentLabel: 'Development',
      compactProjectId: 'project-a',
      slug: 'Tenant A / Project A',
      draftPostureLabel: 'Draft scope',
    });
  });

  it('does not fabricate missing granted labels', () => {
    const badge = buildProjectIdentityBadge({
      workspaceBootstrap: WORKSPACE_BOOTSTRAP,
      selectedTenant: 'tenant-b',
      selectedProject: 'project-b',
      selectedEnvironment: 'prod',
    });

    expect(badge.tenantLabel).toBe('tenant-b');
    expect(badge.projectLabel).toBe('project-b');
    expect(badge.environmentLabel).toBe('prod');
  });
});
