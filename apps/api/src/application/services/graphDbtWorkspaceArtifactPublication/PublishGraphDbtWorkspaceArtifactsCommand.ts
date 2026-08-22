/** Owned concern: publish one complete graph-derived dbt artifact set atomically. */
import {
  GraphDbtWorkspaceArtifactPublicationResultSchema,
  parseGraphDbtModelDivergenceMarker,
  type GraphDbtWorkspaceArtifactPublicationItem,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import type { IPublishGraphDbtWorkspaceArtifactsCommand } from '../../ports/graphDbtWorkspaceArtifactPublication.js';
import {
  WorkspaceFileNotFoundError,
  type IWorkspaceFileBatchMutationPort,
  type IWorkspaceFileRepository,
  type WorkspaceFileContent,
} from '../../ports/workspaceFiles.js';
import type { CanvasAuthoringAuthorityPolicy } from '../canvasAuthoringAuthorityPolicy.js';

type ObservedArtifact = Readonly<{
  proposed: GraphDbtWorkspaceArtifactPublicationItem;
  current: WorkspaceFileContent | null;
}>;

export class PublishGraphDbtWorkspaceArtifactsCommand implements IPublishGraphDbtWorkspaceArtifactsCommand {
  public constructor(
    private readonly authorityPolicy: CanvasAuthoringAuthorityPolicy,
    private readonly workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>,
    private readonly batchMutation: IWorkspaceFileBatchMutationPort
  ) {}

  public async execute(
    input: Parameters<IPublishGraphDbtWorkspaceArtifactsCommand['execute']>[0]
  ): ReturnType<IPublishGraphDbtWorkspaceArtifactsCommand['execute']> {
    const publication = await this.authorityPolicy.runAuthorizedGraphArtifactPublication(
      {
        ...input.scope,
        canvasId: input.canvasId,
      },
      '.',
      async () => this.publishAuthorized(input)
    );
    if (publication.kind === 'refused') {
      return GraphDbtWorkspaceArtifactPublicationResultSchema.parse({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'authority_refused',
        canvasId: input.canvasId,
        reason: publication.reason,
      });
    }

    return publication.value;
  }

  private async publishAuthorized(
    input: Parameters<IPublishGraphDbtWorkspaceArtifactsCommand['execute']>[0]
  ): ReturnType<IPublishGraphDbtWorkspaceArtifactsCommand['execute']> {
    const observedArtifacts = await Promise.all(
      input.artifacts.map(async (proposed): Promise<ObservedArtifact> => ({
        proposed,
        current: await this.readOptionalFile(input.scope, proposed.path),
      }))
    );
    const conflicts = observedArtifacts.flatMap(({ proposed, current }) =>
      matchesExpectedRevision(proposed, current) && currentSqlMarkerIsValid(proposed, current)
        ? []
        : [{ path: proposed.path, currentContentSha256: current?.contentSha256 ?? null }]
    );
    if (conflicts.length > 0) {
      return GraphDbtWorkspaceArtifactPublicationResultSchema.parse({
        schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
        kind: 'conflict',
        conflicts,
      });
    }

    const writes = observedArtifacts
      .filter(
        ({ proposed, current }) =>
          current === null || sha256HexUtf8(proposed.content) !== current.contentSha256
      )
      .map(({ proposed }) => ({ path: proposed.path, content: proposed.content }));
    const result = await this.batchMutation.apply(input.scope, {
      expectedFiles: observedArtifacts.map(({ proposed, current }) => ({
        path: proposed.path,
        ...(current ? { expectedContentSha256: current.contentSha256 } : {}),
      })),
      writes,
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

  private async readOptionalFile(
    scope: Parameters<IWorkspaceFileRepository['getFileContent']>[0],
    path: string
  ): Promise<WorkspaceFileContent | null> {
    try {
      return await this.workspaceFiles.getFileContent(scope, path);
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) return null;
      throw error;
    }
  }
}

function matchesExpectedRevision(
  proposed: GraphDbtWorkspaceArtifactPublicationItem,
  current: WorkspaceFileContent | null
): boolean {
  return proposed.expectedRevision.kind === 'absent'
    ? current === null
    : current?.contentSha256 === proposed.expectedRevision.value;
}

function currentSqlMarkerIsValid(
  proposed: GraphDbtWorkspaceArtifactPublicationItem,
  current: WorkspaceFileContent | null
): boolean {
  if (proposed.language !== 'sql' || current === null) return true;
  return parseGraphDbtModelDivergenceMarker(current.content)?.valid === true;
}
