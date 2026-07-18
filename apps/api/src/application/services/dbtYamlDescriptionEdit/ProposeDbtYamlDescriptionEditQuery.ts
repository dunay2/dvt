/** Owned concern: propose one exact dbt YAML description edit without mutating files. */
import type { DbtYamlDescriptionEditProposal } from '@dvt/contracts';

import type {
  IDbtYamlDescriptionMutator,
  IDbtYamlDescriptionResourceResolver,
  IProposeDbtYamlDescriptionEditQuery,
  ProposeDbtYamlDescriptionEditInput,
} from '../../ports/dbtYamlDescriptionEdit.js';
import type { IWorkspaceFileRepository } from '../../ports/workspaceFiles.js';

import {
  buildFocusedUnifiedDiff,
  proposalDigest,
  sha256,
} from './dbtYamlDescriptionEditIntegrity.js';

export class ProposeDbtYamlDescriptionEditQuery implements IProposeDbtYamlDescriptionEditQuery {
  public constructor(
    private readonly deps: Readonly<{
      resolver: IDbtYamlDescriptionResourceResolver;
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      mutator: IDbtYamlDescriptionMutator;
    }>
  ) {}

  public async propose(
    input: ProposeDbtYamlDescriptionEditInput
  ): Promise<DbtYamlDescriptionEditProposal> {
    const context = await this.deps.resolver.resolve(input);
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
}
