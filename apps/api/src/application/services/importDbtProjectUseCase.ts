import { createHash } from 'node:crypto';

import {
  DbtProjectImportCommandSchema,
  DbtProjectImportResultSchema,
  WorkspaceGraphAuthoringDraftSchema,
  type DbtProjectImportCommand,
  type DbtProjectImportResult,
  type DbtProjectImportValidationReceipt,
} from '@dvt/contracts';

import type { ICanvasAuthoringAuthorityStore } from '../ports/canvasAuthoringAuthority.js';
import type { IDbtProjectImportReceiptStore } from '../ports/dbtProjectImport.js';
import {
  DbtProjectImportAuthorityConflictError,
  DbtProjectImportCanvasOccupiedError,
  DbtProjectImportIdempotencyMismatchError,
  DbtProjectImportProjectionError,
  DbtProjectImportRejectedError,
  DbtProjectImportStaleReceiptError,
} from '../ports/dbtProjectImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';

import type { ProjectDbtGraphFromFilesUseCase } from './projectDbtGraphFromFilesUseCase.js';
import type { ValidateDbtProjectImportUseCase } from './validateDbtProjectImportUseCase.js';

export class ImportDbtProjectUseCase {
  public constructor(
    private readonly deps: {
      readonly validator: Pick<ValidateDbtProjectImportUseCase, 'execute'>;
      readonly authorityStore: ICanvasAuthoringAuthorityStore;
      readonly graphDraftStore: IWorkspaceGraphDraftStore;
      readonly receiptStore: IDbtProjectImportReceiptStore;
      readonly projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
      readonly now: () => Date;
    }
  ) {}

  public async execute(
    scope: WorkspaceStorageScope,
    rawCommand: DbtProjectImportCommand
  ): Promise<DbtProjectImportResult> {
    const command = DbtProjectImportCommandSchema.parse(rawCommand);
    const key = { ...scope, canvasId: command.canvasId };
    const requestHash = sha256(command);
    const replay = await this.deps.receiptStore.read({
      key,
      idempotencyKey: command.idempotencyKey,
    });
    if (replay) {
      if (replay.requestHash !== requestHash) {
        throw new DbtProjectImportIdempotencyMismatchError();
      }
      return DbtProjectImportResultSchema.parse(replay.result);
    }

    const freshReport = await this.deps.validator.execute(scope, {
      schemaVersion: 'validate-dbt-project-import-request.v1',
      projectRoot: command.validationReceipt.projectRoot,
    });
    if (freshReport.status !== 'accepted') throw new DbtProjectImportRejectedError();
    if (!sameReceipt(command.validationReceipt, freshReport.receipt)) {
      throw new DbtProjectImportStaleReceiptError();
    }
    await this.assertCanvasUnoccupied(scope, command.canvasId);

    const binding = {
      schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
      canvasId: command.canvasId,
      authority: {
        kind: 'dbt-project-files' as const,
        projectRoot: command.validationReceipt.projectRoot,
      },
    };
    const revision = `authority-${command.validationReceipt.validationSha256}`;
    const bindResult = await this.deps.authorityStore.bind({
      key,
      binding,
      idempotencyKey: command.idempotencyKey,
      requestHash,
      revision,
      nowIso: this.deps.now().toISOString(),
    });
    if (bindResult.kind === 'canvas_occupied') {
      throw new DbtProjectImportCanvasOccupiedError();
    }
    if (bindResult.kind === 'conflict') throw new DbtProjectImportAuthorityConflictError();
    if (bindResult.kind === 'idempotency_mismatch') {
      throw new DbtProjectImportIdempotencyMismatchError();
    }

    try {
      const projection = await this.deps.projectGraph.execute({
        scope,
        canvasId: command.canvasId,
      });
      if (
        projection.freshness !== 'fresh' ||
        projection.authorityBinding.authority.kind !== 'dbt-project-files' ||
        projection.authorityBinding.authority.projectRoot !==
          command.validationReceipt.projectRoot ||
        projection.projectRevision.contentSetSha256 !==
          command.validationReceipt.contentSetSha256 ||
        projection.analysisSha256 !== command.validationReceipt.analysisSha256
      ) {
        throw new DbtProjectImportProjectionError();
      }
      const result = DbtProjectImportResultSchema.parse({
        schemaVersion: 'dbt-project-import-result.v1',
        success: true,
        idempotencyKey: command.idempotencyKey,
        authorityBinding: projection.authorityBinding,
        projectRevision: projection.projectRevision,
        analysisSha256: projection.analysisSha256,
        projectedResourceCount: projection.nodes.length,
        importedAt: bindResult.record.updatedAt,
      });
      const recorded = await this.deps.receiptStore.record({
        key,
        idempotencyKey: command.idempotencyKey,
        requestHash,
        result,
      });
      if (recorded.kind === 'idempotency_mismatch') {
        throw new DbtProjectImportIdempotencyMismatchError();
      }
      return DbtProjectImportResultSchema.parse(recorded.receipt.result);
    } catch (error) {
      if (!bindResult.deduplicated) {
        const released = await this.deps.authorityStore.release({
          key,
          expectedRevision: bindResult.record.revision,
          idempotencyKey: command.idempotencyKey,
          requestHash,
        });
        if (released.kind !== 'released') {
          throw new AggregateError(
            [error, new Error(`Authority rollback failed: ${released.kind}`)],
            'dbt project import failed and authority rollback was not completed.',
            { cause: error }
          );
        }
      }
      throw error;
    }
  }

  private async assertCanvasUnoccupied(
    scope: WorkspaceStorageScope,
    canvasId: string
  ): Promise<void> {
    const stored = await this.deps.graphDraftStore.read(scope);
    if (!stored) return;
    const parsed = WorkspaceGraphAuthoringDraftSchema.safeParse(stored.draftPayload);
    if (!parsed.success) throw new DbtProjectImportCanvasOccupiedError();
    const draft = parsed.data;
    const occupied =
      draft.canvas.id === canvasId ||
      draft.canvases?.some((workspace) => workspace.canvas.id === canvasId) === true;
    if (occupied) throw new DbtProjectImportCanvasOccupiedError();
  }
}

function sameReceipt(
  left: DbtProjectImportValidationReceipt,
  right: DbtProjectImportValidationReceipt
): boolean {
  return (
    left.projectRoot === right.projectRoot &&
    left.contentSetSha256 === right.contentSetSha256 &&
    left.analysisSha256 === right.analysisSha256 &&
    left.validationSha256 === right.validationSha256 &&
    left.policyVersion === right.policyVersion
  );
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}
