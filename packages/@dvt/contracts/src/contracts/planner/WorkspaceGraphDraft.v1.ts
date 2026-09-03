/**
 * Owned concern: define the protected persistence envelope for workspace graph
 * authoring drafts.
 *
 * This boundary wraps `WorkspaceGraphAuthoringDraft` with scope, capability,
 * audit, format metadata, revision, conflict, and save/read outcome semantics.
 * It does not own compile-ready execution plans or execution selection.
 */
import { z } from 'zod';

import {
  isIsoUtcString,
  isNonBlankString,
  NON_BLANK_STRING_MESSAGE,
  STRICT_ISO_UTC_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';

import {
  CanvasAuthoringAuthorityResolutionSchema,
  type CanvasAuthoringAuthorityResolution,
} from './CanvasAuthoringAuthorityBinding.v1.js';
import {
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
} from './WorkspaceGraphAuthoringDraft.v1.js';

export const WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION = 'workspace-graph-draft.v1';
export const WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION = 'initial';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();

const IsoUtcStringSchema = NonBlankStringSchema.refine((value) => isIsoUtcString(value), {
  message: STRICT_ISO_UTC_STRING_MESSAGE,
}).brand<'IsoUtcString'>();

export const WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE = {
  writable: 'writable',
  readOnly: 'read_only',
  forbidden: 'forbidden',
} as const;

export const WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON = {
  authorized: 'authorized',
  writeDenied: 'write_denied',
  tenantMismatch: 'tenant_mismatch',
  workspaceScopeDenied: 'workspace_scope_denied',
  unauthenticated: 'unauthenticated',
} as const;

export const WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION = {
  draftRead: 'draft_read',
  draftWrite: 'draft_write',
} as const;

export const WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME = {
  allowed: 'allowed',
  readOnly: 'read_only',
  forbidden: 'forbidden',
  conflict: 'conflict',
} as const;

export const WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON = {
  unsupportedSchemaVersion: 'unsupported_schema_version',
  corruptPayload: 'corrupt_payload',
} as const;

export type WorkspaceGraphDraftCapabilityMode =
  (typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE)[keyof typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE];
export type WorkspaceGraphDraftCapabilityReason =
  (typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON)[keyof typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON];
export type WorkspaceGraphDraftAuditAction =
  (typeof WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION)[keyof typeof WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION];
export type WorkspaceGraphDraftAuditOutcome =
  (typeof WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME)[keyof typeof WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME];
export type WorkspaceGraphDraftFormatErrorReason =
  (typeof WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON)[keyof typeof WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON];

export interface WorkspaceGraphDraftScope {
  tenantId: string;
  projectId: string;
  environmentId: string;
}

export interface WorkspaceGraphDraftCapabilityOutcome {
  scope: WorkspaceGraphDraftScope;
  mode: WorkspaceGraphDraftCapabilityMode;
  canRead: boolean;
  canWrite: boolean;
  reason: WorkspaceGraphDraftCapabilityReason;
}

export interface WorkspaceGraphDraftAuditRef {
  correlationId: string;
  decisionId: string;
  action: WorkspaceGraphDraftAuditAction;
  outcome: WorkspaceGraphDraftAuditOutcome;
  recordedAt: string;
}

export interface WorkspaceGraphDraftFormatMeta {
  schemaVersion: string;
  storedSchemaVersion: string;
}

export interface WorkspaceGraphDraftFormatError {
  reason: WorkspaceGraphDraftFormatErrorReason;
  storedSchemaVersion?: string | undefined;
}

export interface WorkspaceGraphDraftRecord {
  scope: WorkspaceGraphDraftScope;
  schemaVersion: string;
  revision: string;
  draft: WorkspaceGraphAuthoringDraft;
  updatedAt: string;
}

export interface WorkspaceGraphDraftReadSuccess {
  kind: 'ok';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
  formatMeta: WorkspaceGraphDraftFormatMeta;
  authoringAuthority: CanvasAuthoringAuthorityResolution;
  record: WorkspaceGraphDraftRecord;
}

export interface WorkspaceGraphDraftReadFormatFailure {
  kind: 'format_error';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
  formatError: WorkspaceGraphDraftFormatError;
}

export interface WorkspaceGraphDraftReadDenied {
  kind: 'denied';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
}

export interface WorkspaceGraphDraftReadNotFound {
  kind: 'not_found';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
}

export type WorkspaceGraphDraftReadResponse =
  | WorkspaceGraphDraftReadSuccess
  | WorkspaceGraphDraftReadFormatFailure
  | WorkspaceGraphDraftReadDenied
  | WorkspaceGraphDraftReadNotFound;

export interface WorkspaceGraphDraftSaveRequest {
  scope: WorkspaceGraphDraftScope;
  schemaVersion: string;
  expectedRevision: string;
  idempotencyKey: string;
  draft: WorkspaceGraphAuthoringDraft;
}

export interface WorkspaceGraphDraftSaveSuccess {
  kind: 'saved';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
  formatMeta: WorkspaceGraphDraftFormatMeta;
  revision: string;
}

export interface WorkspaceGraphDraftSaveConflict {
  kind: 'conflict';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
  formatMeta: WorkspaceGraphDraftFormatMeta;
  currentRevision: string;
}

export interface WorkspaceGraphDraftSaveDenied {
  kind: 'denied';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
}

export interface WorkspaceGraphDraftSaveUnsupportedSchemaVersion {
  kind: 'unsupported_schema_version';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
  expectedSchemaVersion: string;
  requestedSchemaVersion: string;
}

export interface WorkspaceGraphDraftSaveIdempotencyMismatch {
  kind: 'idempotency_mismatch';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
}

export interface WorkspaceGraphDraftSaveAuthoringAuthorityConflict {
  kind: 'authoring_authority_conflict';
  capability: WorkspaceGraphDraftCapabilityOutcome;
  auditRef: WorkspaceGraphDraftAuditRef;
  canvasIds: readonly string[];
}

export type WorkspaceGraphDraftSaveResponse =
  | WorkspaceGraphDraftSaveSuccess
  | WorkspaceGraphDraftSaveConflict
  | WorkspaceGraphDraftSaveDenied
  | WorkspaceGraphDraftSaveUnsupportedSchemaVersion
  | WorkspaceGraphDraftSaveIdempotencyMismatch
  | WorkspaceGraphDraftSaveAuthoringAuthorityConflict;

export function resolveWorkspaceGraphDraftCanvasIds(
  draft: WorkspaceGraphAuthoringDraft
): readonly string[] {
  const canvasIds = new Set<string>();
  if (draft.canvas.id) canvasIds.add(draft.canvas.id);
  if (draft.activeCanvasId) canvasIds.add(draft.activeCanvasId);
  for (const workspace of draft.canvases ?? []) canvasIds.add(workspace.canvas.id);
  return [...canvasIds].sort((left, right) => left.localeCompare(right));
}

export const WorkspaceGraphDraftScopeSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftScope>;

export const WorkspaceGraphDraftCapabilityOutcomeSchema = z
  .object({
    scope: WorkspaceGraphDraftScopeSchema,
    mode: z.enum([
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable,
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.readOnly,
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden,
    ]),
    canRead: z.boolean(),
    canWrite: z.boolean(),
    reason: z.enum([
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.authorized,
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.writeDenied,
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.tenantMismatch,
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.workspaceScopeDenied,
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.unauthenticated,
    ]),
  })
  .strict()
  .superRefine((capability, ctx) => {
    const expectedByMode: Record<
      WorkspaceGraphDraftCapabilityMode,
      { canRead: boolean; canWrite: boolean }
    > = {
      [WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable]: { canRead: true, canWrite: true },
      [WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.readOnly]: { canRead: true, canWrite: false },
      [WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden]: { canRead: false, canWrite: false },
    };
    const expected = expectedByMode[capability.mode];
    if (capability.canRead !== expected.canRead || capability.canWrite !== expected.canWrite) {
      ctx.addIssue({
        code: 'custom',
        path: ['mode'],
        message: 'WorkspaceGraphDraft capability flags must match mode semantics.',
      });
    }
  }) satisfies z.ZodType<WorkspaceGraphDraftCapabilityOutcome>;

export const WorkspaceGraphDraftAuditRefSchema = z
  .object({
    correlationId: NonBlankStringSchema,
    decisionId: NonBlankStringSchema,
    action: z.enum([
      WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead,
      WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
    ]),
    outcome: z.enum([
      WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.allowed,
      WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.readOnly,
      WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.forbidden,
      WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict,
    ]),
    recordedAt: IsoUtcStringSchema,
  })
  .strict()
  .superRefine((auditRef, ctx) => {
    if (
      auditRef.action === WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead &&
      auditRef.outcome === WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['outcome'],
        message: 'WorkspaceGraphDraft read audit outcomes must not be conflict.',
      });
    }
  }) satisfies z.ZodType<WorkspaceGraphDraftAuditRef>;

