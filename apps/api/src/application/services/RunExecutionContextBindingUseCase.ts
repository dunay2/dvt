/**
 * Owned concern: orchestrate one server-owned run-context binding for an
 * already persisted executable plan.
 */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import {
  DBT_STEP_REQUIRED_CAPABILITY,
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RESULT_KIND,
  TRANSFORMATION_STEP_KIND,
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
  collectRequiredCapabilitiesForSteps,
  type ConnectionRef,
  type ExecutionPlan,
  type IStepTypeRegistry,
  type RunExecutionContext,
  type StartRunCommand,
  parseRunExecutionContext,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { IDbtExecutionTargetResolver } from '../ports/dbtExecutionTarget.js';
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
import { WarehouseConnectionNotFoundError } from '../ports/warehouseSourceImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import { resolveDbtPlanExecutionBinding } from './dbtPlanExecutionBinding.js';
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
      readonly stepTypeRegistry: IStepTypeRegistry;
      readonly warehouseConnectionCatalog: IWarehouseConnectionCatalog;
      readonly postgresCredentialResolver: IPostgresCredentialBindingResolver;
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
    const postgresBinding = resolvePostgresPlanConnection(plan);
    if (!bindsDbt && postgresBinding.kind === 'not_applicable') {
      return this.deps.delegate.execute(command, context);
    }
    if (postgresBinding.kind === 'rejected') {
      return rejectRunExecutionContext(postgresBinding.reason);
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
      const executionConnection = await this.resolveDbtExecutionConnection(
        scope,
        sourceBinding.connectionRef
      );
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

    if (postgresBinding.kind === 'resolved') {
      const postgresContext = await this.resolvePostgresPluginContext(
        scope,
        postgresBinding.connectionRef
      );
      if (!postgresContext.ok) {
        return rejectRunExecutionContext(postgresContext.reason);
      }
      pluginContexts['postgres'] = postgresContext.value;
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

  private async resolveDbtExecutionConnection(
    scope: WorkspaceStorageScope,
    connectionRef: ConnectionRef
  ): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
    let connection: Awaited<ReturnType<IWarehouseConnectionCatalog['getConnection']>>;
    try {
      connection = await this.deps.warehouseConnectionCatalog.getConnection(
        scope,
        connectionRef.connectionId
      );
    } catch (error) {
      if (error instanceof WarehouseConnectionNotFoundError) {
        return {
          ok: false,
          reason: 'The Preview-bound DBT connection is not in this workspace.',
        };
      }
      throw error;
    }

    if (
      connection.id !== connectionRef.connectionId ||
      connection.type !== connectionRef.provider
    ) {
      return {
        ok: false,
        reason: 'The Preview-bound DBT connection identity is invalid.',
      };
    }
    return { ok: true };
  }

  private async resolvePostgresPluginContext(
    scope: WorkspaceStorageScope,
    connectionRef: ConnectionRef
  ): Promise<
    | { readonly ok: true; readonly value: Record<string, unknown> }
    | { readonly ok: false; readonly reason: string }
  > {
    let connection: Awaited<ReturnType<IWarehouseConnectionCatalog['getConnection']>>;
    try {
      connection = await this.deps.warehouseConnectionCatalog.getConnection(
        scope,
        connectionRef.connectionId
      );
    } catch (error) {
      if (error instanceof WarehouseConnectionNotFoundError) {
        return { ok: false, reason: 'The PlanRef PostgreSQL connection is not in this workspace.' };
      }
      throw error;
    }

    if (connection.id !== connectionRef.connectionId || connection.type !== 'postgres') {
      return { ok: false, reason: 'The PlanRef PostgreSQL connection binding is invalid.' };
    }
    if (connection.credentialRef === undefined) {
      return { ok: false, reason: 'The PlanRef PostgreSQL credential alias is missing.' };
    }

    const resolved = await this.deps.postgresCredentialResolver.resolveCredential(
      connection.credentialRef
    );
    if (resolved === null || resolved.trim().length === 0) {
      return { ok: false, reason: 'The PlanRef PostgreSQL credential alias is not configured.' };
    }

    return {
      ok: true,
      value: {
        connectionRef,
        credentialRef: connection.credentialRef,
      },
    };
  }
}

function isDbtPlan(plan: ExecutionPlan, stepTypeRegistry: IStepTypeRegistry): boolean {
  return collectRequiredCapabilitiesForSteps(stepTypeRegistry, plan.steps).includes(
    DBT_STEP_REQUIRED_CAPABILITY
  );
}

type PostgresPlanConnectionResolution =
  | Readonly<{ kind: 'not_applicable' }>
  | Readonly<{ kind: 'resolved'; connectionRef: ConnectionRef }>
  | Readonly<{ kind: 'rejected'; reason: string }>;

function resolvePostgresPlanConnection(plan: ExecutionPlan): PostgresPlanConnectionResolution {
  const expectedSteps = [
    {
      kind: TRANSFORMATION_STEP_KIND.preparePostgresTransform,
      schema: PreparePostgresTransformStepTypeConfigSchema,
    },
    {
      kind: TRANSFORMATION_STEP_KIND.postgresSqlTransform,
      schema: PostgresSqlTransformStepTypeConfigSchema,
    },
    {
      kind: TRANSFORMATION_STEP_KIND.captureMaterializationEvidence,
      schema: CaptureMaterializationEvidenceStepTypeConfigSchema,
    },
  ] as const;
  const sqlFirstSteps = plan.steps.filter((step) =>
    expectedSteps.some((expected) => expected.kind === step.kind)
  );
  if (sqlFirstSteps.length === 0) {
    return { kind: 'not_applicable' };
  }
  if (sqlFirstSteps.length !== expectedSteps.length) {
    return {
      kind: 'rejected',
      reason: 'The SQL-first PlanRef must contain one complete PostgreSQL step chain.',
    };
  }

  const connectionRefs: ConnectionRef[] = [];
  for (const expected of expectedSteps) {
    const matches = sqlFirstSteps.filter((step) => step.kind === expected.kind);
    if (matches.length !== 1) {
      return {
        kind: 'rejected',
        reason: 'The SQL-first PlanRef must contain each PostgreSQL step exactly once.',
      };
    }
    const parsed = expected.schema.safeParse(matches[0]?.stepTypeConfig);
    if (!parsed.success) {
      return {
        kind: 'rejected',
        reason: 'The SQL-first PlanRef contains an invalid PostgreSQL connection binding.',
      };
    }
    connectionRefs.push(parsed.data.connectionRef);
  }

  const connectionRef = connectionRefs[0];
  if (
    connectionRef === undefined ||
    connectionRefs.slice(1).some((candidate) => !sameConnectionRef(connectionRef, candidate))
  ) {
    return {
      kind: 'rejected',
      reason: 'All SQL-first PlanRef steps must use the same PostgreSQL connection.',
    };
  }
  return { kind: 'resolved', connectionRef };
}

function sameConnectionRef(left: ConnectionRef, right: ConnectionRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.connectionId === right.connectionId &&
    left.provider === right.provider
  );
}

