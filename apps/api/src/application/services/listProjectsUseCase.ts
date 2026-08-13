/**
 * Owned concern: execute the authenticated ListProjects query.
 */
import type { ProjectOnboardingCatalog } from '@dvt/contracts';

import { TenantId, type AuthenticatedPrincipal } from '../../domain/auth/types.js';
import type { IAccessDecisionService } from '../ports/accessDecision.js';
import type { IProjectOnboardingRepository } from '../ports/projectOnboarding.js';

import { PROJECT_ONBOARDING_POLICY } from './projectOnboardingPolicy.js';

export class ListProjectsUseCase {
  public constructor(
    private readonly repository: IProjectOnboardingRepository,
    private readonly accessDecisions: IAccessDecisionService
  ) {}

  public async execute(principal: AuthenticatedPrincipal): Promise<ProjectOnboardingCatalog> {
    const catalog = await this.repository.listGrantedProjects(principal);
    const createDecisions = await this.accessDecisions.decideMany(
      principal,
      catalog.tenantIds.map((tenantId) => ({
        resource: 'tenant' as const,
        tenantId: TenantId.unsafe(tenantId),
        action: PROJECT_ONBOARDING_POLICY.createAction,
      }))
    );

    return {
      tenants: catalog.tenantIds.map((tenantId, index) => ({
        tenantId,
        canCreateProject: createDecisions[index]?.ok === true,
      })),
      projects: catalog.projects,
      integrityFindings: catalog.integrityFindings,
    };
  }
}
