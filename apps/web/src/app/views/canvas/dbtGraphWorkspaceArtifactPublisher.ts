/**
 * Owned concern: preflight and publish graph-derived DBT workspace artifacts
 * without allowing a later read to redefine the expected revision.
 */
import type {
  ExpectedWorkspaceFileRevision,
  FileContent,
  IWorkspaceFileContentCommandPort,
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
  | Readonly<{ kind: 'conflict'; path: string }>;

export type GraphDbtWorkspaceArtifactPublicationResult =
  | Readonly<{ ok: true; writtenArtifactPaths: readonly string[] }>
  | Readonly<{ ok: false; conflictPath: string }>;

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
      return { kind: 'conflict', path: args.artifact.path };
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

export async function publishGraphDbtWorkspaceArtifacts(args: {
  artifacts: readonly DbtWorkspaceArtifact[];
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
}): Promise<GraphDbtWorkspaceArtifactPublicationResult> {
  assertUniqueArtifactPaths(args.artifacts);

  const preflight = await Promise.all(
    args.artifacts.map(async (artifact) =>
      preflightArtifact({ artifact, workspaceFilesQuery: args.workspaceFilesQuery })
    )
  );
  const conflict = preflight.find(
    (result): result is Extract<ArtifactPreflight, { kind: 'conflict' }> =>
      result.kind === 'conflict'
  );
  if (conflict) {
    return { ok: false, conflictPath: conflict.path };
  }

  const writtenArtifactPaths: string[] = [];
  for (const result of preflight) {
    if (result.kind !== 'prepared' || !result.value.writeRequired) {
      continue;
    }
    const { artifact, expectedRevision } = result.value;
    await args.workspaceFileContentCommand.saveFileContent({
      path: artifact.path,
      content: artifact.content,
      expectedRevision,
    });
    writtenArtifactPaths.push(artifact.path);
  }

  return { ok: true, writtenArtifactPaths };
}
