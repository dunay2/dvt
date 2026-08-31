import type { ExecutionPlan } from './ExecutionPlan.v1.js';
import { TRANSFORMATION_STEP_KIND } from './TransformationFlowStepKinds.v1.js';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
} from './TransformationFlowStepTypeConfigs.v1.js';

export interface TransformationSqlFirstPlanSummary {
  executor: 'postgres';
  nodeCount: 3 | 4;
  stepCount: 3 | 4;
  sourceTables: readonly [string] | readonly [string, string];
  sinkTables: readonly [string];
}

export function summarizeTransformationSqlFirstPlan(
  plan: Pick<ExecutionPlan, 'steps'>
): TransformationSqlFirstPlanSummary {
  if (plan.steps.length < 3 || plan.steps.length > 4) {
    throw new Error(
      'Transformation SQL-first plan requires 3 or 4 steps: one or two prepares, transform, and evidence.'
    );
  }

  const prepareSteps = plan.steps.filter(
    (step) => step.kind === TRANSFORMATION_STEP_KIND.preparePostgresTransform
  );
  const transformSteps = plan.steps.filter(
    (step) => step.kind === TRANSFORMATION_STEP_KIND.postgresSqlTransform
  );
  const captureSteps = plan.steps.filter(
    (step) => step.kind === TRANSFORMATION_STEP_KIND.captureMaterializationEvidence
  );
  const transformStep = transformSteps[0];
  const captureStep = captureSteps[0];

  if (
    prepareSteps.length < 1 ||
    prepareSteps.length > 2 ||
    transformSteps.length !== 1 ||
    captureSteps.length !== 1 ||
    transformStep === undefined ||
    captureStep === undefined
  ) {
    throw new Error(
      'Transformation SQL-first plan must contain one or two prepares, one transform, and one evidence step.'
    );
  }

  const prepareConfigs = prepareSteps.map((prepareStep) =>
    PreparePostgresTransformStepTypeConfigSchema.parse(prepareStep.stepTypeConfig)
  );
  const transformConfig = PostgresSqlTransformStepTypeConfigSchema.parse(
    transformStep.stepTypeConfig
  );
  const captureConfig = CaptureMaterializationEvidenceStepTypeConfigSchema.parse(
    captureStep.stepTypeConfig
  );

  const prepareStepIds = new Set(prepareSteps.map((prepareStep) => prepareStep.stepId));
  if (
    transformStep.dependsOn.length !== prepareSteps.length ||
    transformStep.dependsOn.some((stepId) => !prepareStepIds.has(stepId))
  ) {
    throw new Error(
      'Transformation SQL-first plan requires POSTGRES_SQL_TRANSFORM to depend on every PREPARE_POSTGRES_TRANSFORM.'
    );
  }

  if (captureStep.dependsOn.length !== 1 || captureStep.dependsOn[0] !== transformStep.stepId) {
    throw new Error(
      'Transformation SQL-first plan requires CAPTURE_MATERIALIZATION_EVIDENCE to depend on POSTGRES_SQL_TRANSFORM.'
    );
  }

  if (
    prepareConfigs.some(
      (prepareConfig) => prepareConfig.targetSchema !== transformConfig.sinkSchema
    )
  ) {
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
  const stepCount = plan.steps.length as 3 | 4;

  return {
    executor: 'postgres',
    nodeCount: stepCount,
    stepCount,
    sourceTables: prepareConfigs
      .map((prepareConfig) =>
        formatQualifiedTable(prepareConfig.sourceSchema, prepareConfig.sourceTable)
      )
      .sort() as [string] | [string, string],
    sinkTables: [formatQualifiedTable(captureConfig.sinkSchema, captureConfig.sinkTable)],
  };
}

function formatQualifiedTable(schema: string, table: string): `${string}.${string}` {
  return `${schema}.${table}`;
}