export const WorkspaceGraphDraftFormatMetaSchema = z
  .object({
    schemaVersion: NonBlankStringSchema,
    storedSchemaVersion: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftFormatMeta>;

export const WorkspaceGraphDraftFormatErrorSchema = z
  .object({
    reason: z.enum([
      WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON.unsupportedSchemaVersion,
      WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON.corruptPayload,
    ]),
    storedSchemaVersion: NonBlankStringSchema.optional(),
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftFormatError>;

export const WorkspaceGraphDraftRecordSchema = z
  .object({
    scope: WorkspaceGraphDraftScopeSchema,
    schemaVersion: NonBlankStringSchema,
    revision: NonBlankStringSchema,
    draft: WorkspaceGraphAuthoringDraftSchema,
    updatedAt: IsoUtcStringSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftRecord>;

export const WorkspaceGraphDraftReadSuccessSchema = z
  .object({
    kind: z.literal('ok'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
    formatMeta: WorkspaceGraphDraftFormatMetaSchema,
    authoringAuthority: CanvasAuthoringAuthorityResolutionSchema,
    record: WorkspaceGraphDraftRecordSchema,
  })
  .strict()
  .superRefine((response, ctx) => {
    if (response.authoringAuthority.kind !== 'resolved') return;

    const activeCanvasId =
      response.record.draft.activeCanvasId ?? response.record.draft.canvas.id ?? null;
    if (
      response.authoringAuthority.binding.authority.kind !== 'graph-draft' ||
      response.authoringAuthority.binding.canvasId !== activeCanvasId
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['authoringAuthority'],
        message:
          'WorkspaceGraphDraft resolved authority must identify the active graph-draft Canvas.',
      });
    }
  }) satisfies z.ZodType<WorkspaceGraphDraftReadSuccess>;

export const WorkspaceGraphDraftReadFormatFailureSchema = z
  .object({
    kind: z.literal('format_error'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
    formatError: WorkspaceGraphDraftFormatErrorSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftReadFormatFailure>;

export const WorkspaceGraphDraftReadDeniedSchema = z
  .object({
    kind: z.literal('denied'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftReadDenied>;

export const WorkspaceGraphDraftReadNotFoundSchema = z
  .object({
    kind: z.literal('not_found'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftReadNotFound>;

export const WorkspaceGraphDraftReadResponseSchema = z
  .discriminatedUnion('kind', [
    WorkspaceGraphDraftReadSuccessSchema,
    WorkspaceGraphDraftReadFormatFailureSchema,
    WorkspaceGraphDraftReadDeniedSchema,
    WorkspaceGraphDraftReadNotFoundSchema,
  ])
  .superRefine((response, ctx) => {
    if (response.auditRef.action !== WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead) {
      ctx.addIssue({
        code: 'custom',
        path: ['auditRef', 'action'],
        message: 'WorkspaceGraphDraft read responses must use draft_read audit action.',
      });
    }

    if (response.kind === 'denied') {
      if (response.capability.mode !== WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden) {
        ctx.addIssue({
          code: 'custom',
          path: ['capability', 'mode'],
          message: 'WorkspaceGraphDraft denied read responses must use forbidden mode.',
        });
      }
      if (response.auditRef.outcome !== WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.forbidden) {
        ctx.addIssue({
          code: 'custom',
          path: ['auditRef', 'outcome'],
          message: 'WorkspaceGraphDraft denied read responses must use forbidden outcome.',
        });
      }
    }
  }) satisfies z.ZodType<WorkspaceGraphDraftReadResponse>;

export const WorkspaceGraphDraftSaveRequestSchema = z
  .object({
    scope: WorkspaceGraphDraftScopeSchema,
    schemaVersion: NonBlankStringSchema,
    expectedRevision: NonBlankStringSchema,
    idempotencyKey: NonBlankStringSchema,
    draft: WorkspaceGraphAuthoringDraftSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftSaveRequest>;

export const WorkspaceGraphDraftSaveSuccessSchema = z
  .object({
    kind: z.literal('saved'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
    formatMeta: WorkspaceGraphDraftFormatMetaSchema,
    revision: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftSaveSuccess>;

export const WorkspaceGraphDraftSaveConflictSchema = z
  .object({
    kind: z.literal('conflict'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
    formatMeta: WorkspaceGraphDraftFormatMetaSchema,
    currentRevision: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftSaveConflict>;

export const WorkspaceGraphDraftSaveDeniedSchema = z
  .object({
    kind: z.literal('denied'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftSaveDenied>;

export const WorkspaceGraphDraftSaveUnsupportedSchemaVersionSchema = z
  .object({
    kind: z.literal('unsupported_schema_version'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
    expectedSchemaVersion: NonBlankStringSchema,
    requestedSchemaVersion: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftSaveUnsupportedSchemaVersion>;

export const WorkspaceGraphDraftSaveIdempotencyMismatchSchema = z
  .object({
    kind: z.literal('idempotency_mismatch'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftSaveIdempotencyMismatch>;

export const WorkspaceGraphDraftSaveAuthoringAuthorityConflictSchema = z
  .object({
    kind: z.literal('authoring_authority_conflict'),
    capability: WorkspaceGraphDraftCapabilityOutcomeSchema,
    auditRef: WorkspaceGraphDraftAuditRefSchema,
    canvasIds: z.array(NonBlankStringSchema).min(1).readonly(),
  })
  .strict() satisfies z.ZodType<WorkspaceGraphDraftSaveAuthoringAuthorityConflict>;

export const WorkspaceGraphDraftSaveResponseSchema = z
  .discriminatedUnion('kind', [
    WorkspaceGraphDraftSaveSuccessSchema,
    WorkspaceGraphDraftSaveConflictSchema,
    WorkspaceGraphDraftSaveDeniedSchema,
    WorkspaceGraphDraftSaveUnsupportedSchemaVersionSchema,
    WorkspaceGraphDraftSaveIdempotencyMismatchSchema,
    WorkspaceGraphDraftSaveAuthoringAuthorityConflictSchema,
  ])
  .superRefine((response, ctx) => {
    if (response.auditRef.action !== WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite) {
      ctx.addIssue({
        code: 'custom',
        path: ['auditRef', 'action'],
        message: 'WorkspaceGraphDraft save responses must use draft_write audit action.',
      });
    }

    validateWorkspaceGraphDraftSavedResponse(response, ctx);
    validateWorkspaceGraphDraftConflictResponse(response, ctx);
    validateWorkspaceGraphDraftDeniedResponse(response, ctx);
  }) satisfies z.ZodType<WorkspaceGraphDraftSaveResponse>;

function validateWorkspaceGraphDraftSavedResponse(
  response: WorkspaceGraphDraftSaveResponse,
  ctx: z.RefinementCtx
): void {
  if (response.kind !== 'saved') {
    return;
  }
  if (response.capability.mode !== WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable) {
    ctx.addIssue({
      code: 'custom',
      path: ['capability', 'mode'],
      message: 'WorkspaceGraphDraft saved responses must use writable capability mode.',
    });
  }
  if (response.auditRef.outcome !== WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.allowed) {
    ctx.addIssue({
      code: 'custom',
      path: ['auditRef', 'outcome'],
      message: 'WorkspaceGraphDraft saved responses must use allowed audit outcome.',
    });
  }
}

function validateWorkspaceGraphDraftConflictResponse(
  response: WorkspaceGraphDraftSaveResponse,
  ctx: z.RefinementCtx
): void {
  if (response.kind !== 'conflict') {
    return;
  }
  if (response.capability.mode !== WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable) {
    ctx.addIssue({
      code: 'custom',
      path: ['capability', 'mode'],
      message: 'WorkspaceGraphDraft conflict responses must use writable capability mode.',
    });
  }
  if (response.auditRef.outcome !== WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict) {
    ctx.addIssue({
      code: 'custom',
      path: ['auditRef', 'outcome'],
      message: 'WorkspaceGraphDraft conflict responses must use conflict audit outcome.',
    });
  }
}

function validateWorkspaceGraphDraftDeniedResponse(
  response: WorkspaceGraphDraftSaveResponse,
  ctx: z.RefinementCtx
): void {
  if (response.kind !== 'denied') {
    return;
  }
  const deniedOutcomes = new Set<WorkspaceGraphDraftAuditOutcome>([
    WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.readOnly,
    WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.forbidden,
  ]);
  if (!deniedOutcomes.has(response.auditRef.outcome)) {
    ctx.addIssue({
      code: 'custom',
      path: ['auditRef', 'outcome'],
      message: 'WorkspaceGraphDraft denied save responses must be read_only or forbidden.',
    });
  }
  if (response.capability.mode === WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable) {
    ctx.addIssue({
      code: 'custom',
      path: ['capability', 'mode'],
      message: 'WorkspaceGraphDraft denied save responses must not use writable mode.',
    });
  }
}
