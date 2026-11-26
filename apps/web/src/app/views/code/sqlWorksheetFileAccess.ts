/** Owns conditional access to saved SQL worksheets in Workspace Files. */
import { sha256HexUtf8 } from '@dvt/crypto';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import { isWorkspaceOperationSqlPath } from './codeWorkspaceFileEditPosture';
import { resolveFileCreationPath } from './workspaceFileCreationModel';

export type WorksheetRevision = Readonly<{ path: string; digest: string }>;

export function worksheetFilePath(input: string): string | null {
  const relative = input.trim().replace(/^operations\//, '');
  const path = resolveFileCreationPath('operations', relative);
  return path && isWorkspaceOperationSqlPath(path) ? path : null;
}

export async function readWorksheetFile(
  read: IWorkspaceFilesQueryPort['getFileContent'],
  path: string
) {
  if (worksheetFilePath(path) !== path) throw new Error('Invalid worksheet path');
  const file = await read(path);
  if (file.path !== path || file.contentSha256 !== sha256HexUtf8(file.content))
    throw new Error('Unconfirmed worksheet file');
  return file;
}

export async function saveWorksheetFile(
  save: IWorkspaceFileContentCommandPort['saveFileContent'],
  path: string,
  content: string,
  originalDigest?: string
): Promise<WorksheetRevision> {
  if (worksheetFilePath(path) !== path) throw new Error('Invalid worksheet path');
  const receipt = await save({
    path,
    content,
    expectedRevision:
      originalDigest === undefined
        ? { kind: 'absent' }
        : { kind: 'content_sha256', value: originalDigest },
  });
  const digest = sha256HexUtf8(content);
  if (receipt.path !== path || receipt.contentSha256 !== digest)
    throw new Error('Unconfirmed worksheet save');
  return { path, digest };
}
