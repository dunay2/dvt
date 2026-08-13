/**
 * Owned concern: save protected workspace graph authoring drafts with
 * capability, compare-and-swap, idempotency, audit, and format metadata.
 *
 * The use case persists editable authoring truth only. It does not compile the
 * draft, invent compatibility payloads, or translate HTTP responses.
 */
import { randomUUID } from 'node:crypto';

import {
  WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION,
  WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  jcsCanonicalize,
  parseWorkspaceGraphDraftSaveResponse,
  resolveWorkspaceGraphDraftCanvasIds,
  sha256HexUtf8,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
  type WorkspaceGraphDraftAuditOutcome,
  type WorkspaceGraphDraftAuditRef,
  type WorkspaceGraphDraftSaveRequest,
  type WorkspaceGraphDraftSaveResponse,
} from '@dvt/contracts';

import type {
  IWorkspaceGraphDraftAuditPort,
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
} from '../ports/workspaceGraphDraft.js';

export type SaveWorkspaceGraphDraftUseCaseResult = {
  readonly kind: 'response';
  readonly httpStatus: 200 | 401 | 403 | 409 | 422;
  readonly response: WorkspaceGraphDraftSaveResponse;
};

export class SaveWorkspaceGraphDraftUseCase {
  public constructor(
    private readonly store: IWorkspaceGraphDraftStore,
    private readonly audit: IWorkspaceGraphDraftAuditPort,
    private readonly clock: () => Date
  ) {}

  public async execute(input: {
    readonly request: WorkspaceGraphDraftSaveRequest;
    readonly decision: WorkspaceGraphDraftDecisionContext;
  }): Promise<SaveWorkspaceGraphDraftUseCaseResult> {
    const { decision, request } = input;
    if (decision.capability.mode !== WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable) {
      const outcome =
        decision.capability.mode === WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.readOnly
          ? WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.readOnly
          : WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.forbidden;
      const denied = parseWorkspaceGraphDraftSaveResponse({
        kind: 'denied',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, outcome),
      });
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
        outcome: denied.auditRef.outcome,
        decision,
      });
      return {
        kind: 'response',
        httpStatus: decision.authentication === 'unauthenticated' ? 401 : 403,
        response: denied,
      };
    }

    if (request.schemaVersion !== WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION) {
      const unsupported = parseWorkspaceGraphDraftSaveResponse({
        kind: 'unsupported_schema_version',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.allowed),
        expectedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        requestedSchemaVersion: request.schemaVersion,
      });
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
        outcome: WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.allowed,
        decision,
        metadata: {
          rejectionReason: 'unsupported_schema_version',
          requestedSchemaVersion: request.schemaVersion,
          expectedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        },
      });
      return { kind: 'response', httpStatus: 422, response: unsupported };
    }

    const saveResult = await this.store.save({
      scope: request.scope,
      schemaVersion: request.schemaVersion,
      expectedRevision: request.expectedRevision,
      idempotencyKey: request.idempotencyKey,
      draft: request.draft,
      canvasIds: resolveWorkspaceGraphDraftCanvasIds(request.draft),
      requestHash: createSaveRequestHash(request),
      revision: randomUUID(),
      nowIso: this.clock().toISOString(),
    });

    if (saveResult.kind === 'authoring_authority_conflict') {
      const authorityConflict = parseWorkspaceGraphDraftSaveResponse({
        kind: 'authoring_authority_conflict',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict),
        canvasIds: saveResult.canvasIds,
      });
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
        outcome: WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict,
        decision,
        metadata: {
          rejectionReason: 'authoring_authority_conflict',
          canvasIds: saveResult.canvasIds,
        },
      });
      return {
        kind: 'response',
        httpStatus: 409,
        response: authorityConflict,
      };
    }

    if (saveResult.kind === 'idempotency_mismatch') {
      const idempotencyMismatch = parseWorkspaceGraphDraftSaveResponse({
        kind: 'idempotency_mismatch',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict),
      });
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
        outcome: WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict,
        decision,
        metadata: {
          rejectionReason: 'idempotency_mismatch',
          idempotencyKey: request.idempotencyKey,
        },
      });
      return { kind: 'response', httpStatus: 409, response: idempotencyMismatch };
    }

    if (saveResult.kind === 'conflict') {
      const conflict = {
        kind: 'conflict',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict),
        formatMeta: {
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          storedSchemaVersion: saveResult.storedSchemaVersion,
        },
        currentRevision: saveResult.currentRevision,
      } as const;
      const response = parseWorkspaceGraphDraftSaveResponse(conflict);
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
        outcome: response.auditRef.outcome,
        decision,
        metadata: {
          expectedRevision: request.expectedRevision,
          currentRevision: conflict.currentRevision,
        },
      });
      return {
        kind: 'response',
        httpStatus: 409,
        response,
      };
    }

    const saved = {
      kind: 'saved',
      capability: decision.capability,
      auditRef: buildAuditRef(decision, WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.allowed),
      formatMeta: {
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        storedSchemaVersion: saveResult.schemaVersion,
      },
      revision: saveResult.revision,
    } as const;
    const response = parseWorkspaceGraphDraftSaveResponse(saved);
    await this.audit.record({
      action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
      outcome: response.auditRef.outcome,
      decision,
      metadata: {
        revision: saved.revision,
        expectedRevision: request.expectedRevision,
        idempotencyKey: request.idempotencyKey,
        deduplicated: saveResult.deduplicated,
        initialRevision:
          request.expectedRevision === WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION ? true : undefined,
      },
    });
    return {
      kind: 'response',
      httpStatus: 200,
      response,
    };
  }
}

function createSaveRequestHash(request: WorkspaceGraphDraftSaveRequest): string {
  return sha256HexUtf8(
    jcsCanonicalize({
      scope: request.scope,
      schemaVersion: request.schemaVersion,
      expectedRevision: request.expectedRevision,
      draft: request.draft,
    })
  );
}

function buildAuditRef(
  decision: WorkspaceGraphDraftDecisionContext,
  outcome: WorkspaceGraphDraftAuditOutcome
): WorkspaceGraphDraftAuditRef {
  return {
    correlationId: decision.correlationId,
    decisionId: decision.decisionId,
    action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
    outcome,
    recordedAt: decision.recordedAt,
  };
}
