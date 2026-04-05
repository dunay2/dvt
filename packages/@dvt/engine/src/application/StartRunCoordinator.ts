import {
  StartRunApplicationService,
  type StartRunApplicationServiceDeps,
} from './StartRunApplicationService.js';

/**
 * Backward-compatible alias.
 * Prefer StartRunApplicationService for new code.
 */
export type StartRunCoordinatorDeps = StartRunApplicationServiceDeps;

export class StartRunCoordinator extends StartRunApplicationService {
  constructor(deps: StartRunCoordinatorDeps) {
    super(deps);
  }

  async execute(
    ...args: Parameters<StartRunApplicationService['startRun']>
  ): ReturnType<StartRunApplicationService['startRun']> {
    return this.startRun(...args);
  }
}
