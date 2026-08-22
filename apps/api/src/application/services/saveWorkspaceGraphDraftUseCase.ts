/**
 * Owned concern: save protected workspace graph authoring drafts with
 * capability, compare-and-swap, idempotency, audit, and format metadata.
 *
 * The use case persists editable authoring truth only. It does not compile the
 * draft, invent compatibility payloads, or translate HTTP responses.
 */
import { randomUUID } from 'node:crypto';

import {
  WorkspaceGraphAuthoringDraftSchema,
  WORKSPACE_GRAPH_DRAFT_AUDIT_ACTION,
  WORKSPACE_GRAPH_DRAFT_AUDIT_OUTCOME,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  parseWorkspaceGraphDraftSaveResponse,
  resolveWorkspaceGraphDraftCanvasIds,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
  type WorkspaceGraphDraftAuditOutcome,
  type WorkspaceGraphDraftAuditRef,
  type WorkspaceGraphDraftSaveRequest,
  type WorkspaceGraphDraftSaveResponse,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import { WorkspaceFileRevisionConflictError } from '../ports/workspaceFiles.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchReceipt,
} from '../ports/workspaceFiles.js';
import type {
  IWorkspaceGraphDraftAuditPort,
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
  WorkspaceGraphDraftSaveStoreResult,
} from '../ports/workspaceGraphDraft.js';

import {
  applyWarehouseSourceRemovalFilePlan,
  buildWarehouseSourceRemovalFilePlan,
  rollbackWarehouseSourceRemovalFilePlan,
  type WarehouseSourceRemovalFilePlan,
} from './warehouseSourceRemovalPlan.js';

export type SaveWorkspaceGraphDraftUseCaseResult = {
  readonly kind: 'response';
  readonly httpStatus: 200 | 401 | 403 | 409 | 422;
  readonly response: WorkspaceGraphDraftSaveResponse;
};

export class SaveWorkspaceGraphDraftUseCase {
  public constructor(
    private readonly store: IWorkspaceGraphDraftStore,
    private readonly audit: IWorkspaceGraphDraftAuditPort,
    private readonly clock: () => Date,
    private readonly sourceRemoval: Readonly<{
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      batchMutation: IWorkspaceFileBatchMutationPort;
    }>
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

    const previousRecord = await this.store.read(request.scope);
    const sourceRemovalPlan = await this.buildSourceRemovalPlan(request, previousRecord);
    let appliedSourceRemoval: WorkspaceFileBatchReceipt | null = null;
    let workspaceFileConflictPath: string | null = null;
    let saveResult: WorkspaceGraphDraftSaveStoreResult;
    try {
      if (sourceRemovalPlan) {
        appliedSourceRemoval = await applyWarehouseSourceRemovalFilePlan({
          scope: request.scope,
          idempotencyKey: request.idempotencyKey,
          plan: sourceRemovalPlan,
          batchMutation: this.sourceRemoval.batchMutation,
        });
      }
      saveResult = await this.store.save({
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
    } catch (error) {
      if (error instanceof WorkspaceFileRevisionConflictError && !appliedSourceRemoval) {
        workspaceFileConflictPath = error.path;
        saveResult = {
          kind: 'conflict' as const,
          currentRevision: previousRecord?.revision ?? request.expectedRevision,
          storedSchemaVersion:
            previousRecord?.schemaVersion ?? WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          updatedAt: previousRecord?.updatedAt ?? null,
        };
      } else {
        await this.rollbackSourceRemovalAfterFailure({
          request,
          plan: sourceRemovalPlan,
          appliedReceipt: appliedSourceRemoval,
          cause: error,
        });
        throw error;
      }
    }

    if (saveResult.kind !== 'saved') {
      await this.rollbackSourceRemovalAfterFailure({
        request,
        plan: sourceRemovalPlan,
        appliedReceipt: appliedSourceRemoval,
        cause: new Error(`Workspace graph draft save returned ${saveResult.kind}.`),
      });
    }

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
          ...(workspaceFileConflictPath === null ? {} : { workspaceFileConflictPath }),
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

  private async buildSourceRemovalPlan(
    request: WorkspaceGraphDraftSaveRequest,
    previousRecord: Awaited<ReturnType<IWorkspaceGraphDraftStore['read']>>
  ): Promise<WarehouseSourceRemovalFilePlan | null> {
    if (
      !previousRecord ||
      previousRecord.revision !== request.expectedRevision ||
      previousRecord.schemaVersion !== WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION
    ) {
      return null;
    }
    const previousDraft = WorkspaceGraphAuthoringDraftSchema.safeParse(previousRecord.draftPayload);
    if (!previousDraft.success) return null;

    const plan = await buildWarehouseSourceRemovalFilePlan({
      scope: request.scope,
      previousDraft: previousDraft.data,
      nextDraft: request.draft,
      workspaceFiles: this.sourceRemoval.workspaceFiles,
    });
    return plan.writes.length === 0 && plan.deletes.length === 0 ? null : plan;
  }

  private async rollbackSourceRemovalAfterFailure(input: {
    readonly request: WorkspaceGraphDraftSaveRequest;
    readonly plan: WarehouseSourceRemovalFilePlan | null;
    readonly appliedReceipt: WorkspaceFileBatchReceipt | null;
    readonly cause: unknown;
  }): Promise<void> {
    if (!input.plan || !input.appliedReceipt || input.appliedReceipt.deduplicated) return;
    try {
      await rollbackWarehouseSourceRemovalFilePlan({
        scope: input.request.scope,
        idempotencyKey: input.request.idempotencyKey,
        plan: input.plan,
        appliedReceipt: input.appliedReceipt,
        batchMutation: this.sourceRemoval.batchMutation,
      });
    } catch (rollbackError) {
      throw new AggregateError(
        [input.cause, rollbackError],
        'Workspace graph draft save failed and source YAML rollback was incomplete.',
        { cause: rollbackError }
      );
    }
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
