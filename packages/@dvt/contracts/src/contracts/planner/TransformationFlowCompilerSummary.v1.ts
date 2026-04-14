import type { ExecutionPlan, ExecutionStep } from './ExecutionPlan.v1.js';
import {
  TRANSFORMATION_STEP_KIND,
  type TransformationStepKind,
} from './TransformationFlowStepKinds.v1.js';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
} from './TransformationFlowStepTypeConfigs.v1.js';

export interface TransformationSqlFirstPlanSummary {
  executor: 'postgres';
  nodeCount: 3;
  stepCount: 3;
  sourceTables: readonly [string];
  sinkTables: readonly [string];
}

export function summarizeTransformationSqlFirstPlan(
  plan: Pick<ExecutionPlan, 'steps'>
): TransformationSqlFirstPlanSummary {
  if (plan.steps.length !== 3) {
    throw new Error(
      'Transformation SQL-first plan requires exactly 3 steps: prepare, transform, and evidence.'
    );
  }

  const prepareStep = findPlanStep(plan.steps, TRANSFORMATION_STEP_KIND.preparePostgresTransform);
  const transformStep = findPlanStep(plan.steps, TRANSFORMATION_STEP_KIND.postgresSqlTransform);
  const captureStep = findPlanStep(
    plan.steps,
    TRANSFORMATION_STEP_KIND.captureMaterializationEvidence
  );

  if (prepareStep === undefined || transformStep === undefined || captureStep === undefined) {
    throw new Error(
      'Transformation SQL-first plan must contain the canonical prepare, transform, and evidence step kinds.'
    );
  }

  const prepareConfig = PreparePostgresTransformStepTypeConfigSchema.parse(
    prepareStep.stepTypeConfig
  );
  const transformConfig = PostgresSqlTransformStepTypeConfigSchema.parse(
    transformStep.stepTypeConfig
  );
  const captureConfig = CaptureMaterializationEvidenceStepTypeConfigSchema.parse(
    captureStep.stepTypeConfig
  );

  if (transformStep.dependsOn.length !== 1 || transformStep.dependsOn[0] !== prepareStep.stepId) {
    throw new Error(
      'Transformation SQL-first plan requires POSTGRES_SQL_TRANSFORM to depend on PREPARE_POSTGRES_TRANSFORM.'
    );
  }

  if (captureStep.dependsOn.length !== 1 || captureStep.dependsOn[0] !== transformStep.stepId) {
    throw new Error(
      'Transformation SQL-first plan requires CAPTURE_MATERIALIZATION_EVIDENCE to depend on POSTGRES_SQL_TRANSFORM.'
    );
  }

  if (prepareConfig.targetSchema !== transformConfig.sinkSchema) {
    throw new Error(
      'Transformation SQL-first plan requires prepare targetSchema to match transform sinkSchema.'
    );
  }

  if (
    transformConfig.sinkSchema !== captureConfig.sinkSchema ||
    transformConfig.sinkTable !== captureConfig.sinkTable
  ) {
    throw new Error(
      'Transformation SQL-first plan requires transform and evidence steps to reference the same sink.'
    );
  }

  return {
    executor: 'postgres',
    nodeCount: 3,
    stepCount: 3,
    sourceTables: [formatQualifiedTable(prepareConfig.sourceSchema, prepareConfig.sourceTable)],
    sinkTables: [formatQualifiedTable(captureConfig.sinkSchema, captureConfig.sinkTable)],
  };
}

function findPlanStep<TKind extends TransformationStepKind>(
  steps: readonly ExecutionStep[],
  stepKind: TKind
): ExecutionStep | undefined {
  return steps.find((step) => step.kind === stepKind);
}

function formatQualifiedTable(schema: string, table: string): `${string}.${string}` {
  return `${schema}.${table}`;
}
