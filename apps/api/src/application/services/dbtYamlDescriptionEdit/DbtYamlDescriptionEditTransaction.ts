/** Owned concern: coordinate one proposed, conditional, and reversible dbt YAML description edit. */
import { createHash } from 'node:crypto';

import type { DbtProjectGraphProjection } from '@dvt/contracts';

import {
  DbtYamlDescriptionProposalMismatchError,
  DbtYamlDescriptionReceiptInvalidError,
  DbtYamlDescriptionResourceNotFoundError,
  DbtYamlDescriptionResourceUnsupportedError,
  DbtYamlDescriptionRevisionConflictError,
  type ApplyDbtYamlDescriptionEditInput,
  type DbtYamlDescriptionAnalysisReceipt,
  type DbtYamlDescriptionAppliedReceipt,
  type DbtYamlDescriptionEditProposal,
  type DbtYamlDescriptionResourceIdentity,
  type DbtYamlDescriptionRevertedReceipt,
  type IDbtYamlDescriptionMutator,
  type ProposeDbtYamlDescriptionEditInput,
  type RevertDbtYamlDescriptionEditInput,
} from '../../ports/dbtYamlDescriptionEdit.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
} from '../../ports/workspaceFiles.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../projectDbtGraphFromFilesUseCase.js';

const EDITABLE_RESOURCE_TYPES = new Set<DbtYamlDescriptionResourceIdentity['resourceType']>([
  'model',
  'seed',
  'snapshot',
  'source',
  'exposure',
  'metric',
]);

export class DbtYamlDescriptionEditTransaction {
  public constructor(
    private readonly deps: Readonly<{
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      batchMutation: IWorkspaceFileBatchMutationPort;
      mutator: IDbtYamlDescriptionMutator;
      projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
    }>
  ) {}

  public async propose(
    input: ProposeDbtYamlDescriptionEditInput
  ): Promise<DbtYamlDescriptionEditProposal> {
    const context = await this.resolveResourceContext(
      input.scope,
      input.canvasId,
      input.resourceUniqueId
    );
    const file = await this.deps.workspaceFiles.getFileContent(input.scope, context.path);
    const mutation = this.deps.mutator.mutate({
      content: file.content,
      resource: context.resource,
      nextDescription: input.nextDescription,
    });
    const candidateContentSha256 = sha256(mutation.content);
    const proposalFields = {
      canvasId: input.canvasId,
      resource: context.resource,
      path: context.path,
      previousDescription: mutation.previousDescription,
      nextDescription: mutation.nextDescription,
      expectedContentSha256: file.contentSha256,
      candidateContentSha256,
    } as const;

    return {
      schemaVersion: 'dbt-yaml-description-edit-proposal.v1',
      ...proposalFields,
      candidateContent: mutation.content,
      unifiedDiff: buildFocusedUnifiedDiff(file.content, mutation.content, context.path),
      proposalDigest: proposalDigest(proposalFields),
    };
  }

