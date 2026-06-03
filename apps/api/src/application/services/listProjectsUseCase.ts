/**
 * Owned concern: execute the authenticated ListProjects query.
 */
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';
import type {
  IProjectOnboardingRepository,
  ProjectOnboardingCatalog,
} from '../ports/projectOnboarding.js';

export class ListProjectsUseCase {
  public constructor(private readonly repository: IProjectOnboardingRepository) {}

  public execute(principal: AuthenticatedPrincipal): Promise<ProjectOnboardingCatalog> {
    return this.repository.listProjects(principal);
  }
}
