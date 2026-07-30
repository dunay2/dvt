/**
 * Owned concern: preflight and publish the complete graph-derived DBT artifact
 * set through one protected atomic application command.
 */
import { sha256HexUtf8 } from '@dvt/contracts';

import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type {
  ExpectedWorkspaceFileRevision,
  FileContent,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import type { DbtWorkspaceArtifact } from './canvasDbtWorkspaceArtifacts';
import {
  classifyGraphModelSqlPublication,
  type GraphModelSqlReplacementAuthorization,
} from './dbtGraphModelSqlPublicationPolicy';

export type GraphSqlReplacementAuthorization = GraphModelSqlReplacementAuthorization &
  Readonly<{ path: string }>;

type PreparedArtifact = Readonly<{
  artifact: DbtWorkspaceArtifact;
  expectedRevision: ExpectedWorkspaceFileRevision;
  writeRequired: boolean;
}>;

type ArtifactPreflight =
  | Readonly<{ kind: 'prepared'; value: PreparedArtifact }>
  | Readonly<{
      kind: 'conflict';
      path: string;
      reason: 'invalid_managed' | 'unmarked';
      replacementAuthorization?: GraphSqlReplacementAuthorization;
    }>;

export type GraphDbtWorkspaceArtifactPublicationResult =
  | Readonly<{ ok: true; writtenArtifactPaths: readonly string[] }>
  | Readonly<{
      ok: false;
      kind: 'replacement_confirmation_required';
      requests: readonly GraphSqlReplacementAuthorization[];
    }>
  | Readonly<{
      ok: false;
      kind: 'non_replaceable_conflict';
      conflictPath: string;
    }>;

async function readOptionalWorkspaceFile(
  workspaceFilesQuery: IWorkspaceFilesQueryPort,
  path: string
): Promise<FileContent | undefined> {
  try {
    return await workspaceFilesQuery.getFileContent(path);
  } catch (error) {
    if (error instanceof WorkspaceFileLoadError && error.kind === 'not_found') {
      return undefined;
    }
    throw error;
  }
}

function observedRevision(file: FileContent | undefined): ExpectedWorkspaceFileRevision {
  return file ? { kind: 'content_sha256', value: file.contentSha256 } : { kind: 'absent' };
}

async function preflightArtifact(args: {
  artifact: DbtWorkspaceArtifact;
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  replacementAuthorization?: GraphSqlReplacementAuthorization;
}): Promise<ArtifactPreflight> {
  const currentFile = await readOptionalWorkspaceFile(args.workspaceFilesQuery, args.artifact.path);

  if (args.artifact.language === 'sql') {
    const decision = classifyGraphModelSqlPublication({
      proposedContent: args.artifact.content,
      currentFile,
      replacementAuthorization: args.replacementAuthorization,
    });
    if (decision.kind === 'conflict') {
      return {
        kind: 'conflict',
        path: args.artifact.path,
        reason: decision.reason,
        ...(decision.reason === 'unmarked'
          ? {
              replacementAuthorization: {
                path: args.artifact.path,
                ...decision.replacementAuthorization,
              },
            }
          : {}),
      };
    }
    return {
      kind: 'prepared',
      value: {
        artifact: args.artifact,
        expectedRevision: decision.expectedRevision,
        writeRequired: decision.kind !== 'unchanged',
      },
    };
  }

  return {
    kind: 'prepared',
    value: {
      artifact: args.artifact,
      expectedRevision: observedRevision(currentFile),
      writeRequired: currentFile?.content !== args.artifact.content,
    },
  };
}

function assertUniqueArtifactPaths(artifacts: readonly DbtWorkspaceArtifact[]): void {
  const paths = new Set<string>();
  for (const artifact of artifacts) {
    if (paths.has(artifact.path)) {
      throw new Error(`Graph-derived DBT workspace artifact path is duplicated: ${artifact.path}`);
    }
    paths.add(artifact.path);
  }
}

function publicationIdempotencyKey(artifacts: readonly PreparedArtifact[]): string {
  return `graph-dbt:${sha256HexUtf8(
    JSON.stringify(
      artifacts.map(({ artifact, expectedRevision, writeRequired }) => ({
        path: artifact.path,
        content: artifact.content,
        language: artifact.language,
        expectedRevision,
        writeRequired,
      }))
    )
  )}`;
}

export async function publishGraphDbtWorkspaceArtifacts(args: {
  artifacts: readonly DbtWorkspaceArtifact[];
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  publicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  replacementAuthorizations?: readonly GraphSqlReplacementAuthorization[];
}): Promise<GraphDbtWorkspaceArtifactPublicationResult> {
  assertUniqueArtifactPaths(args.artifacts);
  const replacementAuthorizationByPath = new Map(
    (args.replacementAuthorizations ?? []).map((authorization) => [
      authorization.path,
      authorization,
    ])
  );

  const preflight = await Promise.all(
    args.artifacts.map(async (artifact) =>
      preflightArtifact({
        artifact,
        workspaceFilesQuery: args.workspaceFilesQuery,
        replacementAuthorization: replacementAuthorizationByPath.get(artifact.path),
      })
    )
  );
  const conflicts = preflight.filter(
    (result): result is Extract<ArtifactPreflight, { kind: 'conflict' }> =>
      result.kind === 'conflict'
  );
  const nonReplaceableConflict = conflicts.find(
    (conflict) => conflict.reason === 'invalid_managed'
  );
  if (nonReplaceableConflict) {
    return {
      ok: false,
      kind: 'non_replaceable_conflict',
      conflictPath: nonReplaceableConflict.path,
    };
  }
  if (conflicts.length > 0) {
    return {
      ok: false,
      kind: 'replacement_confirmation_required',
      requests: conflicts
        .map((conflict) => conflict.replacementAuthorization)
        .filter(
          (authorization): authorization is GraphSqlReplacementAuthorization =>
            authorization != null
        ),
    };
  }

  const preparedArtifacts = preflight.map((result) => {
    if (result.kind !== 'prepared') {
      throw new Error('DBT artifact publication preflight did not produce a complete proposal.');
    }
    return result.value;
  });
  if (!preparedArtifacts.some((artifact) => artifact.writeRequired)) {
    return { ok: true, writtenArtifactPaths: [] };
  }

  const publication = await args.publicationCommand.publish({
    artifacts: preparedArtifacts.map(({ artifact, expectedRevision, writeRequired }) => ({
      path: artifact.path,
      content: artifact.content,
      language: artifact.language,
      expectedRevision,
      writeRequired,
    })),
    idempotencyKey: publicationIdempotencyKey(preparedArtifacts),
  });

  if (publication.kind === 'conflict') {
    return {
      ok: false,
      kind: 'non_replaceable_conflict',
      conflictPath: publication.conflicts[0]!.path,
    };
  }

  return {
    ok: true,
    writtenArtifactPaths: publication.writes.map((write) => write.path),
  };
}
