/**
 * A read-only complete Model proposal, distinct from its existing guarded graph save.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile.
 * @baseline ADR-0060: Project-file producers retain their authoring authority.
 * @decision Return a revision-bound semantic proposal for the existing guarded graph save.
 * @consequence Reading a proposal neither saves the graph nor transfers file authority.
 * @version 1.0.0
 */
import { z } from 'zod';

import { CanvasHumanNameV1Schema } from '../planner/CanvasAuthoringFieldPolicy.v1.js';
import { DvtTransformAuthoringAuthorityV1Schema } from '../planner/DvtTransformAuthoringAuthority.v1.js';
import { WorkspaceDbtModelReferenceSchema } from '../planner/WorkspaceDbtModelReference.v1.js';
import { WorkspaceGraphAuthoringDraftSchema } from '../planner/WorkspaceGraphAuthoringDraft.v1.js';
import { WorkspaceGraphDraftScopeSchema } from '../planner/WorkspaceGraphDraft.v1.js';
import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

import {
  ModelSqlBufferSchema,
  ModelSqlColumnSchema,
  ModelSqlDiagnosticSchema,
  ModelSqlDigestSchema,
  ModelSqlIdentitySchema,
} from './ModelSqlContext.v1.js';

const NativeModelObservationSchema = z
  .object({
    kind: z.literal('native-model'),
    canvasId: ModelSqlIdentitySchema,
    nodeId: ModelSqlIdentitySchema,
    semanticPlanSha256: ModelSqlDigestSchema,
    alias: ModelSqlIdentitySchema,
  })
  .strict();

const FileModelObservationSchema = z
  .object({
    kind: z.literal('dbt-model'),
    reference: WorkspaceDbtModelReferenceSchema,
    projectRevisionSha256: ModelSqlDigestSchema,
    analysisSha256: ModelSqlDigestSchema,
    alias: ModelSqlIdentitySchema,
    binding: z.object({ kind: z.literal('compiled'), sqlSha256: ModelSqlDigestSchema }).strict(),
  })
  .strict();

export const WorksheetCanvasModelObservationSchema = z.discriminatedUnion('kind', [
  NativeModelObservationSchema,
  FileModelObservationSchema,
]);

export const WorksheetCanvasModelRequestSchema = z
  .object({
    schemaVersion: z.literal('worksheet-canvas-model-request.v1'),
    canvasId: ModelSqlIdentitySchema,
    expectedRevision: ModelSqlIdentitySchema,
    modelId: ModelSqlIdentitySchema,
    name: CanvasHumanNameV1Schema,
    connectionRef: ConnectionRefSchema,
    sql: ModelSqlBufferSchema,
    models: z.array(WorksheetCanvasModelObservationSchema).max(64),
    verifyContextSha256: ModelSqlDigestSchema.optional(),
  })
  .strict()
  .refine(
    (request) => new Set(request.models.map((model) => model.alias)).size === request.models.length,
    'Model aliases must be unambiguous.'
  );

const ProposalIdentitySchema = z.object({
  schemaVersion: z.literal('worksheet-canvas-model-proposal.v1'),
  scope: WorkspaceGraphDraftScopeSchema,
  canvasId: ModelSqlIdentitySchema,
  expectedRevision: ModelSqlIdentitySchema,
  modelId: ModelSqlIdentitySchema,
  name: CanvasHumanNameV1Schema,
  connectionRef: ConnectionRefSchema,
  sqlSha256: ModelSqlDigestSchema,
  contextSha256: ModelSqlDigestSchema,
});

export const WorksheetCanvasModelProposalSchema = z.discriminatedUnion('status', [
  ProposalIdentitySchema.extend({ status: z.literal('current') }).strict(),
  ProposalIdentitySchema.extend({
    status: z.literal('valid'),
    draft: WorkspaceGraphAuthoringDraftSchema,
    columns: z.array(ModelSqlColumnSchema).min(1).max(512),
    proposalSha256: ModelSqlDigestSchema,
  })
    .strict()
    .refine((proposal) => {
      const target = proposal.draft.nodes.find((node) => node.id === proposal.modelId);
      return (
        (proposal.draft.activeCanvasId ?? proposal.draft.canvas.id) === proposal.canvasId &&
        target?.name === proposal.name &&
        target.role === 'transform' &&
        proposal.draft.nodeIds.includes(target.id) &&
        DvtTransformAuthoringAuthorityV1Schema.safeParse(target.metadata?.['transformAuthoring'])
          .success &&
        proposal.draft.edges.some((edge) => edge.targetId === target.id)
      );
    }, 'A successful proposal requires the complete visible canonical Model and input relationships.'),
  ProposalIdentitySchema.extend({
    status: z.literal('invalid'),
    diagnostics: z.array(ModelSqlDiagnosticSchema).min(1).max(128),
  }).strict(),
]);

export type WorksheetCanvasModelObservation = z.infer<typeof WorksheetCanvasModelObservationSchema>;
export type WorksheetCanvasModelRequest = z.infer<typeof WorksheetCanvasModelRequestSchema>;
export type WorksheetCanvasModelProposal = z.infer<typeof WorksheetCanvasModelProposalSchema>;
export type ValidWorksheetCanvasModelProposal = Extract<
  WorksheetCanvasModelProposal,
  { status: 'valid' }
>;
