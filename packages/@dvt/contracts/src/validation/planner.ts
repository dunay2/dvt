import type { PlanAdmissionLink } from '../contracts/planner/PlanAdmissionLink.v1.js';
import type { PlanExecutabilityRecord } from '../contracts/planner/PlanExecutabilityRecord.v1.js';
import {
  PlannerPolicyClassSetSchema,
  type PlannerPolicyClassSetSchemaT,
} from '../contracts/planner/PlannerPolicyVocabulary.v2.js';
import type { PlanRecord } from '../contracts/planner/PlanRecord.v1.js';
import {
  ArtifactRefSchema,
  type ArtifactRefSchemaT,
  ExecutableSubgraphSchema,
  type ExecutableSubgraphSchemaT,
  ExecutionPlanSchema,
  ExecutionSelectionSchema,
  type ExecutionSelectionSchemaT,
  type ExecutionPlanSchemaT,
  ExecutionStepV1Schema,
  type ExecutionStepV1SchemaT,
  GenericGraphSourceV1Schema,
  type GenericGraphSourceV1SchemaT,
  PlannerBuildResultV1Schema,
  type PlannerBuildResultV1SchemaT,
  PlannerInputEnvelopeV1Schema,
  type PlannerInputEnvelopeV1SchemaT,
  PlannerObservabilitySchema,
  type PlannerObservabilitySchemaT,
  PlannerSelectionSchema,
  type PlannerSelectionSchemaT,
  PlanAdmissionFindingCollectionSchema,
  type PlanAdmissionFindingCollectionSchemaT,
  PlanAdmissionFindingSchema,
  type PlanAdmissionFindingSchemaT,
  PlanAdmissionLinkSchema,
  PlanCompileRequestV1Schema,
  type PlanCompileRequestV1SchemaT,
  PlanCompileResponseV1Schema,
  type PlanCompileResponseV1SchemaT,
  PlanCoreSchema,
  type PlanCoreSchemaT,
  PlanExecutabilityRecordSchema,
  PlanPreviewPersistResponseSchema,
  type PlanPreviewPersistResponseSchemaT,
  PlanPreviewRejectedOutcomeSchema,
  type PlanPreviewRejectedOutcomeSchemaT,
  PlanPreviewProvenanceSchema,
  type PlanPreviewProvenanceSchemaT,
  PlanPreviewRequestSchema,
  type PlanPreviewRequestSchemaT,
  PlanRecordSchema,
  PlanRefSchema,
  type PlanRefSchemaT,
  WorkspaceGraphDraftReadResponseSchema,
  type WorkspaceGraphDraftReadResponseSchemaT,
  WorkspaceGraphDraftSaveRequestSchema,
  type WorkspaceGraphDraftSaveRequestSchemaT,
  WorkspaceGraphDraftSaveResponseSchema,
  type WorkspaceGraphDraftSaveResponseSchemaT,
} from '../schemas.js';

import { parseWithSchema } from './core.js';

export function parseArtifactRef(input: unknown): ArtifactRefSchemaT {
  return parseWithSchema(ArtifactRefSchema, input);
}

export function parsePlanCompileRequest(input: unknown): PlanCompileRequestV1SchemaT {
  return parseWithSchema(PlanCompileRequestV1Schema, input);
}

export function parsePlanCompileResponse(input: unknown): PlanCompileResponseV1SchemaT {
  return parseWithSchema(PlanCompileResponseV1Schema, input);
}

export function parsePlanPreviewProvenance(input: unknown): PlanPreviewProvenanceSchemaT {
  return parseWithSchema(PlanPreviewProvenanceSchema, input);
}

export function parsePlanPreviewRequest(input: unknown): PlanPreviewRequestSchemaT {
  return parseWithSchema(PlanPreviewRequestSchema, input);
}

export function parsePlanPreviewPersistResponse(input: unknown): PlanPreviewPersistResponseSchemaT {
  return parseWithSchema(PlanPreviewPersistResponseSchema, input);
}

export function parsePlanPreviewRejectedOutcome(input: unknown): PlanPreviewRejectedOutcomeSchemaT {
  return parseWithSchema(PlanPreviewRejectedOutcomeSchema, input);
}

export function parsePlannerSelection(input: unknown): PlannerSelectionSchemaT {
  return parseWithSchema(PlannerSelectionSchema, input);
}

export function parsePlannerPolicyClassSet(input: unknown): PlannerPolicyClassSetSchemaT {
  return parseWithSchema(PlannerPolicyClassSetSchema, input);
}

export function parsePlannerObservability(input: unknown): PlannerObservabilitySchemaT {
  return parseWithSchema(PlannerObservabilitySchema, input);
}

export function parseGenericGraphSourceV1(input: unknown): GenericGraphSourceV1SchemaT {
  return parseWithSchema(GenericGraphSourceV1Schema, input);
}

export function parseExecutionStepV1(input: unknown): ExecutionStepV1SchemaT {
  return parseWithSchema(ExecutionStepV1Schema, input);
}

export function parsePlanCore(input: unknown): PlanCoreSchemaT {
  return parseWithSchema(PlanCoreSchema, input);
}

export function parseExecutionPlan(input: unknown): ExecutionPlanSchemaT {
  return parseWithSchema(ExecutionPlanSchema, input);
}

export function parseExecutionSelection(input: unknown): ExecutionSelectionSchemaT {
  return parseWithSchema(ExecutionSelectionSchema, input);
}

export function parseExecutableSubgraph(input: unknown): ExecutableSubgraphSchemaT {
  return parseWithSchema(ExecutableSubgraphSchema, input);
}

export function parsePlannerInputEnvelopeV1(input: unknown): PlannerInputEnvelopeV1SchemaT {
  return parseWithSchema(PlannerInputEnvelopeV1Schema, input);
}

export async function parsePlannerBuildResultV1(
  input: unknown
): Promise<PlannerBuildResultV1SchemaT> {
  return parseWithSchema(PlannerBuildResultV1Schema, input);
}

export function parsePlanRecord(input: unknown): PlanRecord {
  return parseWithSchema(PlanRecordSchema, input);
}

export function parsePlanExecutabilityRecord(input: unknown): PlanExecutabilityRecord {
  return parseWithSchema(PlanExecutabilityRecordSchema, input);
}

export function parsePlanAdmissionFinding(input: unknown): PlanAdmissionFindingSchemaT {
  return parseWithSchema(PlanAdmissionFindingSchema, input);
}

export function parsePlanAdmissionFindingCollection(
  input: unknown
): PlanAdmissionFindingCollectionSchemaT {
  return parseWithSchema(PlanAdmissionFindingCollectionSchema, input);
}

export function parsePlanAdmissionLink(input: unknown): PlanAdmissionLink {
  return parseWithSchema(PlanAdmissionLinkSchema, input);
}

export function parsePlanRef(input: unknown): PlanRefSchemaT {
  return parseWithSchema(PlanRefSchema, input);
}

export function parseWorkspaceGraphDraftSaveRequest(
  input: unknown
): WorkspaceGraphDraftSaveRequestSchemaT {
  return parseWithSchema(WorkspaceGraphDraftSaveRequestSchema, input);
}

export function parseWorkspaceGraphDraftSaveResponse(
  input: unknown
): WorkspaceGraphDraftSaveResponseSchemaT {
  return parseWithSchema(WorkspaceGraphDraftSaveResponseSchema, input);
}

export function parseWorkspaceGraphDraftReadResponse(
  input: unknown
): WorkspaceGraphDraftReadResponseSchemaT {
  return parseWithSchema(WorkspaceGraphDraftReadResponseSchema, input);
}
