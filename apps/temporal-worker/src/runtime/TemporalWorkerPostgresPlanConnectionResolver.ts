/**
 * @ownedConcern Resolve a SQL-first PlanRef PostgreSQL binding at the worker boundary.
 */
import type {
  IPostgresCredentialBindingResolver,
  IPostgresPlanConnectionResolver,
  PostgresPlanConnection,
} from '@dvt/adapter-postgres';
import { PostgresPlanConnectionRejectedError } from '@dvt/adapter-postgres';
import type { IRunExecutionContextReader } from '@dvt/artifacts';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
  TRANSFORMATION_STEP_KIND,
  parsePostgresPluginContext,
  type ConnectionRef,
  type ExecutionPlan,
  type ResolvedRunContext,
  type RunExecutionContext,
} from '@dvt/contracts';

export class TemporalWorkerPostgresPlanConnectionResolver implements IPostgresPlanConnectionResolver {
  public constructor(
    private readonly runExecutionContextReader: IRunExecutionContextReader,
    private readonly credentialResolver: IPostgresCredentialBindingResolver
  ) {}

  public async resolveConnection(
    step: ExecutionPlan['steps'][number],
    context: ResolvedRunContext
  ): Promise<PostgresPlanConnection> {
    const ref = context.runExecutionContextRef;
    if (ref === undefined) {
      reject('POSTGRES_RUN_CONTEXT_REF_REQUIRED');
    }

    const runExecutionContext = await this.readRunExecutionContext(ref);
    assertRunExecutionContextAlignment(runExecutionContext, context, ref);
    const postgresContext = resolvePostgresPluginContext(runExecutionContext);
    const stepConnectionRef = resolveStepConnectionRef(step);
    if (!sameConnectionRef(postgresContext.connectionRef, stepConnectionRef)) {
      reject('POSTGRES_PLAN_CONNECTION_REF_MISMATCH');
    }

    const connectionString = await this.credentialResolver.resolveCredential(
      postgresContext.credentialRef
    );
    if (connectionString === null || connectionString.trim().length === 0) {
      reject('POSTGRES_PLAN_CREDENTIAL_NOT_CONFIGURED');
    }

    return {
      connectionRef: postgresContext.connectionRef,
      credentialRef: postgresContext.credentialRef,
      connectionString,
    };
  }

  private async readRunExecutionContext(
    ref: NonNullable<ResolvedRunContext['runExecutionContextRef']>
  ): Promise<RunExecutionContext> {
    try {
      return await this.runExecutionContextReader.resolve(ref);
    } catch (_error) {
      reject('POSTGRES_RUN_CONTEXT_INVALID');
    }
  }
}

function assertRunExecutionContextAlignment(
  runExecutionContext: RunExecutionContext,
  context: ResolvedRunContext,
  ref: NonNullable<ResolvedRunContext['runExecutionContextRef']>
): void {
  if (
    runExecutionContext.tenantId !== context.tenantId ||
    runExecutionContext.projectId !== context.projectId ||
    runExecutionContext.environmentId !== context.environmentId
  ) {
    reject('POSTGRES_RUN_CONTEXT_SCOPE_MISMATCH');
  }
  if (
    runExecutionContext.planId !== ref.planId ||
    runExecutionContext.planVersion !== ref.planVersion
  ) {
    reject('POSTGRES_RUN_CONTEXT_PLAN_REF_MISMATCH');
  }
}

function resolvePostgresPluginContext(
  runExecutionContext: RunExecutionContext
): ReturnType<typeof parsePostgresPluginContext> {
  try {
    return parsePostgresPluginContext(runExecutionContext.pluginContexts['postgres']);
  } catch (_error) {
    reject('POSTGRES_RUN_CONTEXT_BINDING_INVALID');
  }
}

function resolveStepConnectionRef(step: ExecutionPlan['steps'][number]): ConnectionRef {
  const schema = resolveStepConfigSchema(step.kind);
  const parsed = schema.safeParse(step.stepTypeConfig);
  if (!parsed.success) {
    reject('POSTGRES_PLAN_STEP_BINDING_INVALID');
  }
  return parsed.data.connectionRef;
}

function resolveStepConfigSchema(
  kind: string
):
  | typeof PreparePostgresTransformStepTypeConfigSchema
  | typeof PostgresSqlTransformStepTypeConfigSchema
  | typeof CaptureMaterializationEvidenceStepTypeConfigSchema {
  switch (kind) {
    case TRANSFORMATION_STEP_KIND.preparePostgresTransform:
      return PreparePostgresTransformStepTypeConfigSchema;
    case TRANSFORMATION_STEP_KIND.postgresSqlTransform:
      return PostgresSqlTransformStepTypeConfigSchema;
    case TRANSFORMATION_STEP_KIND.captureMaterializationEvidence:
      return CaptureMaterializationEvidenceStepTypeConfigSchema;
    default:
      reject('POSTGRES_PLAN_STEP_KIND_UNSUPPORTED');
  }
}

function sameConnectionRef(left: ConnectionRef, right: ConnectionRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.connectionId === right.connectionId &&
    left.provider === right.provider
  );
}

function reject(code: string): never {
  throw new PostgresPlanConnectionRejectedError(code);
}
