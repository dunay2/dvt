/**
 * Owned concern: orchestrate one server-owned run-context binding for an
 * already persisted executable plan.
 * @baseline ADR-0018: Provider behavior is behind application-owned ports.
 * @decision Inject context preparers; retain one persistence and dispatch path.
 * @consequence Adding a provider does not add branches to this coordinator.
 * @version 1.0.0
 */
import {
  START_RUN_RESULT_KIND,
  RUN_REJECTIONS,
  type OperationalRejection,
  type StartRunCommand,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import {
  DuplicateRunContextPreparerError,
  type IRunExecutionContextPreparer,
} from '../ports/runExecutionContextPreparer.js';
import type { IRunExecutionContextWriter } from '../ports/runExecutionContextWriter.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import { buildRunExecutionContext } from './runExecutionContextFactory.js';
import type { StoredPlanAdmissionResult } from './StoredPlanAdmissionCoordinator.js';

export class RunExecutionContextBindingUseCase implements IStartRunUseCase {
  public constructor(
    private readonly deps: {
      readonly delegate: IStartRunUseCase;
      readonly contextWriter: IRunExecutionContextWriter;
      readonly preparers: readonly IRunExecutionContextPreparer[];
    }
  ) {
    const keys = deps.preparers.map((preparer) => preparer.contextKey);
    if (new Set(keys).size !== keys.length) {
      throw new DuplicateRunContextPreparerError();
    }
  }

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    return this.deps.delegate.execute(command, context);
  }

  public async executeAdmitted(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext,
    admission: Extract<StoredPlanAdmissionResult, { readonly accepted: true }>
  ): Promise<StartRunUseCaseResult> {
    const commandWithPlanRef = { ...command, planRef: admission.planRef };
    const { materialized, scopedPlanRef } = admission;
    const { plan } = materialized;
    const preparers = this.deps.preparers.filter((preparer) => preparer.isRequired(plan));
    if (preparers.length === 0) {
      return this.deps.delegate.execute(command, context);
    }
    if (command.runExecutionContextRef !== undefined) {
      return rejectRunExecutionContext(RUN_REJECTIONS.callerContextProvided);
    }

    const scope: WorkspaceStorageScope = {
      tenantId: scopedPlanRef.tenantId,
      projectId: scopedPlanRef.projectId,
      environmentId: scopedPlanRef.environmentId,
    };
    const pluginContexts = new Map<string, Readonly<Record<string, unknown>>>();
    const preparation = {
      plan,
      planRef: scopedPlanRef.planRef,
      runId: command.runId,
      targetAdapter: commandWithPlanRef.targetAdapter,
      scope,
    };
    for (const preparer of preparers) {
      const prepared = await preparer.prepare(preparation);
      if (!prepared.ok) return rejectRunExecutionContext(prepared);
      pluginContexts.set(preparer.contextKey, prepared.context);
    }

    const runExecutionContext = buildRunExecutionContext({
      command: commandWithPlanRef,
      context,
      scope,
      pluginContexts: Object.fromEntries(pluginContexts),
      ...(materialized.executionPolicy.pluginCompatibilityFingerprint === undefined
        ? {}
        : {
            pluginCompatibilityFingerprint:
              materialized.executionPolicy.pluginCompatibilityFingerprint,
          }),
    });
    const writtenContext = await this.deps.contextWriter.write({
      runId: command.runId,
      context: runExecutionContext,
    });
    if (!writtenContext.ok) {
      return rejectRunExecutionContext(RUN_REJECTIONS.contextStoreUnavailable);
    }

    return this.deps.delegate.execute(
      { ...commandWithPlanRef, runExecutionContextRef: writtenContext.ref },
      context
    );
  }
}

function rejectRunExecutionContext({
  code,
  cause,
  reason,
}: OperationalRejection): StartRunUseCaseResult {
  return {
    ok: true,
    value: {
      kind: START_RUN_RESULT_KIND.planRejected,
      accepted: false,
      code,
      cause,
      reason,
    },
  };
}
