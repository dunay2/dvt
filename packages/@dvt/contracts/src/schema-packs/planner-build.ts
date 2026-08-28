import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod';

import type { PlanCore } from '../contracts/planner/ExecutionPlan.v1.js';
import { PlannerPolicyClassSetSchema } from '../contracts/planner/PlannerPolicyVocabulary.v2.js';

import { NonBlankStringSchema, RunExecutionPolicySchema } from './common.js';
import { ExecutionPlanSchema, PlanCoreSchema } from './execution-plan.js';
import { PlannerObservabilitySchema, PlannerSelectionSchema } from './planner-context.js';
import { GenericGraphSourceV1Schema } from './planner-graph.js';

const PlanOwnershipSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict();

const PlannerDecisionScopeSchema = z
  .object({
    nodeIds: z.array(NonBlankStringSchema).min(1),
    requestedRootNodeIds: z.array(NonBlankStringSchema).min(1).optional(),
  })
  .strict()
  .superRefine((scope, ctx) => {
    if (new Set(scope.nodeIds).size !== scope.nodeIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodeIds'],
        message: 'decisionScope.nodeIds must not contain duplicates',
      });
    }
    if (
      scope.requestedRootNodeIds !== undefined &&
      new Set(scope.requestedRootNodeIds).size !== scope.requestedRootNodeIds.length
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['requestedRootNodeIds'],
        message: 'decisionScope.requestedRootNodeIds must not contain duplicates',
      });
    }
  });

export const PlannerInputEnvelopeV1Schema = z
  .object({
    graphSource: GenericGraphSourceV1Schema,
    selection: PlannerSelectionSchema,
    decisionScope: PlannerDecisionScopeSchema.optional(),
    policies: PlannerPolicyClassSetSchema.optional(),
    ownership: PlanOwnershipSchema.optional(),
    observability: PlannerObservabilitySchema,
    requestedBy: z.string().min(1).optional(),
    requestId: z.string().min(1).optional(),
    requestedAtIso: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.decisionScope === undefined) return;
    const decisionNodeIds = new Set<string>(input.decisionScope.nodeIds);
    for (const [index, node] of input.graphSource.nodes.entries()) {
      if (!decisionNodeIds.has(node.nodeId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['decisionScope', 'nodeIds'],
          message: `decisionScope.nodeIds must include graphSource.nodes[${index}].nodeId`,
        });
      }
    }
    if (input.decisionScope.requestedRootNodeIds === undefined) return;
    const executableNodeIds = new Set(input.graphSource.nodes.map((node) => node.nodeId));
    const selectedNodeIds = new Set(input.selection.selectedNodeIds);
    for (const [index, nodeId] of input.decisionScope.requestedRootNodeIds.entries()) {
      if (!executableNodeIds.has(nodeId) || !selectedNodeIds.has(nodeId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['decisionScope', 'requestedRootNodeIds', index],
          message: 'decisionScope.requestedRootNodeIds must be executable selected nodes',
        });
      }
    }
  });

export const PlannerBuildResultV1Schema = z
  .object({
    plan: ExecutionPlanSchema,
    executionPolicy: RunExecutionPolicySchema,
    canonicalPlanCoreJson: NonBlankStringSchema,
  })
  .strict()
  .superRefine((result, ctx) => {
    let canonicalPlanCoreInput: unknown;

    try {
      canonicalPlanCoreInput = JSON.parse(result.canonicalPlanCoreJson);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanCoreJson'],
        message: 'canonicalPlanCoreJson must contain valid JSON',
      });
      return;
    }

    const canonicalPlanCoreResult = PlanCoreSchema.safeParse(canonicalPlanCoreInput);
    if (!canonicalPlanCoreResult.success) {
      for (const issue of canonicalPlanCoreResult.error.issues) {
        ctx.addIssue({
          code: 'custom',
          path: ['canonicalPlanCoreJson', ...issue.path],
          message: issue.message,
        });
      }
      return;
    }

    const expectedPlanCore = {
      metadata: {
        planVersion: result.plan.metadata.planVersion,
        inputHashSha256: result.plan.metadata.inputHashSha256,
      },
      steps: result.plan.steps,
    } satisfies PlanCore;
    const expectedCanonicalPlanCoreJson = jcsCanonicalize(expectedPlanCore);

    if (result.canonicalPlanCoreJson !== expectedCanonicalPlanCoreJson) {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanCoreJson'],
        message:
          'canonicalPlanCoreJson must equal JCS(planCore) derived from plan.metadata.{planVersion,inputHashSha256} and plan.steps',
      });
      return;
    }

    if (sha256HexUtf8(result.canonicalPlanCoreJson) !== result.plan.metadata.planId.toLowerCase()) {
      ctx.addIssue({
        code: 'custom',
        path: ['plan', 'metadata', 'planId'],
        message: 'plan.metadata.planId must match sha256(canonicalPlanCoreJson)',
      });
    }
  });

export type PlannerInputEnvelopeV1SchemaT = z.infer<typeof PlannerInputEnvelopeV1Schema>;
export type PlannerBuildResultV1SchemaT = z.infer<typeof PlannerBuildResultV1Schema>;
