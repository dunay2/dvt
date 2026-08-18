/** Owned concern: resolve one authorized run result into the bounded warehouse row-sample rail. */
import type { IPlanStoreReader } from '@dvt/artifacts';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  TRANSFORMATION_STEP_KIND,
  buildRelationalSourceObjectId,
  parseExecutionPlan,
  type SourceDataSampleResponse,
} from '@dvt/contracts';

import type { AuthorizedQueryExecutionContext, IGetRunStatusUseCase } from '../ports/runtime.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';

import type { PreviewWarehouseSourceObjectRowsUseCase } from './previewWarehouseSourceObjectRowsUseCase.js';

export type RunMaterializationSampleUnavailableReason =
  | 'run_not_completed'
  | 'materialization_evidence_unavailable'
  | 'materialization_target_unavailable'
  | 'materialization_target_mismatch';

export class RunMaterializationSampleUnavailableError extends Error {
  public constructor(readonly reason: RunMaterializationSampleUnavailableReason) {
    super(`Run materialization sample is unavailable: ${reason}`);
    this.name = 'RunMaterializationSampleUnavailableError';
  }
}

type PreviewRunMaterializationRowsDependencies = {
  readonly getRunStatus: IGetRunStatusUseCase;
  readonly planStore: Pick<IPlanStoreReader, 'getPlanRecord'>;
  readonly catalog: IWarehouseConnectionCatalog;
  readonly previewRows: Pick<PreviewWarehouseSourceObjectRowsUseCase, 'execute'>;
};

export class PreviewRunMaterializationRowsUseCase {
  public constructor(private readonly dependencies: PreviewRunMaterializationRowsDependencies) {}

  public async execute(
    query: Readonly<{ runId: string; limit: number }>,
    context: AuthorizedQueryExecutionContext
  ): Promise<SourceDataSampleResponse> {
    const run = await this.dependencies.getRunStatus.execute(
      { runId: query.runId, enriched: false },
      context
    );
    if (run.status !== 'COMPLETED') {
      throw new RunMaterializationSampleUnavailableError('run_not_completed');
    }
    if (run.materialization?.executor !== 'postgres') {
      throw new RunMaterializationSampleUnavailableError('materialization_evidence_unavailable');
    }

    const scope = {
      tenantId: run.tenantId,
      projectId: run.projectId,
      environmentId: run.environmentId,
    };
    const planRecord = await this.dependencies.planStore.getPlanRecord({
      ...scope,
      planId: run.planId,
    });
    if (planRecord === undefined) {
      throw new RunMaterializationSampleUnavailableError('materialization_target_unavailable');
    }

    const target = resolveMaterializationTarget(planRecord.canonicalPlanJson);
    if (target === null) {
      throw new RunMaterializationSampleUnavailableError('materialization_target_unavailable');
    }
    if (`${target.schema}.${target.table}` !== run.materialization.sinkTable) {
      throw new RunMaterializationSampleUnavailableError('materialization_target_mismatch');
    }

    const connection = await this.dependencies.catalog.getConnection(scope, target.connectionId);
    return this.dependencies.previewRows.execute({
      scope,
      connectionId: target.connectionId,
      objectId: buildRelationalSourceObjectId({
        kind: 'relation',
        catalog: connection.database,
        schema: target.schema,
        name: target.table,
        relationType: target.relationType,
      }),
      limit: query.limit,
    });
  }
}

function resolveMaterializationTarget(canonicalPlanJson: string): Readonly<{
  connectionId: string;
  schema: string;
  table: string;
  relationType: 'table' | 'view';
}> | null {
  try {
    const plan = parseExecutionPlan(JSON.parse(canonicalPlanJson));
    const captureSteps = plan.steps.filter(
      (step) => step.kind === TRANSFORMATION_STEP_KIND.captureMaterializationEvidence
    );
    if (captureSteps.length !== 1) {
      return null;
    }
    const config = CaptureMaterializationEvidenceStepTypeConfigSchema.parse(
      captureSteps[0]?.stepTypeConfig
    );
    return {
      connectionId: config.connectionRef.connectionId,
      schema: config.sinkSchema,
      table: config.sinkTable,
      relationType: config.materialization,
    };
  } catch {
    return null;
  }
}
