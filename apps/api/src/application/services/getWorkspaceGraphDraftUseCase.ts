/**
 * Owned concern: read protected workspace graph authoring drafts through the
 * canonical contract envelope.
 *
 * The use case owns capability-gated read outcomes, format failure posture,
 * audit correlation, and schema validation. It does not own draft mutation,
 * compile projection, or HTTP response translation.
 */
import {
  ConnectedSourceRefSchema,
  WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION,
  WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_FORMAT_ERROR_REASON,
  WorkspaceGraphAuthoringDraftSchema,
  parseWorkspaceGraphDraftReadResponse,
  type CanvasAuthoringAuthorityResolution,
  type WorkspaceGraphDraftAuditOutcome,
  type WorkspaceGraphDraftAuditRef,
  type WorkspaceGraphDraftCapabilityMode,
  type WorkspaceGraphDraftReadResponse,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';
import { WarehouseConnectionNotFoundError } from '../ports/warehouseSourceImport.js';
import type {
  IWorkspaceGraphDraftAuditPort,
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
} from '../ports/workspaceGraphDraft.js';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../ports/workspaceGraphDraft.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';

export type GetWorkspaceGraphDraftUseCaseResult = {
  readonly kind: 'response';
  readonly httpStatus: 200 | 401 | 403 | 404 | 422;
  readonly response: WorkspaceGraphDraftReadResponse;
};

export class GetWorkspaceGraphDraftUseCase {
  public constructor(
    private readonly store: IWorkspaceGraphDraftStore,
    private readonly audit: IWorkspaceGraphDraftAuditPort,
    private readonly authorityPolicy: Pick<
      CanvasAuthoringAuthorityPolicy,
      'resolveGraphDraftReadAuthority'
    >,
    private readonly connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>
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
      const notFound = parseWorkspaceGraphDraftReadResponse({
        kind: 'not_found',
        capability: decision.capability,
        auditRef: buildAuditRef(decision, outcomeForReadableMode(decision.capability.mode)),
      });
      await this.audit.record({
        action: WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION.draftRead,
        outcome: outcomeForReadableMode(decision.capability.mode),
        decision,
        metadata: { resourceStatus: 'not_found' },
      });
      return { kind: 'response', httpStatus: 404, response: notFound };
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

    const parsedDraft = WorkspaceGraphAuthoringDraftSchema.safeParse(stored.draftPayload);
    if (!parsedDraft.success) {
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

    const draft = await refreshGraphDraftConnectionNames(
      parsedDraft.data,
      decision.scope,
      this.connectionCatalog
    );
    const ok = {
      kind: 'ok',
      capability: decision.capability,
      auditRef: buildAuditRef(decision, outcomeForReadableMode(decision.capability.mode)),
      formatMeta: {
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        storedSchemaVersion: stored.schemaVersion,
      },
      authoringAuthority: await resolveGraphDraftAuthoringAuthority(
        this.authorityPolicy,
        stored.scope,
        draft.activeCanvasId ?? draft.canvas.id ?? null
      ),
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
  }
}

export async function refreshGraphDraftConnectionNames(
  draft: WorkspaceGraphAuthoringDraft,
  scope: WorkspaceGraphDraftDecisionContext['scope'],
  connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>
): Promise<WorkspaceGraphAuthoringDraft> {
  const connectionNameById = new Map<string, Promise<string | null>>();
  const resolveConnectionName = (connectionId: string): Promise<string | null> => {
    const cached = connectionNameById.get(connectionId);
    if (cached) return cached;

    const pending = connectionCatalog
      .getConnection(scope, connectionId)
      .then((connection) => connection.name)
      .catch((error: unknown) => {
        if (error instanceof WarehouseConnectionNotFoundError) return null;
        throw error;
      });
    connectionNameById.set(connectionId, pending);
    return pending;
  };
  const refreshNodes = (nodes: readonly WorkspaceGraphAuthoringNode[]) =>
    Promise.all(nodes.map((node) => refreshNodeConnectionName(node, resolveConnectionName)));

  return {
    ...draft,
    nodes: await refreshNodes(draft.nodes),
    ...(draft.canvases === undefined
      ? {}
      : {
          canvases: await Promise.all(
            draft.canvases.map(async (workspace) => ({
              ...workspace,
              nodes: await refreshNodes(workspace.nodes),
            }))
          ),
        }),
  };
}

async function refreshNodeConnectionName(
  node: WorkspaceGraphAuthoringNode,
  resolveConnectionName: (connectionId: string) => Promise<string | null>
): Promise<WorkspaceGraphAuthoringNode> {
  if (node.kind !== 'dvt:source' || node.metadata === undefined) return node;

  const sourceRef = ConnectedSourceRefSchema.safeParse(node.metadata.connectedSourceRef);
  if (!sourceRef.success) return node;

  const connectionName = await resolveConnectionName(sourceRef.data.connectionRef.connectionId);
  const { connectionName: _staleConnectionName, ...metadataWithoutConnectionName } = node.metadata;
  return {
    ...node,
    metadata: {
      ...metadataWithoutConnectionName,
      ...(connectionName === null ? {} : { connectionName }),
    },
  };
}

async function resolveGraphDraftAuthoringAuthority(
  authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolveGraphDraftReadAuthority'>,
  scope: WorkspaceGraphDraftDecisionContext['scope'],
  canvasId: string | null
): Promise<CanvasAuthoringAuthorityResolution> {
  return canvasId === null
    ? {
        kind: 'unresolved',
        reason: 'missing_authority',
        canvasId: null,
      }
    : authorityPolicy.resolveGraphDraftReadAuthority({ ...scope, canvasId });
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
