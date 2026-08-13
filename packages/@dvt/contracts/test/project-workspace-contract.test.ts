import { describe, expect, it } from 'vitest';

import {
  CreateProjectResponseSchema,
  PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID,
  ProjectOnboardingCatalogSchema,
  WorkspaceContextResponseSchema,
} from '../src/index.js';

const defaultWorkspace = {
  tenantId: 'tenant-a',
  projectId: 'orders',
  projectName: 'Orders',
  environmentId: PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID,
} as const;

describe('project and workspace public contract', () => {
  it('shares one project-create response with a named deterministic default workspace', () => {
    const response = CreateProjectResponseSchema.parse({
      project: {
        tenantId: 'tenant-a',
        projectId: 'orders',
        name: 'Orders',
        environmentIds: [PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID],
      },
      defaultWorkspace,
    });

    expect(response.defaultWorkspace.projectName).toBe(response.project.name);
  });

  it('reports orphaned grant references instead of fabricating project descriptors', () => {
    const catalog = ProjectOnboardingCatalogSchema.parse({
      tenants: [{ tenantId: 'tenant-a', canCreateProject: true }],
      projects: [],
      integrityFindings: [
        { kind: 'missing_project_record', tenantId: 'tenant-a', projectId: 'missing-project' },
      ],
    });

    expect(catalog.integrityFindings).toEqual([
      { kind: 'missing_project_record', tenantId: 'tenant-a', projectId: 'missing-project' },
    ]);
  });

  it('keeps the server default distinct from the available granted workspace catalog', () => {
    const response = WorkspaceContextResponseSchema.parse({
      defaultWorkspace,
      availableWorkspaces: [
        defaultWorkspace,
        {
          tenantId: 'tenant-a',
          projectId: 'warehouse',
          projectName: 'Warehouse',
          environmentId: 'prod',
        },
      ],
      deploymentScope: {
        targetAdapter: 'temporal',
        availableTargetAdapters: ['temporal'],
      },
    });

    expect(response.defaultWorkspace.projectId).toBe('orders');
    expect(response.availableWorkspaces).toHaveLength(2);
  });
});