  public async apply(
    input: ApplyDbtYamlDescriptionEditInput
  ): Promise<DbtYamlDescriptionAppliedReceipt> {
    assertProposalIntegrity(input.proposal);
    const context = await this.resolveResourceContext(
      input.scope,
      input.proposal.canvasId,
      input.proposal.resource.uniqueId
    );
    assertContextMatchesProposal(context, input.proposal);

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
        {
          path: context.path,
          expectedContentSha256: input.proposal.expectedContentSha256,
        },
      ],
      writes: [{ path: context.path, content: input.proposal.candidateContent }],
      deletes: [],
      idempotencyKey: applyIdempotencyKey(input.idempotencyKey),
    });
    if (batchResult.kind === 'conflict') {
      const conflict = batchResult.conflicts.find((entry) => entry.path === context.path);
      throw new DbtYamlDescriptionRevisionConflictError(
        context.path,
        conflict?.currentContentSha256 ?? null
      );
    }

    const projection = await this.deps.projectGraph.execute({
      scope: input.scope,
      canvasId: input.proposal.canvasId,
    });
    return {
      schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
      receiptId: receiptId('apply', input.scope, input.idempotencyKey, batchResult.requestHash),
      canvasId: input.proposal.canvasId,
      resource: input.proposal.resource,
      path: input.proposal.path,
      previousDescription: input.proposal.previousDescription,
      nextDescription: input.proposal.nextDescription,
      expectedContentSha256: input.proposal.expectedContentSha256,
      appliedContentSha256: input.proposal.candidateContentSha256,
      proposalDigest: input.proposal.proposalDigest,
      idempotencyKey: input.idempotencyKey,
      requestHash: batchResult.requestHash,
      deduplicated: batchResult.deduplicated,
      analysis: analysisReceipt(projection),
    };
  }

  public async revert(
    input: RevertDbtYamlDescriptionEditInput
  ): Promise<DbtYamlDescriptionRevertedReceipt> {
    assertAppliedReceiptIntegrity(input.scope, input.appliedReceipt);
    const context = await this.resolveResourceContext(
      input.scope,
      input.appliedReceipt.canvasId,
      input.appliedReceipt.resource.uniqueId
    );
    assertContextMatchesReceipt(context, input.appliedReceipt);
    const file = await this.deps.workspaceFiles.getFileContent(input.scope, context.path);
    const mutation = this.deps.mutator.mutate({
      content: file.content,
      resource: context.resource,
      nextDescription: input.appliedReceipt.previousDescription,
    });

    const batchResult = await this.deps.batchMutation.apply(input.scope, {
      expectedFiles: [
        {
          path: context.path,
          expectedContentSha256: input.appliedReceipt.appliedContentSha256,
        },
      ],
      writes: [{ path: context.path, content: mutation.content }],
      deletes: [],
      idempotencyKey: revertIdempotencyKey(input.idempotencyKey),
    });
    if (batchResult.kind === 'conflict') {
      const conflict = batchResult.conflicts.find((entry) => entry.path === context.path);
      throw new DbtYamlDescriptionRevisionConflictError(
        context.path,
        conflict?.currentContentSha256 ?? null
      );
    }

    const revertedContentSha256 = sha256(mutation.content);
    const projection = await this.deps.projectGraph.execute({
      scope: input.scope,
      canvasId: input.appliedReceipt.canvasId,
    });
    return {
      schemaVersion: 'dbt-yaml-description-edit-reverted-receipt.v1',
      receiptId: receiptId('revert', input.scope, input.idempotencyKey, batchResult.requestHash),
      appliedReceiptId: input.appliedReceipt.receiptId,
      canvasId: input.appliedReceipt.canvasId,
      resource: input.appliedReceipt.resource,
      path: context.path,
      restoredDescription: input.appliedReceipt.previousDescription,
      expectedContentSha256: input.appliedReceipt.appliedContentSha256,
      revertedContentSha256,
      idempotencyKey: input.idempotencyKey,
      requestHash: batchResult.requestHash,
      deduplicated: batchResult.deduplicated,
      analysis: analysisReceipt(projection),
    };
  }

  private async resolveResourceContext(
    scope: ProposeDbtYamlDescriptionEditInput['scope'],
    canvasId: string,
    resourceUniqueId: string
  ): Promise<ResourceContext> {
    const projection = await this.deps.projectGraph.execute({ scope, canvasId });
    const resource = projection.nodes.find((node) => node.uniqueId === resourceUniqueId);
    if (!resource) throw new DbtYamlDescriptionResourceNotFoundError(resourceUniqueId);
    if (!isEditableResourceType(resource.resourceType)) {
      throw new DbtYamlDescriptionResourceUnsupportedError(resourceUniqueId);
    }
    if (!resource.originalFilePath) {
      throw new DbtYamlDescriptionResourceUnsupportedError(resourceUniqueId);
    }
    const authority = projection.authorityBinding.authority;
    if (authority.kind !== 'dbt-project-files') {
      throw new DbtYamlDescriptionResourceUnsupportedError(resourceUniqueId);
    }
    return {
      resource: {
        uniqueId: resource.uniqueId,
        resourceType: resource.resourceType,
        name: resource.name,
        ...(resource.sourceName === undefined ? {} : { sourceName: resource.sourceName }),
      },
      path: joinProjectPath(authority.projectRoot, resource.originalFilePath),
    };
  }
}

function isEditableResourceType(
  value: DbtProjectGraphProjection['nodes'][number]['resourceType']
): value is DbtYamlDescriptionResourceIdentity['resourceType'] {
  return EDITABLE_RESOURCE_TYPES.has(value as DbtYamlDescriptionResourceIdentity['resourceType']);
}

type ResourceContext = Readonly<{
  resource: DbtYamlDescriptionResourceIdentity;
  path: string;
}>;

function assertProposalIntegrity(proposal: DbtYamlDescriptionEditProposal): void {
  if (
    proposal.schemaVersion !== 'dbt-yaml-description-edit-proposal.v1' ||
    sha256(proposal.candidateContent) !== proposal.candidateContentSha256 ||
    proposalDigest(proposal) !== proposal.proposalDigest
  ) {
    throw new DbtYamlDescriptionProposalMismatchError();
  }
}

