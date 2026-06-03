/**
 * Owned concern: define authenticated project onboarding read and write rails.
 */
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';

export const PROJECT_ONBOARDING_CREATE_SCOPE = 'project:create';
export const PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID = 'dev';

export interface ProjectOnboardingTenant {
  readonly tenantId: string;
  readonly canCreateProject: boolean;
}

export interface ProjectDescriptor {
  readonly tenantId: string;
  readonly projectId: string;
  readonly name: string;
  readonly environmentIds: readonly string[];
}

export interface ProjectOnboardingCatalog {
  readonly tenants: readonly ProjectOnboardingTenant[];
  readonly projects: readonly ProjectDescriptor[];
}

export interface EffectiveProjectWorkspaceContext {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
}

export interface CreateProjectCommand {
  readonly tenantId: string;
  readonly name: string;
  readonly idempotencyKey: string;
}

export type CreateProjectOutcome =
  | {
      readonly kind: 'created' | 'replayed';
      readonly project: ProjectDescriptor;
      readonly effectiveWorkspace: EffectiveProjectWorkspaceContext;
    }
  | { readonly kind: 'tenant_not_granted' }
  | { readonly kind: 'action_not_granted' }
  | { readonly kind: 'duplicate_project_name' }
  | { readonly kind: 'idempotency_conflict' };

export interface IProjectOnboardingRepository {
  migrate(): Promise<void>;
  listProjects(principal: AuthenticatedPrincipal): Promise<ProjectOnboardingCatalog>;
  createProject(
    principal: AuthenticatedPrincipal,
    command: CreateProjectCommand
  ): Promise<CreateProjectOutcome>;
}
