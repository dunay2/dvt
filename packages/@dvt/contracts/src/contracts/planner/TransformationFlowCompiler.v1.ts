/**
 * SQL-first transformation compiler mapping contract (TF-A1-B).
 *
 * Baseline ADRs:
 * - ADR-0003 execution model sovereignty
 * - ADR-0005 contract formalization tooling
 * - ADR-0006 repository-authoritative contract governance
 * - ADR-0012 plan integrity ownership
 * - ADR-0018 shared-kernel ownership governance
 */
import { z } from 'zod';

import { isNonBlankString, NON_BLANK_STRING_MESSAGE } from '../../utils/contractPrimitives.js';

import {
  GENERIC_GRAPH_SOURCE_KIND,
  type GenericGraphNodeV1,
  type GenericGraphSourceV1,
} from './ExecutionPlan.v1.js';
import {
  TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY,
  TRANSFORMATION_SQL_FIRST_SOURCE_VERSION,
} from './TransformationFlowDesignGraph.v1.js';
import {
  TRANSFORMATION_STEP_KIND,
  type TransformationStepKind,
} from './TransformationFlowStepKinds.v1.js';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
} from './TransformationFlowStepTypeConfigs.v1.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();

export { summarizeTransformationSqlFirstPlan } from './TransformationFlowCompilerSummary.v1.js';
export type { TransformationSqlFirstPlanSummary } from './TransformationFlowCompilerSummary.v1.js';
export {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
} from './TransformationFlowStepTypeConfigs.v1.js';
export type {
  CaptureMaterializationEvidenceStepTypeConfig,
  PostgresSqlTransformStepTypeConfig,
  PreparePostgresTransformStepTypeConfig,
} from './TransformationFlowStepTypeConfigs.v1.js';
export { TRANSFORMATION_STEP_KIND } from './TransformationFlowStepKinds.v1.js';
export type { TransformationStepKind } from './TransformationFlowStepKinds.v1.js';

export type TransformationCompilerGraphNodeV1 = GenericGraphNodeV1;

export interface TransformationSqlFirstCompilerGraphSourceV1 extends Omit<
  GenericGraphSourceV1,
  'sourceFamily' | 'sourceVersion'
> {
  kind: typeof GENERIC_GRAPH_SOURCE_KIND;
  sourceFamily: typeof TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY;
  sourceVersion: typeof TRANSFORMATION_SQL_FIRST_SOURCE_VERSION;
}

const TransformationNodeMetadataSchema = z
  .object({
    displayName: NonBlankStringSchema.optional(),
    sourceRef: NonBlankStringSchema.optional(),
    tags: z.record(z.string(), z.string()).optional(),
  })
  .strict()
  .optional();

const TransformationPrepareGraphNodeSchema = z
  .object({
    nodeId: NonBlankStringSchema,
    stepKind: z.literal(TRANSFORMATION_STEP_KIND.preparePostgresTransform),
    dependsOn: z.tuple([]),
    stepTypeConfig: PreparePostgresTransformStepTypeConfigSchema,
    metadata: TransformationNodeMetadataSchema,
  })
  .strict();

const TransformationPostgresSqlGraphNodeSchema = z
  .object({
    nodeId: NonBlankStringSchema,
    stepKind: z.literal(TRANSFORMATION_STEP_KIND.postgresSqlTransform),
    dependsOn: z.tuple([NonBlankStringSchema]),
    stepTypeConfig: PostgresSqlTransformStepTypeConfigSchema,
    metadata: TransformationNodeMetadataSchema,
  })
  .strict();

const TransformationCaptureGraphNodeSchema = z
  .object({
    nodeId: NonBlankStringSchema,
    stepKind: z.literal(TRANSFORMATION_STEP_KIND.captureMaterializationEvidence),
    dependsOn: z.tuple([NonBlankStringSchema]),
    stepTypeConfig: CaptureMaterializationEvidenceStepTypeConfigSchema,
    metadata: TransformationNodeMetadataSchema,
  })
  .strict();

export const TransformationCompilerGraphNodeV1Schema = z.discriminatedUnion('stepKind', [
  TransformationPrepareGraphNodeSchema,
  TransformationPostgresSqlGraphNodeSchema,
  TransformationCaptureGraphNodeSchema,
]);

type ParsedTransformationCompilerGraphNode = z.infer<
  typeof TransformationCompilerGraphNodeV1Schema
>;

export const TransformationSqlFirstCompilerGraphSourceSchema = z
  .object({
    kind: z.literal(GENERIC_GRAPH_SOURCE_KIND),
    sourceFamily: z.literal(TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY),
    sourceVersion: z.literal(TRANSFORMATION_SQL_FIRST_SOURCE_VERSION),
    nodes: z.array(TransformationCompilerGraphNodeV1Schema).length(3),
  })
  .strict()
  .superRefine((graphSource, ctx) => {
    const prepareNode = findCompilerNode(
      graphSource.nodes,
      TRANSFORMATION_STEP_KIND.preparePostgresTransform
    );
    const transformNode = findCompilerNode(
      graphSource.nodes,
      TRANSFORMATION_STEP_KIND.postgresSqlTransform
    );
    const captureNode = findCompilerNode(
      graphSource.nodes,
      TRANSFORMATION_STEP_KIND.captureMaterializationEvidence
    );

    if (prepareNode === undefined || transformNode === undefined || captureNode === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nodes'],
        message:
          'transformation-sql-first-v1 requires exactly one prepare, one transform, and one evidence node.',
      });
      return;
    }

    const prepareConfig = prepareNode.stepTypeConfig;
    const transformConfig = transformNode.stepTypeConfig;
    const captureConfig = captureNode.stepTypeConfig;

    if (transformNode.dependsOn.length !== 1 || transformNode.dependsOn[0] !== prepareNode.nodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nodes'],
        message: 'POSTGRES_SQL_TRANSFORM must depend on the PREPARE_POSTGRES_TRANSFORM node id.',
      });
    }

    if (captureNode.dependsOn.length !== 1 || captureNode.dependsOn[0] !== transformNode.nodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nodes'],
        message:
          'CAPTURE_MATERIALIZATION_EVIDENCE must depend on the POSTGRES_SQL_TRANSFORM node id.',
      });
    }

    if (prepareConfig.targetSchema !== transformConfig.sinkSchema) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nodes'],
        message:
          'PREPARE_POSTGRES_TRANSFORM targetSchema must match POSTGRES_SQL_TRANSFORM sinkSchema.',
      });
    }

    if (
      transformConfig.sinkSchema !== captureConfig.sinkSchema ||
      transformConfig.sinkTable !== captureConfig.sinkTable
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nodes'],
        message:
          'POSTGRES_SQL_TRANSFORM and CAPTURE_MATERIALIZATION_EVIDENCE must reference the same sink.',
      });
    }
  });

function findCompilerNode<TKind extends TransformationStepKind>(
  nodes: readonly ParsedTransformationCompilerGraphNode[],
  stepKind: TKind
): Extract<ParsedTransformationCompilerGraphNode, { stepKind: TKind }> | undefined {
  return nodes.find(
    (node): node is Extract<ParsedTransformationCompilerGraphNode, { stepKind: TKind }> =>
      node.stepKind === stepKind
  );
}
