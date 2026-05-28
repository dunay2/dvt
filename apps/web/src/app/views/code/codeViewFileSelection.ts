/** Owned concern: project workspace file trees into Code route file-selection state. */
import type { WorkspaceFileEntry } from '../../ports/workspace';

const WORKFLOW_ARTIFACT_PATH_PATTERN = /^pipelines\/.+\.ya?ml$/i;

function flattenCodeWorkspaceFiles(entries: readonly WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return entries.flatMap((entry) => {
    if (entry.kind === 'file') {
      return [entry];
    }

    if (entry.children) {
      return flattenCodeWorkspaceFiles(entry.children);
    }

    return [];
  });
}

function isWorkflowArtifactFile(entry: WorkspaceFileEntry): boolean {
  return entry.kind === 'file' && WORKFLOW_ARTIFACT_PATH_PATTERN.test(entry.path);
}

export function resolveInitialCodeFilePath(
  entries: readonly WorkspaceFileEntry[]
): string | undefined {
  const files = flattenCodeWorkspaceFiles(entries);
  return (files.find(isWorkflowArtifactFile) ?? files[0])?.path;
}

export function hasCodeWorkspaceFiles(entries: readonly WorkspaceFileEntry[]): boolean {
  return resolveInitialCodeFilePath(entries) !== undefined;
}
