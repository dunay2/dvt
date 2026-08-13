/**
 * Owned concern: define persistence inputs behind the ListProjects query and
 * CreateProject command. Public HTTP shapes live in @dvt/contracts.
 */
import type {
  ProjectCatalogIntegrityFinding,
  ProjectDescriptor,
  ProjectWorkspaceDescriptor,
} from '@dvt/contracts';

import type { AuthenticatedPrincipal, PrincipalRef } from '../../domain/auth/types.js';

import type { PrincipalGrantSnapshot } from './principalGrantRepository.js';

export interface CreateProjectCommand {
  readonly tenantId: string;
  readonly name: string;
  readonly idempotencyKey: string;
}

export interface PersistProjectCreationCommand extends CreateProjectCommand {
  readonly principal: PrincipalRef;
  readonly defaultEnvironmentId: string;
  readonly creatorWorkspaceActions: readonly string[];
}

export type CreateProjectOutcome =
  | {
      readonly kind: 'created' | 'replayed';
      readonly project: ProjectDescriptor;
      readonly defaultWorkspace: ProjectWorkspaceDescriptor;
    }
  | { readonly kind: 'tenant_not_granted' }
  | { readonly kind: 'action_not_granted' }
  | { readonly kind: 'duplicate_project_name' }
  | { readonly kind: 'idempotency_conflict' };

export interface GrantedProjectCatalog {
  readonly grantSnapshot: PrincipalGrantSnapshot | null;
  readonly tenantIds: readonly string[];
  readonly projects: readonly ProjectDescriptor[];
  readonly integrityFindings: readonly ProjectCatalogIntegrityFinding[];
}

export interface IProjectOnboardingRepository {
  migrate(): Promise<void>;
  listGrantedProjects(principal: AuthenticatedPrincipal): Promise<GrantedProjectCatalog>;
  createProject(
    command: PersistProjectCreationCommand,
    revalidateLockedGrants: (effectiveAccess: PrincipalGrantSnapshot) => boolean
  ): Promise<CreateProjectOutcome>;
}
