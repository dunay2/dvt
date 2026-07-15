import { createHash } from 'node:crypto';

import {
  DbtProjectImportCommandSchema,
  DbtProjectImportResultSchema,
  type DbtProjectImportCommand,
  type DbtProjectImportResult,
  type DbtProjectImportValidationReceipt,
} from '@dvt/contracts';

import type {
  DbtProjectImportProcessFailResult,
  IDbtProjectImportProcessStore,
} from '../ports/dbtProjectImport.js';
import {
  DbtProjectImportAuthorityConflictError,
  DbtProjectImportCanvasOccupiedError,
  DbtProjectImportIdempotencyMismatchError,
  DbtProjectImportInProgressError,
  DbtProjectImportProjectionError,
  DbtProjectImportRejectedError,
  DbtProjectImportStaleReceiptError,
} from '../ports/dbtProjectImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import type { ProjectDbtGraphFromFilesUseCase } from './projectDbtGraphFromFilesUseCase.js';
import type { ValidateDbtProjectImportUseCase } from './validateDbtProjectImportUseCase.js';

export class ImportDbtProjectUseCase {
  public constructor(
    private readonly deps: {
      readonly validator: Pick<ValidateDbtProjectImportUseCase, 'execute'>;
      readonly processStore: IDbtProjectImportProcessStore;
      readonly projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
      readonly now: () => Date;
      readonly createLeaseToken: () => string;
      readonly operationLeaseMs: number;
    }
  ) {}

  public async execute(
    scope: WorkspaceStorageScope,
    rawCommand: DbtProjectImportCommand
  ): Promise<DbtProjectImportResult> {
    const command = DbtProjectImportCommandSchema.parse(rawCommand);
    const key = { ...scope, canvasId: command.canvasId };
    const requestHash = sha256(command);
    const replay = await this.deps.processStore.readCompleted({
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
    const binding = {
      schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
      canvasId: command.canvasId,
      authority: {
        kind: 'dbt-project-files' as const,
        projectRoot: command.validationReceipt.projectRoot,
      },
    };
    const revision = `authority-${command.validationReceipt.validationSha256}`;
    const now = this.deps.now();
    const leaseToken = this.deps.createLeaseToken();
    const beginResult = await this.deps.processStore.begin({
      key,
      binding,
      idempotencyKey: command.idempotencyKey,
      requestHash,
      revision,
      leaseToken,
      leaseExpiresAt: new Date(now.getTime() + this.deps.operationLeaseMs).toISOString(),
      nowIso: now.toISOString(),
    });
    if (beginResult.kind === 'completed') {
      return DbtProjectImportResultSchema.parse(beginResult.receipt.result);
    }
    if (beginResult.kind === 'in_progress') {
      throw new DbtProjectImportInProgressError(beginResult.leaseExpiresAt);
    }
    if (beginResult.kind === 'canvas_occupied') {
      throw new DbtProjectImportCanvasOccupiedError();
    }
    if (beginResult.kind === 'conflict') throw new DbtProjectImportAuthorityConflictError();
    if (beginResult.kind === 'idempotency_mismatch') {
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
        importedAt: beginResult.record.updatedAt,
      });
      const completed = await this.deps.processStore.complete({
        key,
        idempotencyKey: command.idempotencyKey,
        requestHash,
        leaseToken: beginResult.leaseToken,
        result,
        nowIso: this.deps.now().toISOString(),
      });
      if (completed.kind === 'idempotency_mismatch') {
        throw new DbtProjectImportIdempotencyMismatchError();
      }
      if (completed.kind === 'lease_lost') {
        throw new Error('The dbt project import lease ownership was lost before completion.');
      }
      if (completed.kind === 'authority_conflict') {
        throw new DbtProjectImportAuthorityConflictError();
      }
      return DbtProjectImportResultSchema.parse(completed.receipt.result);
    } catch (error) {
      let failed: DbtProjectImportProcessFailResult;
      try {
        failed = await this.deps.processStore.fail({
          key,
          expectedRevision: beginResult.record.revision,
          idempotencyKey: command.idempotencyKey,
          requestHash,
          leaseToken: beginResult.leaseToken,
          nowIso: this.deps.now().toISOString(),
        });
      } catch (compensationError) {
        throw new AggregateError(
          [error, compensationError],
          'dbt project import failed and process compensation could not be persisted.',
          { cause: compensationError }
        );
      }
      if (failed.kind === 'completed') {
        return DbtProjectImportResultSchema.parse(failed.receipt.result);
      }
      if (failed.kind !== 'failed') {
        throw new AggregateError(
          [error, new Error(`Process compensation failed: ${failed.kind}`)],
          failed.kind === 'lease_lost'
            ? 'dbt project import failed after lease ownership was lost.'
            : 'dbt project import failed and process compensation was not completed.',
          { cause: error }
        );
      }
      throw error;
    }
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
