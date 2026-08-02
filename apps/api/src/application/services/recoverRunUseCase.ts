/** Owned concern: recover a run from server-owned source lineage and immutable artifacts. */
import type { IPlanStoreReader } from '@dvt/artifacts';
import { asNonBlankString, type PlanRecord } from '@dvt/contracts';
import {
  RunMetadataNotFoundError,
  type IRunStateStoreRead,
  type IWorkflowEngine,
  type PlanRef,
  type RunContext,
  type RunMetadata,
} from '@dvt/engine';

import { RunRecoveryUnavailableError } from '../errors/runControlErrors.js';
import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';
import type { IRecoverRunUseCase, RecoverRunCommand, RecoverRunResult } from '../ports/runtime.js';

export interface RecoverRunUseCaseDependencies {
  readonly engine: IWorkflowEngine;
  readonly stateStore: IRunStateStoreRead;
  readonly planStore: Pick<IPlanStoreReader, 'getPlanRecord'>;
  readonly executionContextReader: IRunExecutionContextReferenceReader;
}

export class RecoverRunUseCase implements IRecoverRunUseCase {
  public constructor(private readonly dependencies: RecoverRunUseCaseDependencies) {}

  public async execute(
    command: RecoverRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<RecoverRunResult> {
    const tenantId = context.scope.tenantId.value;
    const source = await this.dependencies.stateStore.getRunMetadataByRunId(
      tenantId,
      command.sourceRunId
    );
    if (!source) {
      throw new RunMetadataNotFoundError(command.sourceRunId);
    }

    const planRecord = await this.dependencies.planStore.getPlanRecord({
      tenantId,
      projectId: source.projectId,
      environmentId: source.environmentId,
      planId: source.planId,
    });
    if (!planRecord) {
      throw new RunRecoveryUnavailableError(command.sourceRunId, 'source_plan_unavailable');
    }

    const runExecutionContextRef = await this.dependencies.executionContextReader.read({
      tenantId,
      runId: command.sourceRunId,
    });
    await this.dependencies.engine.recoverRun(
      command.sourceRunId,
      toEnginePlanRef(planRecord),
      toEngineRunContext(command, source, tenantId, runExecutionContextRef)
    );

    return {
      sourceRunId: command.sourceRunId,
      recoveryRunId: command.recoveryRunId,
      accepted: true,
    };
  }
}

function toEnginePlanRef(record: PlanRecord): PlanRef {
  return {
    uri: asNonBlankString(record.sourceRef),
    sha256: asNonBlankString(record.canonicalHash),
    schemaVersion: asNonBlankString(record.schemaVersion),
    planId: asNonBlankString(record.planId),
    planVersion: asNonBlankString(record.planVersion),
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
