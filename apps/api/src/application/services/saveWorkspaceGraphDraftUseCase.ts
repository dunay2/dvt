import { createHash, randomUUID } from 'node:crypto';

import {
  WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION,
  WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_MIGRATION_STATE,
  parseWorkspaceGraphDraftSaveResponse,
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
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '../ports/workspaceGraphDraft.js';

export type SaveWorkspaceGraphDraftUseCaseResult =
  | {
      readonly kind: 'response';
      readonly httpStatus: 200 | 401 | 403 | 409;
      readonly response: WorkspaceGraphDraftSaveResponse;
    }
  | {
      readonly kind: 'unsupported_schema_version';
    }
  | {
      readonly kind: 'idempotency_mismatch';
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
      return { kind: 'unsupported_schema_version' };
    }

    const saveResult = await this.store.save({
      scope: request.scope,
      schemaVersion: request.schemaVersion,
      expectedRevision: request.expectedRevision,
      idempotencyKey: request.idempotencyKey,
      draft: request.draft,
      requestHash: createSaveRequestHash(request),
      revision: randomUUID(),
      nowIso: this.clock().toISOString(),
    });

    if (saveResult.kind === 'idempotency_mismatch') {
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftWrite,
        outcome: WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict,
        decision,
        metadata: {
          rejectionReason: 'idempotency_mismatch',
          idempotencyKey: request.idempotencyKey,
        },
      });
      return { kind: 'idempotency_mismatch' };
    }

    if (saveResult.kind === 'conflict') {
      const conflict = {
        kind: 'conflict',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.conflict),
        formatMeta: {
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          storedSchemaVersion: saveResult.storedSchemaVersion,
          migrationState: WORKSPACE_GRAPH_DRAFT_MIGRATION_STATE.native,
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
        migrationState: WORKSPACE_GRAPH_DRAFT_MIGRATION_STATE.native,
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
  return createHash('sha256')
    .update(
      JSON.stringify({
        scope: request.scope,
        schemaVersion: request.schemaVersion,
        expectedRevision: request.expectedRevision,
        draft: request.draft,
      })
    )
    .digest('hex');
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
