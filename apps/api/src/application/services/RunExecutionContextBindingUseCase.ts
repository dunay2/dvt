/**
 * Owned concern: orchestrate one server-owned run-context binding for an
 * already persisted executable plan.
 */
import {
  DBT_STEP_REQUIRED_CAPABILITY,
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RESULT_KIND,
  collectRequiredCapabilitiesForSteps,
  type ExecutionPlan,
  type IStepTypeRegistry,
  type StartRunCommand,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type {
  IDbtExecutionConnectionBindingVerifier,
  IDbtExecutionTargetResolver,
} from '../ports/dbtExecutionTarget.js';
import type {
  DbtProjectBundleBuildResult,
  IDbtProjectBundleBuilder,
} from '../ports/dbtProjectBundle.js';
import type {
  IRunExecutionContextWriter,
  RunExecutionContextWriteResult,
} from '../ports/runExecutionContextWriter.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import { resolveDbtExecutionConnectionBinding } from './dbtExecutionConnectionBinding.js';
import { resolveDbtPlanExecutionBinding } from './dbtPlanExecutionBinding.js';
import { buildRunExecutionContext } from './runExecutionContextFactory.js';
import type { StoredPlanAdmissionResult } from './StoredPlanAdmissionCoordinator.js';

const CALLER_CONTEXT_REJECTION =
  'Caller-provided run execution context references are not accepted for governed execution.';

export class RunExecutionContextBindingUseCase implements IStartRunUseCase {
  public constructor(
    private readonly deps: {
      readonly delegate: IStartRunUseCase;
      readonly bundleBuilder: IDbtProjectBundleBuilder;
      readonly contextWriter: IRunExecutionContextWriter;
      readonly executionTargetResolver: IDbtExecutionTargetResolver;
      readonly executionConnectionBindingVerifier: IDbtExecutionConnectionBindingVerifier;
      readonly stepTypeRegistry: IStepTypeRegistry;
      readonly warehouseConnectionCatalog: IWarehouseConnectionCatalog;
    }
  ) {}

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
    const bindsDbt = isDbtPlan(plan, this.deps.stepTypeRegistry);
    if (!bindsDbt) {
      return this.deps.delegate.execute(command, context);
    }
    if (command.runExecutionContextRef !== undefined) {
      return rejectRunExecutionContext(CALLER_CONTEXT_REJECTION);
    }

    const scope: WorkspaceStorageScope = {
      tenantId: scopedPlanRef.tenantId,
      projectId: scopedPlanRef.projectId,
      environmentId: scopedPlanRef.environmentId,
    };
    const pluginContexts: Record<string, Record<string, unknown>> = {};

    if (bindsDbt) {
      const sourceBinding = resolveDbtPlanExecutionBinding({
        plan,
        targetAdapter: commandWithPlanRef.targetAdapter,
        executionTarget: this.deps.executionTargetResolver.resolve(),
      });
      if (!sourceBinding.ok) return rejectRunExecutionContext(sourceBinding.reason);
      const executionConnection = await resolveDbtExecutionConnectionBinding({
        catalog: this.deps.warehouseConnectionCatalog,
        verifier: this.deps.executionConnectionBindingVerifier,
        scope,
        connectionRef: sourceBinding.connectionRef,
        targetProfile: sourceBinding.targetProfile,
        runtimeCredentialRef: sourceBinding.credentialRef,
      });
      if (!executionConnection.ok) {
        return rejectRunExecutionContext(executionConnection.reason);
      }

      const bundle = await this.deps.bundleBuilder.build({
        scope,
        projectRoot: sourceBinding.projectRoot,
        ...(sourceBinding.expectedContentSetSha256 === undefined
          ? {}
          : { expectedContentSetSha256: sourceBinding.expectedContentSetSha256 }),
      });
      if (!bundle.ok) return rejectRunExecutionContext(renderBundleFailure(bundle));

      pluginContexts['dbt'] = {
        projectBundleRef: bundle.projectBundleRef,
        targetProfile: sourceBinding.targetProfile,
        credentialRef: sourceBinding.credentialRef,
      };
    }

    const runExecutionContext = buildRunExecutionContext({
      command: commandWithPlanRef,
      context,
      scope,
      pluginContexts,
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
      return rejectRunExecutionContext(renderContextWriteFailure(writtenContext));
    }

    return this.deps.delegate.execute(
      { ...commandWithPlanRef, runExecutionContextRef: writtenContext.ref },
      context
    );
  }
}

function isDbtPlan(plan: ExecutionPlan, stepTypeRegistry: IStepTypeRegistry): boolean {
  return collectRequiredCapabilitiesForSteps(stepTypeRegistry, plan.steps).includes(
    DBT_STEP_REQUIRED_CAPABILITY
  );
}

function renderBundleFailure(failure: Extract<DbtProjectBundleBuildResult, { ok: false }>): string {
  switch (failure.reason) {
    case 'artifact_store_unavailable':
      return 'The DBT project bundle artifact store is not configured.';
    case 'artifact_store_unsupported':
      return 'The configured DBT project bundle store cannot create execution bundles.';
    case 'project_unavailable':
      return 'The authorized DBT project root is not available.';
    case 'project_unreadable':
      return 'The authorized DBT project could not be bundled safely.';
    case 'revision_mismatch':
      return 'The DBT project changed after Preview. Run Preview again before Run.';
  }
}

function renderContextWriteFailure(
  failure: Extract<RunExecutionContextWriteResult, { ok: false }>
): string {
  return failure.reason === 'artifact_store_unavailable'
    ? 'The run-context artifact store is not configured.'
    : failure.reason;
}

function rejectRunExecutionContext(reason: string): StartRunUseCaseResult {
  return {
    ok: true,
    value: {
      kind: START_RUN_RESULT_KIND.planRejected,
      accepted: false,
      code: START_RUN_PLAN_REJECTION_CODE.rejected,
      reason,
      cause: 'run_execution_context',
    },
  };
}
