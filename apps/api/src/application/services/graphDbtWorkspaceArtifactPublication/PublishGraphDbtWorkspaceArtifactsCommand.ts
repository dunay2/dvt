/** Owned concern: publish one complete graph-derived dbt artifact set atomically. */
import { GraphDbtWorkspaceArtifactPublicationResultSchema } from '@dvt/contracts';

import type { IPublishGraphDbtWorkspaceArtifactsCommand } from '../../ports/graphDbtWorkspaceArtifactPublication.js';
import type { IWorkspaceFileBatchMutationPort } from '../../ports/workspaceFiles.js';

export class PublishGraphDbtWorkspaceArtifactsCommand implements IPublishGraphDbtWorkspaceArtifactsCommand {
  public constructor(private readonly batchMutation: IWorkspaceFileBatchMutationPort) {}

  public async execute(
    input: Parameters<IPublishGraphDbtWorkspaceArtifactsCommand['execute']>[0]
  ): ReturnType<IPublishGraphDbtWorkspaceArtifactsCommand['execute']> {
    const result = await this.batchMutation.apply(input.scope, {
      expectedFiles: input.artifacts.map((artifact) => ({
        path: artifact.path,
        ...(artifact.expectedRevision.kind === 'content_sha256'
          ? { expectedContentSha256: artifact.expectedRevision.value }
          : {}),
      })),
      writes: input.artifacts
        .filter((artifact) => artifact.writeRequired)
        .map((artifact) => ({ path: artifact.path, content: artifact.content })),
      deletes: [],
      idempotencyKey: input.idempotencyKey,
    });

    return GraphDbtWorkspaceArtifactPublicationResultSchema.parse(
      result.kind === 'conflict'
        ? {
            schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
            kind: 'conflict',
            conflicts: result.conflicts,
          }
        : {
            schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
            kind: 'applied',
            idempotencyKey: result.idempotencyKey,
            requestHash: result.requestHash,
            deduplicated: result.deduplicated,
            writes: result.writes,
          }
    );
  }
}
