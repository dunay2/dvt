/** Owned concern: recover a run from server-owned source lineage and immutable artifacts. */
import type { IStoredPlanRefReader } from '@dvt/artifacts';
import { asNonBlankString } from '@dvt/contracts';
import {
  RunMetadataNotFoundError,
  type IStartRunIntentQueryStore,
  type IRunStateStoreRead,
  type IWorkflowEngine,
  type IRunMaintenanceService,
  type RunContext,
  type RunMetadata,
} from '@dvt/engine';

import {
  RunControlUnavailableError,
  RunRecoveryUnavailableError,
} from '../errors/runControlErrors.js';
import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import type { IRunControlCommandCoordinator } from '../ports/runControlCommandCoordinator.js';
import type { IRunExecutionContextInheritanceWriter } from '../ports/runExecutionContextInheritanceWriter.js';
import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';
import type { IRunExecutionContextRequirementResolver } from '../ports/runExecutionContextRequirementResolver.js';
import {
  RUN_CONTROL_RESULT_CONTRACT_VERSION,
  type IRecoverRunUseCase,
  type RecoverRunCommand,
  type RecoverRunResult,
} from '../ports/runtime.js';

import { decideRecoverRun } from './runControlPolicy.js';
import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';

export interface RecoverRunUseCaseDependencies {
  readonly engine: IWorkflowEngine;
  readonly stateStore: IRunStateStoreRead;
  readonly planStore: IStoredPlanRefReader;
  readonly executionContextReader: IRunExecutionContextReferenceReader;
  readonly executionContextInheritanceWriter: IRunExecutionContextInheritanceWriter;
  readonly commandCoordinator: IRunControlCommandCoordinator;
  readonly executionContextRequirementResolver: IRunExecutionContextRequirementResolver;
  readonly startRunIntentStore: IStartRunIntentQueryStore;
  readonly runMaintenanceService: Pick<IRunMaintenanceService, 'reconcileStartRunIntent'>;
  readonly idempotency: {
    startRunIntentId(
      tenantId: string,
      runId: string,
      logicalAttemptId: number,
      targetAdapter: RunMetadata['providerRef']['provider']
    ): string;
  };
}

export class RecoverRunUseCase implements IRecoverRunUseCase {
  public constructor(private readonly dependencies: RecoverRunUseCaseDependencies) {}