function assertAppliedReceiptIntegrity(
  scope: ProposeDbtYamlDescriptionEditInput['scope'],
  receipt: DbtYamlDescriptionAppliedReceipt
): void {
  const expectedProposalDigest = proposalDigest({
    canvasId: receipt.canvasId,
    resource: receipt.resource,
    path: receipt.path,
    previousDescription: receipt.previousDescription,
    nextDescription: receipt.nextDescription,
    expectedContentSha256: receipt.expectedContentSha256,
    candidateContentSha256: receipt.appliedContentSha256,
  });
  const expectedReceiptId = receiptId('apply', scope, receipt.idempotencyKey, receipt.requestHash);
  if (
    receipt.schemaVersion !== 'dbt-yaml-description-edit-applied-receipt.v1' ||
    receipt.proposalDigest !== expectedProposalDigest ||
    receipt.receiptId !== expectedReceiptId
  ) {
    throw new DbtYamlDescriptionReceiptInvalidError(receipt.receiptId);
  }
}

function assertContextMatchesProposal(
  context: ResourceContext,
  proposal: DbtYamlDescriptionEditProposal
): void {
  if (context.path !== proposal.path || !sameResource(context.resource, proposal.resource)) {
    throw new DbtYamlDescriptionProposalMismatchError();
  }
}

function assertContextMatchesReceipt(
  context: ResourceContext,
  receipt: DbtYamlDescriptionAppliedReceipt
): void {
  if (context.path !== receipt.path || !sameResource(context.resource, receipt.resource)) {
    throw new DbtYamlDescriptionReceiptInvalidError(receipt.receiptId);
  }
}

function sameResource(
  left: DbtYamlDescriptionResourceIdentity,
  right: DbtYamlDescriptionResourceIdentity
): boolean {
  return (
    left.uniqueId === right.uniqueId &&
    left.resourceType === right.resourceType &&
    left.name === right.name &&
    left.sourceName === right.sourceName
  );
}

function proposalDigest(
  input: Readonly<
    Omit<
      DbtYamlDescriptionEditProposal,
      'schemaVersion' | 'candidateContent' | 'unifiedDiff' | 'proposalDigest'
    >
  >
): string {
  return sha256(
    JSON.stringify({
      canvasId: input.canvasId,
      resource: input.resource,
      path: input.path,
      previousDescription: input.previousDescription,
      nextDescription: input.nextDescription,
      expectedContentSha256: input.expectedContentSha256,
      candidateContentSha256: input.candidateContentSha256,
    })
  );
}

function receiptId(
  operation: 'apply' | 'revert',
  scope: ProposeDbtYamlDescriptionEditInput['scope'],
  idempotencyKey: string,
  requestHash: string
): string {
  return sha256(JSON.stringify({ operation, scope, idempotencyKey, requestHash }));
}

function analysisReceipt(projection: DbtProjectGraphProjection): DbtYamlDescriptionAnalysisReceipt {
  return {
    freshness: projection.freshness,
    analysisSha256: projection.analysisSha256,
    projectContentSetSha256: projection.projectRevision.contentSetSha256,
  };
}

function joinProjectPath(projectRoot: string, originalFilePath: string): string {
  const normalizedFilePath = originalFilePath.replaceAll('\\', '/').replace(/^\/+|\/+$/gu, '');
  const segments = normalizedFilePath.split('/');
  if (
    normalizedFilePath.length === 0 ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new DbtYamlDescriptionResourceUnsupportedError(originalFilePath);
  }
  return projectRoot === '.' ? normalizedFilePath : `${projectRoot}/${normalizedFilePath}`;
}

function buildFocusedUnifiedDiff(before: string, after: string, filePath: string): string {
  if (before === after) return '';
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  let prefix = 0;
  while (
    prefix < beforeLines.length &&
    prefix < afterLines.length &&
    beforeLines[prefix] === afterLines[prefix]
  ) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < beforeLines.length - prefix &&
    suffix < afterLines.length - prefix &&
    beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  const contextStart = Math.max(0, prefix - 2);
  const afterEnd = Math.min(afterLines.length, afterLines.length - suffix + 2);
  const lines = [`--- a/${filePath}`, `+++ b/${filePath}`];
  lines.push(...beforeLines.slice(contextStart, prefix).map((line) => ` ${line}`));
  lines.push(...beforeLines.slice(prefix, beforeLines.length - suffix).map((line) => `-${line}`));
  lines.push(...afterLines.slice(prefix, afterLines.length - suffix).map((line) => `+${line}`));
  lines.push(...afterLines.slice(afterLines.length - suffix, afterEnd).map((line) => ` ${line}`));
  return lines.join('\n');
}

function applyIdempotencyKey(value: string): string {
  return `dbt-yaml-description-apply:${value}`;
}

function revertIdempotencyKey(value: string): string {
  return `dbt-yaml-description-revert:${value}`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
