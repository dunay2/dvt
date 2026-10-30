/**
 * Owned concern: execute the GetWorkspaceFileContent query against the
 * workspace file repository port and attach its confirmed authoring context.
 */
import type {
  IWorkspaceFileRepository,
  WorkspaceFileContent,
  WorkspaceStorageScope,
} from '../ports/workspaceFiles.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';

export class GetWorkspaceFileContentUseCase {
  public constructor(
    private readonly repository: Pick<IWorkspaceFileRepository, 'getFileContent'>,
    private readonly authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolveFileContext'>
  ) {}

  public async execute(scope: WorkspaceStorageScope, path: string): Promise<WorkspaceFileContent> {
    const file = await this.repository.getFileContent(scope, path);
    return {
      ...file,
      authoringAuthority: await this.authorityPolicy.resolveFileContext(scope, file.path),
    };
  }
}
