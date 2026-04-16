import { z } from 'zod';

import { summarizeTransformationSqlFirstPlan } from '../contracts/planner/TransformationFlowCompiler.v1.js';
import { PlanPreviewProvenanceSchema } from '../contracts/planner/TransformationFlowDesignGraph.v1.js';
import { PREVIEW_PROFILE } from '../contracts/planner/TransformationFlowPreview.v1.js';

import {
  NonBlankStringSchema,
  PlanRefSchema,
  Sha256HexStringSchema,
  TransformationExecutorSchema,
} from './common.js';
import { ExecutionPlanSchema } from './execution-plan.js';
import { PreviewProfileSchema } from './plan-preview-profile.js';

function addPlanPreviewResponseIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string
): void {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

function haveMatchingValues(
  actualValues: readonly string[],
  expectedValues: readonly string[]
): boolean {
  if (actualValues.length !== expectedValues.length) {
    return false;
  }

  return actualValues.every((value, index) => value === expectedValues[index]);
}

export const PlanPreviewSummarySchema = z
  .object({
    executor: TransformationExecutorSchema,
    nodeCount: z.number().int().nonnegative(),
    stepCount: z.number().int().nonnegative(),
    sourceTables: z.array(NonBlankStringSchema),
    sinkTables: z.array(NonBlankStringSchema),
  })
  .strict();

export const PlanPreviewPersistedRecordSchema = z
  .object({
    planRecordId: NonBlankStringSchema,
    canonicalPlanSha256: Sha256HexStringSchema,
  })
  .strict();

export const PlanPreviewValidationSchema = z
  .object({
    valid: z.literal(true),
    warnings: z.array(z.string()),
  })
  .strict();

export const PlanPreviewPersistResponseSchema = z
  .object({
    previewProfile: PreviewProfileSchema,
    plan: ExecutionPlanSchema,
    planRef: PlanRefSchema,
    planSummary: PlanPreviewSummarySchema.optional(),
    persisted: PlanPreviewPersistedRecordSchema,
    validation: PlanPreviewValidationSchema,
    provenance: PlanPreviewProvenanceSchema.optional(),
  })
  .strict()
  .superRefine((response, ctx) => {
    if (response.previewProfile !== PREVIEW_PROFILE.transformationSqlFirstV1) {
      return;
    }

    if (response.provenance === undefined) {
      addPlanPreviewResponseIssue(
        ctx,
        ['provenance'],
        'transformation-sql-first-v1 responses require graphArtifact and sqlArtifact provenance.'
      );
    }

    if (response.planSummary === undefined) {
      addPlanPreviewResponseIssue(
        ctx,
        ['planSummary'],
        'transformation-sql-first-v1 responses require planSummary.'
      );
      return;
    }

    if (response.planSummary.executor !== 'postgres') {
      addPlanPreviewResponseIssue(
        ctx,
        ['planSummary', 'executor'],
        'transformation-sql-first-v1 responses require executor postgres.'
      );
    }

    let expectedSummary: ReturnType<typeof summarizeTransformationSqlFirstPlan> | undefined;
    try {
      expectedSummary = summarizeTransformationSqlFirstPlan(response.plan);
    } catch (error: unknown) {
      addPlanPreviewResponseIssue(
        ctx,
        ['plan'],
        error instanceof Error
          ? error.message
          : 'transformation-sql-first-v1 responses require the canonical compiler plan shape.'
      );
      return;
    }

    if (response.planSummary.nodeCount !== expectedSummary.nodeCount) {
      addPlanPreviewResponseIssue(
        ctx,
        ['planSummary', 'nodeCount'],
        `transformation-sql-first-v1 responses require nodeCount ${expectedSummary.nodeCount}.`
      );
    }

    if (response.planSummary.stepCount !== expectedSummary.stepCount) {
      addPlanPreviewResponseIssue(
        ctx,
        ['planSummary', 'stepCount'],
        `transformation-sql-first-v1 responses require stepCount ${expectedSummary.stepCount}.`
      );
    }

    if (!haveMatchingValues(response.planSummary.sourceTables, expectedSummary.sourceTables)) {
      addPlanPreviewResponseIssue(
        ctx,
        ['planSummary', 'sourceTables'],
        'transformation-sql-first-v1 responses require sourceTables derived from the canonical compiler plan.'
      );
    }

    if (!haveMatchingValues(response.planSummary.sinkTables, expectedSummary.sinkTables)) {
      addPlanPreviewResponseIssue(
        ctx,
        ['planSummary', 'sinkTables'],
        'transformation-sql-first-v1 responses require sinkTables derived from the canonical compiler plan.'
      );
    }
  });

export type PlanPreviewSummarySchemaT = z.infer<typeof PlanPreviewSummarySchema>;
export type PlanPreviewPersistedRecordSchemaT = z.infer<typeof PlanPreviewPersistedRecordSchema>;
export type PlanPreviewValidationSchemaT = z.infer<typeof PlanPreviewValidationSchema>;
export type PlanPreviewPersistResponseSchemaT = z.infer<typeof PlanPreviewPersistResponseSchema>;
