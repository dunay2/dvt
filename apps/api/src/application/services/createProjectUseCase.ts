/**
 * Owned concern: execute the authenticated CreateProject command.
 */
import { TenantId, type AuthenticatedPrincipal } from '../../domain/auth/types.js';
import type { IAccessDecisionService } from '../ports/accessDecision.js';
import type {
  CreateProjectCommand,
  CreateProjectOutcome,
  IProjectOnboardingRepository,
} from '../ports/projectOnboarding.js';

import { PROJECT_ONBOARDING_POLICY } from './projectOnboardingPolicy.js';

export class CreateProjectUseCase {
  public constructor(
    private readonly repository: IProjectOnboardingRepository,
    private readonly accessDecisions: Pick<IAccessDecisionService, 'decide'>
  ) {}

  public async execute(
    principal: AuthenticatedPrincipal,
    command: CreateProjectCommand
  ): Promise<CreateProjectOutcome> {
    const decision = await this.accessDecisions.decide(principal, {
      resource: 'tenant',
      tenantId: TenantId.unsafe(command.tenantId),
      action: PROJECT_ONBOARDING_POLICY.createAction,
    });
    if (!decision.ok) {
      return {
        kind:
          decision.reason === 'TENANT_NOT_GRANTED' ||
          decision.reason === 'TOKEN_ASSERTION_CONFLICT' ||
          decision.reason === 'PRINCIPAL_SUSPENDED'
            ? 'tenant_not_granted'
            : 'action_not_granted',
      };
    }

    return this.repository.createProject({
      ...command,
      principal,
      defaultEnvironmentId: PROJECT_ONBOARDING_POLICY.defaultEnvironmentId,
      creatorWorkspaceActions: PROJECT_ONBOARDING_POLICY.creatorWorkspaceActions,
    });
  }
}
