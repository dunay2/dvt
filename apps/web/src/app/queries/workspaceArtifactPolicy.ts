/** Owned concern: classify governed workspace files that Artifacts can preview. */
import type { WorkspaceFileEntry } from '../ports/workspace';

export type WorkspaceArtifactKind = 'dbt-json' | 'pipeline-yaml' | 'model-sql';

export type WorkspaceArtifactClassification = {
  key: string;
  label: string;
  language: string;
  kind: WorkspaceArtifactKind;
};

const WORKSPACE_ARTIFACT_FILE_NAMES = [
  'manifest.json',
  'run_results.json',
  'catalog.json',
] as const;
type WorkspaceArtifactFileName = (typeof WORKSPACE_ARTIFACT_FILE_NAMES)[number];

function normalizeWorkspacePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function classifyWorkspaceArtifact(
  entry: WorkspaceFileEntry
): WorkspaceArtifactClassification | null {
  if (entry.kind !== 'file') {
    return null;
  }

  const path = normalizeWorkspacePath(entry.path);
  if ((WORKSPACE_ARTIFACT_FILE_NAMES as readonly string[]).includes(entry.name)) {
    return {
      key: entry.name as WorkspaceArtifactFileName,
      label: entry.name,
      language: 'json',
      kind: 'dbt-json',
    };
  }

  if (/^pipelines\/.+\.ya?ml$/u.test(path)) {
    return {
      key: path,
      label: path,
      language: 'yaml',
      kind: 'pipeline-yaml',
    };
  }

  if (/^models\/.+\.sql$/u.test(path)) {
    return {
      key: path,
      label: path,
      language: 'sql',
      kind: 'model-sql',
    };
  }

  return null;
}