function buildRunExecutionContext(input: {
  readonly command: StartRunCommand & { readonly planRef: NonNullable<StartRunCommand['planRef']> };
  readonly context: AuthorizedCommandExecutionContext;
  readonly scope: WorkspaceStorageScope;
  readonly pluginContexts: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
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
    tenantId: input.scope.tenantId,
    projectId: input.scope.projectId,
    environmentId: input.scope.environmentId,
    targetAdapter: input.command.targetAdapter,
    createdAtIso: resolveRunContextCreatedAtIso(input.command.runId, input.context.authorizedAt),
    createdBy: input.context.principal.principalId,
    pluginContexts: input.pluginContexts,
  });
}

function resolveRunContextCreatedAtIso(runId: string, authorizedAt: Date): string {
  const uuid = runId.startsWith('run_') ? runId.slice('run_'.length) : '';
  const segments = uuid.split('-');
  if (
    segments.length !== 5 ||
    segments[0]?.length !== 8 ||
    segments[1]?.length !== 4 ||
    segments[2]?.length !== 4 ||
    segments[2]?.[0] !== '7' ||
    !/^[0-9a-f]+$/u.test(segments.join(''))
  ) {
    return authorizedAt.toISOString();
  }

  const timestampMs = Number.parseInt(`${segments[0]}${segments[1]}`, 16);
  return new Date(timestampMs).toISOString();
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
