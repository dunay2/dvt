import type { IWorkflowEngine } from '@dvt/engine';

import type {
  AuthorizedCommandExecutionContext,
  IStartRunUseCase,
  StartRunCommand,
  StartRunResult,
} from '../ports/auth.js';

/**
 * Engine-backed StartRun use case.
 *
 * Bridges the application-layer command model to `IWorkflowEngine.startRun()`.
 * Authorization has already been enforced by `AuthorizeCommandScopeService`
 * before this use case is invoked; the engine's IAuthorizer is wired separately
 * as a redundant tenantId check at the engine boundary.
 */
export class EngineStartRunUseCase implements IStartRunUseCase {
  constructor(private readonly engine: IWorkflowEngine) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunResult> {
    if (!command.planRef) {
      throw new Error('PLAN_REF_REQUIRED');
    }

    const ref = await this.engine.startRun(
      {
        uri: command.planRef.uri,
        sha256: command.planRef.sha256,
        schemaVersion: command.planRef.schemaVersion,
        planId: command.planRef.planId,
        planVersion: command.planRef.planVersion,
      },
      {
        tenantId: context.scope.tenantId.value,
        projectId: context.scope.projectId?.value ?? '',
        environmentId: context.scope.environmentId?.value ?? '',
        runId: command.runId,
        targetAdapter: command.targetAdapter,
        logicalAttemptId: 1,
      }
    );

    return { kind: 'accepted', runId: ref.runId, accepted: true };
  }
}
