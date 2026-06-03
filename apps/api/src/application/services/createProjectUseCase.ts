/**
 * Owned concern: execute the authenticated CreateProject command.
 */
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';
import type {
  CreateProjectCommand,
  CreateProjectOutcome,
  IProjectOnboardingRepository,
} from '../ports/projectOnboarding.js';

export class CreateProjectUseCase {
  public constructor(private readonly repository: IProjectOnboardingRepository) {}

  public execute(
    principal: AuthenticatedPrincipal,
    command: CreateProjectCommand
  ): Promise<CreateProjectOutcome> {
    return this.repository.createProject(principal, command);
  }
}
