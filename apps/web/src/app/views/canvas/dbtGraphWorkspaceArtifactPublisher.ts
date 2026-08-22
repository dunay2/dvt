/**
 * Owned concern: preflight and publish the complete graph-derived DBT artifact
 * set through one protected atomic application command.
 */
import { sha256HexUtf8 } from '@dvt/crypto';

import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type {
  ExpectedWorkspaceFileRevision,
  FileContent,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import type { DbtWorkspaceArtifact } from './canvasDbtWorkspaceArtifacts';
import { classifyGraphModelSqlPublication } from './dbtGraphModelSqlPublicationPolicy';

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
      reason: 'invalid_marker' | 'unmarked';
    }>;

export type GraphDbtWorkspaceArtifactPublicationResult =
  | Readonly<{ ok: true; writtenArtifactPaths: readonly string[] }>
  | Readonly<{
      ok: false;
      kind: 'authority_refused';
      reason: 'missing_authority' | 'mixed_authority' | 'dbt_project_files_authority';
    }>
  | Readonly<{
      ok: false;
      kind: 'non_replaceable_conflict';
      conflictPath: string;
      reason: 'invalid_marker' | 'unmarked' | 'revision_conflict';
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
}): Promise<ArtifactPreflight> {
  const currentFile = await readOptionalWorkspaceFile(args.workspaceFilesQuery, args.artifact.path);

  if (args.artifact.language === 'sql') {
    const decision = classifyGraphModelSqlPublication({
      proposedContent: args.artifact.content,
      currentFile,
    });
    if (decision.kind === 'conflict') {
      return {
        kind: 'conflict',
        path: args.artifact.path,
        reason: decision.reason,
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

function publicationIdempotencyKey(
  canvasId: string,
  artifacts: readonly PreparedArtifact[]
): string {
  return `graph-dbt:${sha256HexUtf8(
    JSON.stringify({
      canvasId,
      artifacts: artifacts.map(({ artifact, expectedRevision, writeRequired }) => ({
        path: artifact.path,
        content: artifact.content,
        language: artifact.language,
        expectedRevision,
        writeRequired,
      })),
    })
  )}`;
}

export async function publishGraphDbtWorkspaceArtifacts(args: {
  canvasId: string;
  artifacts: readonly DbtWorkspaceArtifact[];
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  publicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
}): Promise<GraphDbtWorkspaceArtifactPublicationResult> {
  assertUniqueArtifactPaths(args.artifacts);

  const preflight = await Promise.all(
    args.artifacts.map(async (artifact) =>
      preflightArtifact({
        artifact,
        workspaceFilesQuery: args.workspaceFilesQuery,
      })
    )
  );
  const conflicts = preflight.filter(
    (result): result is Extract<ArtifactPreflight, { kind: 'conflict' }> =>
      result.kind === 'conflict'
  );
  const firstConflict = conflicts[0];
  if (firstConflict) {
    return {
      ok: false,
      kind: 'non_replaceable_conflict',
      conflictPath: firstConflict.path,
      reason: firstConflict.reason,
    };
  }

  const preparedArtifacts = preflight.map((result) => {
    if (result.kind !== 'prepared') {
      throw new Error('DBT artifact publication preflight did not produce a complete proposal.');
    }
    return result.value;
  });
  const publication = await args.publicationCommand.publish({
    canvasId: args.canvasId,
    artifacts: preparedArtifacts.map(({ artifact, expectedRevision, writeRequired }) => ({
      path: artifact.path,
      content: artifact.content,
      language: artifact.language,
      expectedRevision,
      writeRequired,
    })),
    idempotencyKey: publicationIdempotencyKey(args.canvasId, preparedArtifacts),
  });

  if (publication.kind === 'authority_refused') {
    return {
      ok: false,
      kind: 'authority_refused',
      reason: publication.reason,
    };
  }
  if (publication.kind === 'conflict') {
    return {
      ok: false,
      kind: 'non_replaceable_conflict',
      conflictPath: publication.conflicts[0]!.path,
      reason: 'revision_conflict',
    };
  }

  return {
    ok: true,
    writtenArtifactPaths: publication.writes.map((write) => write.path),
  };
}
