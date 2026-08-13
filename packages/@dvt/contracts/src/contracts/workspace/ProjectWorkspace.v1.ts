import { z } from 'zod';

const NonBlankStringSchema = z.string().trim().min(1);

export const PROJECT_WORKSPACE_CONTRACT_VERSION = 'project-workspace.v1';
export const PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID = 'dev';

export const ProjectWorkspaceDescriptorSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    projectName: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict();

export const ProjectOnboardingTenantSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    canCreateProject: z.boolean(),
  })
  .strict();

export const ProjectDescriptorSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    name: NonBlankStringSchema,
    environmentIds: z.array(NonBlankStringSchema).readonly(),
  })
  .strict();

export const ProjectCatalogIntegrityFindingSchema = z
  .object({
    kind: z.literal('missing_project_record'),
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
  })
  .strict();

export const ProjectOnboardingCatalogSchema = z
  .object({
    tenants: z.array(ProjectOnboardingTenantSchema).readonly(),
    projects: z.array(ProjectDescriptorSchema).readonly(),
    integrityFindings: z.array(ProjectCatalogIntegrityFindingSchema).readonly(),
  })
  .strict();

export const CreateProjectRequestSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    name: NonBlankStringSchema,
  })
  .strict();

export const CreateProjectResponseSchema = z
  .object({
    project: ProjectDescriptorSchema,
    defaultWorkspace: ProjectWorkspaceDescriptorSchema,
  })
  .strict();

export const WorkspaceContextResponseSchema = z
  .object({
    defaultWorkspace: ProjectWorkspaceDescriptorSchema,
    availableWorkspaces: z.array(ProjectWorkspaceDescriptorSchema).readonly(),
    deploymentScope: z
      .object({
        targetAdapter: z.literal('temporal'),
        availableTargetAdapters: z.array(z.literal('temporal')).readonly(),
      })
      .strict(),
  })
  .strict();

export type ProjectWorkspaceDescriptor = z.infer<typeof ProjectWorkspaceDescriptorSchema>;
export type ProjectOnboardingTenant = z.infer<typeof ProjectOnboardingTenantSchema>;
export type ProjectDescriptor = z.infer<typeof ProjectDescriptorSchema>;
export type ProjectCatalogIntegrityFinding = z.infer<typeof ProjectCatalogIntegrityFindingSchema>;
export type ProjectOnboardingCatalog = z.infer<typeof ProjectOnboardingCatalogSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
export type WorkspaceContextResponse = z.infer<typeof WorkspaceContextResponseSchema>;
