/** Load a selected variation and conditionally update its original project revision. */
import { useQueryClient } from '@tanstack/react-query';
import { sha256HexUtf8 } from '@dvt/crypto';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { queryKeys } from '../../queries/queryKeys';
import { useWorkspaceFileTreeQuery } from '../../queries/workspaceQueries';
import {
  useWorkspaceFileContentCommandPort,
  useWorkspaceFilesQueryPort,
} from '../../services/AppServicesContext';
import { flattenCodeWorkspaceFiles } from '../code/codeViewFileSelection';
import {
  decodeProjectTemplate,
  encodeProjectTemplate,
  type ProjectTemplateFile,
} from './projectTemplateFile';

export function useProjectTemplateFiles(scope: WorkspaceScope) {
  const workspace = [scope.tenantId, scope.projectId, scope.environmentId].join('::');
  const files = useWorkspaceFilesQueryPort();
  const command = useWorkspaceFileContentCommandPort();
  const cache = useQueryClient();
  const tree = useWorkspaceFileTreeQuery();
  const paths = flattenCodeWorkspaceFiles(tree.data ?? [])
    .map((f) => f.path)
    .filter((p) => /^dvt_templates\/[a-z0-9][a-z0-9_-]*\.json$/.test(p));
  async function read(path: string) {
    if (!paths.includes(path)) return null;
    const result = await files.getFileContent(path);
    const file = result.path === path && decodeProjectTemplate(result.content);
    return file ? { file, digest: result.contentSha256 } : null;
  }
  async function save(path: string, file: ProjectTemplateFile, digest?: string) {
    const content = encodeProjectTemplate(file);
    const result = await command.saveFileContent({
      path,
      content,
      expectedRevision: digest ? { kind: 'content_sha256', value: digest } : { kind: 'absent' },
    });
    if (result.path !== path || result.contentSha256 !== sha256HexUtf8(content))
      throw new Error('Unconfirmed workspace file receipt');
    void cache.invalidateQueries({ queryKey: queryKeys.workspace.fileTree(workspace) });
    void cache.invalidateQueries({ queryKey: queryKeys.workspace.fileContent(workspace, path) });
    return result.contentSha256;
  }
  return { paths, read, save, unavailable: tree.isError };
}
