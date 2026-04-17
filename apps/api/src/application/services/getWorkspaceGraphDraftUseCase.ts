import {
  WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION,
  WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON,
  WORKSPACE_GRAPH_DRAFT_MIGRATION_STATE,
  parseDesignGraphDraft,
  parseWorkspaceGraphDraftReadResponse,
  type WorkspaceGraphDraftAuditOutcome,
  type WorkspaceGraphDraftAuditRef,
  type WorkspaceGraphDraftCapabilityMode,
  type WorkspaceGraphDraftReadResponse,
} from '@dvt/contracts';

import type {
  IWorkspaceGraphDraftAuditPort,
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
} from '../ports/workspaceGraphDraft.js';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../ports/workspaceGraphDraft.js';

export type GetWorkspaceGraphDraftUseCaseResult =
  | {
      readonly kind: 'response';
      readonly httpStatus: 200 | 401 | 403 | 422;
      readonly response: WorkspaceGraphDraftReadResponse;
    }
  | {
      readonly kind: 'not_found';
    };

export class GetWorkspaceGraphDraftUseCase {
  public constructor(
    private readonly store: IWorkspaceGraphDraftStore,
    private readonly audit: IWorkspaceGraphDraftAuditPort
  ) {}

  public async execute(
    decision: WorkspaceGraphDraftDecisionContext
  ): Promise<GetWorkspaceGraphDraftUseCaseResult> {
    if (decision.capability.mode === WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden) {
      const denied = parseWorkspaceGraphDraftReadResponse({
        kind: 'denied',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.forbidden),
      });
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead,
        outcome: denied.auditRef.outcome,
        decision,
      });
      return {
        kind: 'response',
        httpStatus: decision.authentication === 'unauthenticated' ? 401 : 403,
        response: denied,
      };
    }

    const stored = await this.store.read(decision.scope);
    if (stored === null) {
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead,
        outcome: outcomeForReadableMode(decision.capability.mode),
        decision,
        metadata: { resourceStatus: 'not_found' },
      });
      return { kind: 'not_found' };
    }

    if (stored.schemaVersion !== WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION) {
      const formatFailure = {
        kind: 'format_error',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, outcomeForReadableMode(decision.capability.mode)),
        formatError: {
          reason: WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON.unsupportedSchemaVersion,
          storedSchemaVersion: stored.schemaVersion,
        },
      } as const;
      const response = parseWorkspaceGraphDraftReadResponse(formatFailure);
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead,
        outcome: response.auditRef.outcome,
        decision,
        metadata: { formatErrorReason: formatFailure.formatError.reason },
      });
      return {
        kind: 'response',
        httpStatus: 422,
        response,
      };
    }

    try {
      const draft = parseDesignGraphDraft(stored.draftPayload);
      const ok = {
        kind: 'ok',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, outcomeForReadableMode(decision.capability.mode)),
        formatMeta: {
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          storedSchemaVersion: stored.schemaVersion,
          migrationState: WORKSPACE_GRAPH_DRAFT_MIGRATION_STATE.native,
        },
        record: {
          scope: stored.scope,
          schemaVersion: stored.schemaVersion,
          revision: stored.revision,
          draft,
          updatedAt: stored.updatedAt,
        },
      } as const;
      const response = parseWorkspaceGraphDraftReadResponse(ok);
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead,
        outcome: response.auditRef.outcome,
        decision,
        metadata: { revision: ok.record.revision },
      });
      return {
        kind: 'response',
        httpStatus: 200,
        response,
      };
    } catch {
      const corrupt = {
        kind: 'format_error',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, outcomeForReadableMode(decision.capability.mode)),
        formatError: {
          reason: WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON.corruptPayload,
          storedSchemaVersion: stored.schemaVersion,
        },
      } as const;
      const response = parseWorkspaceGraphDraftReadResponse(corrupt);
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead,
        outcome: response.auditRef.outcome,
        decision,
        metadata: { formatErrorReason: corrupt.formatError.reason },
      });
      return {
        kind: 'response',
        httpStatus: 422,
        response,
      };
    }
  }
}

function buildAuditRef(
  decision: WorkspaceGraphDraftDecisionContext,
  outcome: WorkspaceGraphDraftAuditOutcome
): WorkspaceGraphDraftAuditRef {
  return {
    correlationId: decision.correlationId,
    decisionId: decision.decisionId,
    action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead,
    outcome,
    recordedAt: decision.recordedAt,
  };
}

function outcomeForReadableMode(
  mode: WorkspaceGraphDraftCapabilityMode
): WorkspaceGraphDraftAuditOutcome {
  return mode === WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.readOnly
    ? WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.readOnly
    : WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME.allowed;
}