  public async execute(
    command: RecoverRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<RecoverRunResult> {
    const tenantId = context.scope.tenantId.value;
    return this.dependencies.commandCoordinator.executeExclusive(
      { action: 'recover', tenantId, runId: command.recoveryRunId },
      () => this.executeExclusive(command, context, tenantId)
    );
  }

  private async executeExclusive(
    command: RecoverRunCommand,
    context: AuthorizedCommandExecutionContext,
    tenantId: string
  ): Promise<RecoverRunResult> {
    const source = await this.dependencies.stateStore.getRunMetadataByRunId(
      tenantId,
      command.sourceRunId
    );
    if (!source) {
      throw new RunMetadataNotFoundError(command.sourceRunId);
    }
    const repeatedRecovery = await this.dependencies.stateStore.getRunMetadataByRunId(
      tenantId,
      command.recoveryRunId
    );
    if (repeatedRecovery !== null) {
      if (!isRecoveryChildOf(repeatedRecovery, source)) {
        throw new RunRecoveryUnavailableError(command.sourceRunId, 'recovery_identity_conflict');
      }
      const dispatchResolution = await this.resolveRecoveryDispatch(repeatedRecovery, tenantId);
      if (dispatchResolution === 'confirmed') {
        return acceptedRecovery(command);
      }
      if (dispatchResolution === 'blocked') {
        throw new RunRecoveryUnavailableError(command.sourceRunId, 'recovery_dispatch_unconfirmed');
      }
    }

    const status = await this.dependencies.engine.getRunStatus(runMetadataToEngineRunRef(source));
    const recoveryDecision = decideRecoverRun(status);
    if (recoveryDecision.kind === 'reject') {
      throw new RunControlUnavailableError('recover', status.status, recoveryDecision.reason);
    }

    const planRef = await this.dependencies.planStore.getStoredPlanRef({
      tenantId,
      projectId: source.projectId,
      environmentId: source.environmentId,
      planId: source.planId,
    });
    if (!planRef) {
      throw new RunRecoveryUnavailableError(command.sourceRunId, 'source_plan_unavailable');
    }

    const runExecutionContext = await this.dependencies.executionContextReader.read({
      tenantId,
      runId: command.sourceRunId,
      expectedBinding: {
        tenantId,
        projectId: source.projectId,
        environmentId: source.environmentId,
        planId: source.planId,
        planVersion: source.planVersion,
        planSha256: planRef.sha256,
        targetAdapter: source.providerRef.provider,
      },
    });
    if (
      runExecutionContext.kind === 'untrusted' ||
      (runExecutionContext.kind === 'absent' &&
        (await this.dependencies.executionContextRequirementResolver.resolve(source)) !==
          'not_required')
    ) {
      throw new RunRecoveryUnavailableError(command.sourceRunId, 'source_context_untrusted');
    }
    const recoveryExecutionContextRef =
      runExecutionContext.kind === 'trusted'
        ? await this.dependencies.executionContextInheritanceWriter.inherit({
            tenantId,
            sourceRunId: command.sourceRunId,
            recoveryRunId: command.recoveryRunId,
            sourceRef: runExecutionContext.ref,
          })
        : undefined;
    await this.dependencies.engine.recoverRun(
      command.sourceRunId,
      planRef,
      toEngineRunContext(command, source, tenantId, recoveryExecutionContextRef)
    );

    return acceptedRecovery(command);
  }

  private async resolveRecoveryDispatch(
    recovery: RunMetadata,
    tenantId: string
  ): Promise<'confirmed' | 'ready_to_dispatch' | 'missing' | 'blocked'> {
    const intentId = this.dependencies.idempotency.startRunIntentId(
      tenantId,
      recovery.runId,
      recovery.logicalAttemptId,
      recovery.providerRef.provider
    );
    const intent = await this.dependencies.startRunIntentStore.getIntent({ tenantId, intentId });
    if (
      intent?.engineRunRef !== undefined &&
      (intent.status === 'DISPATCHED' || intent.status === 'RESOLVED')
    ) {
      return 'confirmed';
    }
    const reconciliation = await this.dependencies.runMaintenanceService.reconcileStartRunIntent({
      tenantId,
      intentId,
    });
    return reconciliation.kind;
  }
}

function isRecoveryChildOf(candidate: RunMetadata, source: RunMetadata): boolean {
  return (
    candidate.parentRunId === source.runId &&
    candidate.originRunId === (source.originRunId ?? source.runId) &&
    candidate.projectId === source.projectId &&
    candidate.environmentId === source.environmentId &&
    candidate.planId === source.planId &&
    candidate.planVersion === source.planVersion
  );
}

function acceptedRecovery(command: RecoverRunCommand): RecoverRunResult {
  return {
    contractVersion: RUN_CONTROL_RESULT_CONTRACT_VERSION,
    sourceRunId: command.sourceRunId,
    recoveryRunId: command.recoveryRunId,
    accepted: true,
  };
}

function toEngineRunContext(
  command: RecoverRunCommand,
  source: RunMetadata,
  tenantId: string,
  runExecutionContextRef: RunContext['runExecutionContextRef']
): RunContext {
  return {
    tenantId: asNonBlankString(tenantId),
    projectId: asNonBlankString(source.projectId),
    environmentId: asNonBlankString(source.environmentId),
    runId: asNonBlankString(command.recoveryRunId),
    targetAdapter: source.providerRef.provider,
    ...(runExecutionContextRef === undefined ? {} : { runExecutionContextRef }),
  };
}
