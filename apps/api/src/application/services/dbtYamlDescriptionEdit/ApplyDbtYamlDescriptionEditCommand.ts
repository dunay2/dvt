/** Owned concern: conditionally apply one trusted dbt YAML description proposal. */
import {
  DbtYamlDescriptionAppliedReceiptSchema,
  type DbtYamlDescriptionAppliedReceipt,
} from '@dvt/contracts';

import {
  DbtYamlDescriptionPersistenceInvariantError,
  DbtYamlDescriptionProposalMismatchError,
  DbtYamlDescriptionReceiptInvalidError,
  DbtYamlDescriptionRevisionConflictError,
  type ApplyDbtYamlDescriptionEditInput,
  type IDbtYamlDescriptionMutator,
  type IDbtYamlDescriptionReceiptStore,
  type IDbtYamlDescriptionResourceResolver,
  type IApplyDbtYamlDescriptionEditCommand,
} from '../../ports/dbtYamlDescriptionEdit.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
} from '../../ports/workspaceFiles.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../projectDbtGraphFromFilesUseCase.js';

import {
  analysisReceipt,
  assertProposalIntegrity,
  batchIdempotencyKey,
  operationReceiptId,
  operationRequestHash,
} from './dbtYamlDescriptionEditIntegrity.js';

export class ApplyDbtYamlDescriptionEditCommand implements IApplyDbtYamlDescriptionEditCommand {
  public constructor(
    private readonly deps: Readonly<{
      resolver: IDbtYamlDescriptionResourceResolver;
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      batchMutation: IWorkspaceFileBatchMutationPort;
      mutator: IDbtYamlDescriptionMutator;
      projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
      receipts: IDbtYamlDescriptionReceiptStore;
    }>
  ) {}

  public async apply(
    input: ApplyDbtYamlDescriptionEditInput
  ): Promise<DbtYamlDescriptionAppliedReceipt> {
    assertProposalIntegrity(input.proposal);
    const requestHash = operationRequestHash('apply', input.scope, {
      proposalDigest: input.proposal.proposalDigest,
      idempotencyKey: input.idempotencyKey,
    });
    const receiptId = operationReceiptId('apply', requestHash);
    const existing = await this.deps.receipts.findApplied(input.scope, receiptId);
    if (existing !== null) {
      if (existing.requestHash !== requestHash || existing.receiptId !== receiptId) {
        throw new DbtYamlDescriptionReceiptInvalidError(receiptId);
      }
      return { ...existing, deduplicated: true };
    }

    const context = await this.deps.resolver.resolve({
      scope: input.scope,
      canvasId: input.proposal.canvasId,
      resourceUniqueId: input.proposal.resource.uniqueId,
    });
    if (
      context.path !== input.proposal.path ||
      JSON.stringify(context.resource) !== JSON.stringify(input.proposal.resource)
    ) {
      throw new DbtYamlDescriptionProposalMismatchError();
    }

    const file = await this.deps.workspaceFiles.getFileContent(input.scope, context.path);
    if (
      file.contentSha256 !== input.proposal.expectedContentSha256 &&
      file.contentSha256 !== input.proposal.candidateContentSha256
    ) {
      throw new DbtYamlDescriptionRevisionConflictError(context.path, file.contentSha256);
    }
    if (file.contentSha256 === input.proposal.expectedContentSha256) {
      const recomputed = this.deps.mutator.mutate({
        content: file.content,
        resource: context.resource,
        nextDescription: input.proposal.nextDescription,
      });
      if (
        recomputed.previousDescription !== input.proposal.previousDescription ||
        recomputed.content !== input.proposal.candidateContent
      ) {
        throw new DbtYamlDescriptionProposalMismatchError();
      }
    }

    const batchResult = await this.deps.batchMutation.apply(input.scope, {
      expectedFiles: [
        { path: context.path, expectedContentSha256: input.proposal.expectedContentSha256 },
      ],
      writes: [{ path: context.path, content: input.proposal.candidateContent }],
      deletes: [],
      idempotencyKey: batchIdempotencyKey('apply', input.idempotencyKey),
    });
    if (batchResult.kind === 'conflict') {
      const conflict = batchResult.conflicts.find((entry) => entry.path === context.path);
      throw new DbtYamlDescriptionRevisionConflictError(
        context.path,
        conflict?.currentContentSha256 ?? null
      );
    }
    const write = batchResult.writes.find((entry) => entry.path === context.path);
    if (write?.contentSha256 !== input.proposal.candidateContentSha256) {
      throw new DbtYamlDescriptionPersistenceInvariantError(
        `Workspace mutation did not prove the expected dbt YAML revision: ${context.path}`
      );
    }

    const projection = await this.deps.projectGraph.execute({
      scope: input.scope,
      canvasId: input.proposal.canvasId,
    });
    const retainedFile = await this.deps.workspaceFiles.getFileContent(input.scope, context.path);
    if (retainedFile.contentSha256 !== input.proposal.candidateContentSha256) {
      throw new DbtYamlDescriptionRevisionConflictError(context.path, retainedFile.contentSha256);
    }

    const receipt = DbtYamlDescriptionAppliedReceiptSchema.parse({
      schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
      receiptId,
      canvasId: input.proposal.canvasId,
      resource: input.proposal.resource,
      path: input.proposal.path,
      previousDescription: input.proposal.previousDescription,
      nextDescription: input.proposal.nextDescription,
      expectedContentSha256: input.proposal.expectedContentSha256,
      appliedContentSha256: input.proposal.candidateContentSha256,
      proposalDigest: input.proposal.proposalDigest,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      deduplicated: batchResult.deduplicated,
      analysis: analysisReceipt(projection, retainedFile.contentSha256),
    });
    await this.deps.receipts.saveApplied(input.scope, receipt);
    return receipt;
  }
}
