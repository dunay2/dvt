/**
 * Owned concern: compile preview requests from canonical execution selection
 * through planner-owned selected-closure resolution without widening to the
 * whole protected draft.
 */
import type {
  IPlanStoreReader,
  IStoredPlanArtifactReader,
  IStoredPlanArtifactWriter,
} from '@dvt/artifacts';
import type {
  ExecutionPlan,
  ExecutionSelection,
  GenericGraphSourceV1,
  IPlanner,
  PlanRecord,
  PlanRef,
  PlannerSelection,
  PlanPreviewProvenance,
  PlanPreviewSelectionRejection,
} from '@dvt/contracts';
import { ConnectionRefSchema, TRANSFORMATION_STEP_KIND } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import {
  POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE,
  type PostgresTransformSqlValidationResult,
} from '../ports/postgresTransformSqlValidation.js';

import { resolveAuthorizedPlannerInputEnvelope } from './resolveAuthorizedPlannerInputEnvelope.js';
import { ResolveAuthorizedPreviewSelectionService } from './resolveAuthorizedPreviewSelection.js';
import {
  StoredPlanAdmissionCoordinator,
  type StoredPlanAdmissionResult,
} from './StoredPlanAdmissionCoordinator.js';
import type { StoredPlanExecutabilityValidator } from './StoredPlanExecutabilityValidator.js';
import type { ValidatePostgresTransformSqlUseCase } from './validatePostgresTransformSqlUseCase.js';

export interface PreviewPlanCommand {
  readonly targetAdapter: string;
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: ExecutionSelection;
  readonly provenance?: PlanPreviewProvenance;
  readonly observability?: ExecutionPlan['observability'];
}

export const PREVIEW_PLAN_RESULT_KIND = {
  accepted: 'accepted',
  selectionRejected: 'selection-rejected',
  planInvalid: 'plan-invalid',
  sqlNotReady: 'sql-not-ready',
} as const;

export type PreviewPlanUseCaseResult =
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.accepted;
      readonly plan: ExecutionPlan;
      readonly planRef: PlanRef;
      readonly planRecord: PlanRecord;
    }
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.selectionRejected;
      readonly rejection: PlanPreviewSelectionRejection;
    }
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.planInvalid;
      readonly plan: ExecutionPlan;
      readonly planRef: PlanRef;
      readonly planRecord: PlanRecord;
      readonly validation: Extract<
        StoredPlanAdmissionResult['validation'],
        { readonly status: 'ERROR' }
      >;
    }
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.sqlNotReady;
      readonly validation: Exclude<
        PostgresTransformSqlValidationResult,
        { readonly status: 'valid' }
      >;
    };

export class PreviewPlanUseCase {
  private readonly planAdmission: StoredPlanAdmissionCoordinator;

  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly planStore: IStoredPlanArtifactWriter &
        Pick<IStoredPlanArtifactReader, 'getStoredPlanValidationRecord'> &
        Pick<IPlanStoreReader, 'getPlanRecordByRef'>;
      readonly planValidator: Pick<StoredPlanExecutabilityValidator, 'materializeAndValidatePlan'>;
      readonly previewSelectionResolver: ResolveAuthorizedPreviewSelectionService;
      readonly validatePostgresTransformSql: Pick<ValidatePostgresTransformSqlUseCase, 'execute'>;
    }
  ) {
    this.planAdmission = new StoredPlanAdmissionCoordinator({
      planStore: deps.planStore,
      validator: deps.planValidator,
    });
  }

  public async execute(
    command: PreviewPlanCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<PreviewPlanUseCaseResult> {
    const previewSelection = await this.deps.previewSelectionResolver.execute(
      {
        selection: command.selection,
        graphSource: command.graphSource,
        ...(command.provenance === undefined ? {} : { provenance: command.provenance }),
      },
      context
    );
    if (!previewSelection.ok) {
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.selectionRejected,
        rejection: previewSelection.rejection,
      };
    }

    const sqlValidation = await validateAuthorizedPostgresSql(
      previewSelection.value.graphSource,
      previewSelection.value.nodeIds,
      context,
      this.deps.validatePostgresTransformSql
    );
    if (sqlValidation !== undefined) {
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.sqlNotReady,
        validation: sqlValidation,
      };
    }

    const plannerInputSeed = {
      graphSource: previewSelection.value.graphSource,
      selection: {
        selectedNodeIds: previewSelection.value.nodeIds,
      } satisfies PlannerSelection,
      decisionScope: {
        nodeIds: previewSelection.value.decisionScopeNodeIds,
        requestedRootNodeIds: previewSelection.value.requestedRootNodeIds,
      },
      ...(command.observability === undefined ? {} : { observability: command.observability }),
    };

    const plannerInput = resolveAuthorizedPlannerInputEnvelope(plannerInputSeed, context);

    const buildResult = await this.deps.planner.buildPlan(plannerInput);
    const admission = await this.planAdmission.admit(buildResult, command.targetAdapter);

    if (!admission.accepted) {
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.planInvalid,
        plan: admission.materialized?.plan ?? buildResult.plan,
        planRef: admission.planRef,
        planRecord: admission.planRecord,
        validation: admission.validation,
      };
    }

    return {
      kind: PREVIEW_PLAN_RESULT_KIND.accepted,
      plan: admission.materialized.plan,
      planRef: admission.planRef,
      planRecord: admission.planRecord,
    };
  }
}

async function validateAuthorizedPostgresSql(
  graphSource: GenericGraphSourceV1,
  nodeIds: readonly string[],
  context: AuthorizedCommandExecutionContext,
  validator: Pick<ValidatePostgresTransformSqlUseCase, 'execute'>
): Promise<
  Exclude<PostgresTransformSqlValidationResult, { readonly status: 'valid' }> | undefined
> {
  const scope = context.scope;
  if (scope.projectId === undefined || scope.environmentId === undefined) {
    return unavailableSqlValidation('Preview SQL validation requires environment scope.');
  }

  const authorizedNodeIds = new Set(nodeIds);
  for (const node of graphSource.nodes) {
    if (
      node.stepKind !== TRANSFORMATION_STEP_KIND.postgresSqlTransform ||
      !authorizedNodeIds.has(node.nodeId)
    ) {
      continue;
    }

    const connectionRef = ConnectionRefSchema.safeParse(node.stepTypeConfig?.connectionRef);
    const sql = node.stepTypeConfig?.sql;
    if (!connectionRef.success || typeof sql !== 'string') {
      return unavailableSqlValidation(
        'The PostgreSQL transform does not have a valid governed connection and SQL buffer.'
      );
    }

    const validation = await validator.execute({
      scope: {
        tenantId: scope.tenantId.value,
        projectId: scope.projectId.value,
        environmentId: scope.environmentId.value,
      },
      connectionRef: connectionRef.data,
      sql,
    });
    if (validation.status !== 'valid') {
      return validation;
    }
  }

  return undefined;
}

function unavailableSqlValidation(
  message: string
): Extract<PostgresTransformSqlValidationResult, { readonly status: 'unavailable' }> {
  return {
    status: 'unavailable',
    diagnostics: [
      {
        code: POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.connectionUnavailable,
        source: 'connection',
        message,
      },
    ],
  };
}
