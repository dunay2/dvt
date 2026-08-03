/**
 * Owned concern: orchestrate server-owned DBT bundle and run-context binding
 * for an already persisted executable plan.
 */
import {
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RESULT_KIND,
  type DbtProjectBundleRef,
  type ExecutionPlan,
  type RunExecutionContext,
  type RunExecutionPolicy,
  type ScopedPlanRef,
  type StartRunCommand,
  parseRunExecutionContext,
} from '@dvt/contracts';
import { TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS } from '@dvt/temporal-dbt-plugin';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { IDbtExecutionTargetResolver } from '../ports/dbtExecutionTarget.js';
import type {
  DbtProjectBundleBuildResult,
  IDbtProjectBundleBuilder,
} from '../ports/dbtProjectBundle.js';
import type {
  DbtRunExecutionContextWriteResult,
  IDbtRunExecutionContextWriter,
} from '../ports/dbtRunExecutionContextWriter.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import { resolveDbtPlanExecutionBinding } from './dbtPlanExecutionBinding.js';
import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

type StoredPlanArtifactReader = {
  fetchStoredPlanArtifactForValidation(input: ScopedPlanRef): Promise<{
    readonly bytes: Uint8Array;
    readonly executionPolicy?: RunExecutionPolicy;
  }>;
};

const DBT_EXECUTABLE_STEP_KINDS = new Set<string>(TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS);
const CALLER_CONTEXT_REJECTION =
  'Caller-provided run execution context references are not accepted for DBT execution.';

export class DbtRunExecutionContextBindingUseCase implements IStartRunUseCase {
  public constructor(
    private readonly deps: {
      readonly delegate: IStartRunUseCase;
      readonly planStore: StoredPlanArtifactReader;
      readonly bundleBuilder: IDbtProjectBundleBuilder;
      readonly contextWriter: IDbtRunExecutionContextWriter;
      readonly executionTargetResolver: IDbtExecutionTargetResolver;
    }
  ) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    if (command.planRef === undefined) return this.deps.delegate.execute(command, context);
    const commandWithPlanRef = { ...command, planRef: command.planRef };

    const scopedPlanRef = toScopedPlanRef(commandWithPlanRef, context);
    const artifact = await this.deps.planStore.fetchStoredPlanArtifactForValidation(scopedPlanRef);
    const plan = parseStoredExecutablePlan(artifact.bytes, { rejectUnknownStepKinds: false });
    if (!isDbtPlan(plan)) return this.deps.delegate.execute(command, context);
    if (command.runExecutionContextRef !== undefined) {
      return rejectRunExecutionContext(CALLER_CONTEXT_REJECTION);
    }

    const scope = toWorkspaceStorageScope(context);
    if (scope === null) {
      return rejectRunExecutionContext(
        'DBT project execution requires tenant, project, and environment scope.'
      );
    }
    const sourceBinding = resolveDbtPlanExecutionBinding({
      plan,
      targetAdapter: commandWithPlanRef.targetAdapter,
      executionTarget: this.deps.executionTargetResolver.resolve(),
    });
    if (!sourceBinding.ok) return rejectRunExecutionContext(sourceBinding.reason);

    const bundle = await this.deps.bundleBuilder.build({
      scope,
      projectRoot: sourceBinding.projectRoot,
      ...(sourceBinding.expectedContentSetSha256 === undefined
        ? {}
        : { expectedContentSetSha256: sourceBinding.expectedContentSetSha256 }),
    });
    if (!bundle.ok) return rejectRunExecutionContext(renderBundleFailure(bundle));

    const runExecutionContext = buildRunExecutionContext({
      command: commandWithPlanRef,
      context,
      projectBundleRef: bundle.projectBundleRef,
      targetProfile: sourceBinding.targetProfile,
      credentialRef: sourceBinding.credentialRef,
      ...(artifact.executionPolicy?.pluginCompatibilityFingerprint === undefined
        ? {}
        : {
            pluginCompatibilityFingerprint: artifact.executionPolicy.pluginCompatibilityFingerprint,
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

function toWorkspaceStorageScope(
  context: AuthorizedCommandExecutionContext
): WorkspaceStorageScope | null {
  const projectId = context.scope.projectId?.value;
  const environmentId = context.scope.environmentId?.value;
  if (projectId === undefined || environmentId === undefined) return null;
  return { tenantId: context.scope.tenantId.value, projectId, environmentId };
}

function toScopedPlanRef(
  command: StartRunCommand & { readonly planRef: NonNullable<StartRunCommand['planRef']> },
  context: AuthorizedCommandExecutionContext
): ScopedPlanRef {
  return {
    tenantId: context.scope.tenantId.value,
    projectId: context.scope.projectId?.value ?? '',
    environmentId: context.scope.environmentId?.value ?? '',
    planRef: command.planRef,
  };
}

function isDbtPlan(plan: ExecutionPlan): boolean {
  return plan.steps.some((step) => DBT_EXECUTABLE_STEP_KINDS.has(step.kind));
}

function buildRunExecutionContext(input: {
  readonly command: StartRunCommand & { readonly planRef: NonNullable<StartRunCommand['planRef']> };
  readonly context: AuthorizedCommandExecutionContext;
  readonly projectBundleRef: DbtProjectBundleRef;
  readonly targetProfile: string;
  readonly credentialRef: string;
  readonly pluginCompatibilityFingerprint?: string;
}): RunExecutionContext {
  return parseRunExecutionContext({
    schemaVersion: 'v1.0',
    planId: input.command.planRef.planId,
    planVersion: input.command.planRef.planVersion,
    planSha256: input.command.planRef.sha256,
    ...(input.pluginCompatibilityFingerprint === undefined
      ? {}
      : { pluginCompatibilityFingerprint: input.pluginCompatibilityFingerprint }),
    tenantId: input.context.scope.tenantId.value,
    projectId: input.context.scope.projectId?.value ?? '',
    environmentId: input.context.scope.environmentId?.value ?? '',
    targetAdapter: input.command.targetAdapter,
    createdAtIso: input.context.authorizedAt.toISOString(),
    createdBy: input.context.principal.principalId,
    pluginContexts: {
      dbt: {
        projectBundleRef: input.projectBundleRef,
        targetProfile: input.targetProfile,
        credentialRef: input.credentialRef,
      },
    },
  });
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
  failure: Extract<DbtRunExecutionContextWriteResult, { ok: false }>
): string {
  return failure.reason === 'artifact_store_unavailable'
    ? 'The DBT run-context artifact store is not configured.'
    : 'The configured DBT run-context store cannot persist execution context.';
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
