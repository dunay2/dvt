/** Owned concern: derive artifact view state from imported and workspace file read models. */
import { useMemo } from 'react';

import {
  useWorkspaceArtifactsQuery,
  type WorkspaceArtifactRecord,
  type WorkspaceArtifactMap,
} from '../../queries/workspaceQueries';
import { type ArtifactPreviewDocumentMap } from './constants';
import type { ArtifactPreview, ImportState } from './types';
import { formatFileSize } from './utils';

type ImportedStats = {
  models: number;
  sources: number;
  tests: number;
  edges: number;
  dbtVersion: string | null;
};

type ArtifactsViewModel = {
  artifacts: ArtifactPreview[];
  importedStats: ImportedStats | null;
  previewDocuments: ArtifactPreviewDocumentMap;
  isLoading: boolean;
  errorMessage: string | null;
};

function buildImportedArtifact(state: ImportState): ArtifactPreview | null {
  if (state.status !== 'success') {
    return null;
  }

  return {
    id: `import:${state.fileName}`,
    type: state.fileName,
    description: 'Locally imported dbt manifest ready for exploration',
    size: formatFileSize(JSON.stringify(state.result.rawManifest).length),
    lastUpdated: state.result.generatedAt ?? new Date().toISOString(),
    sourceLabel: 'Imported locally',
  };
}

function buildImportedStats(state: ImportState): ImportedStats | null {
  if (state.status !== 'success') {
    return null;
  }

  return {
    models: state.result.nodes.filter((node) => node.type === 'MODEL').length,
    sources: state.result.nodes.filter((node) => node.type === 'SOURCE').length,
    tests: state.result.nodes.filter((node) => node.type === 'TEST').length,
    edges: state.result.edges.length,
    dbtVersion: state.result.dbtVersion,
  };
}

function buildWorkspaceArtifactPreview(artifact: WorkspaceArtifactRecord): ArtifactPreview {
  return {
    id: `workspace:${artifact.file.path}`,
    type: artifact.kind === 'dbt-json' ? artifact.label : getProjectArtifactType(artifact),
    description: `Workspace artifact synchronized from ${artifact.file.path}`,
    size: formatFileSize(artifact.file.content.length),
    lastUpdated: artifact.file.lastModified,
    sourceLabel: artifact.file.path,
  };
}

function getProjectArtifactType(artifact: WorkspaceArtifactRecord): string {
  if (artifact.kind === 'pipeline-yaml') {
    return 'Workflow pipeline';
  }

  if (artifact.kind === 'model-sql') {
    return 'SQL model';
  }

  return artifact.label;
}

function getPreviewTitle(label: string): string {
  return `Preview: ${label}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Artifacts could not be loaded.';
}

export function useArtifactsViewModel(state: ImportState): ArtifactsViewModel {
  const workspaceArtifactsQuery = useWorkspaceArtifactsQuery();

  return useMemo(() => {
    const workspaceArtifacts: WorkspaceArtifactMap = workspaceArtifactsQuery.data ?? {};
    const importedArtifact = buildImportedArtifact(state);
    const importedStats = buildImportedStats(state);
    const workspaceArtifactPreviews = Object.values(workspaceArtifacts).map(
      buildWorkspaceArtifactPreview
    );

    const artifacts =
      importedArtifact !== null
        ? [importedArtifact, ...workspaceArtifactPreviews]
        : workspaceArtifactPreviews;

    const previewDocuments: ArtifactPreviewDocumentMap = {};

    for (const artifact of Object.values(workspaceArtifacts)) {
      previewDocuments[artifact.key] = {
        content: artifact.parsedContent,
        path: artifact.file.path,
        language: artifact.language,
        label: artifact.label,
        title: getPreviewTitle(artifact.label),
      };
    }

    if (state.status === 'success') {
      previewDocuments['manifest.json'] = {
        content: state.result.rawManifest,
        path: state.fileName,
        language: 'json',
        label: 'manifest.json',
        title: getPreviewTitle('manifest.json'),
      };
    }

    return {
      artifacts,
      importedStats,
      previewDocuments,
      isLoading: workspaceArtifactsQuery.isLoading,
      errorMessage:
        workspaceArtifactsQuery.error !== null && workspaceArtifactsQuery.error !== undefined
          ? getErrorMessage(workspaceArtifactsQuery.error)
          : null,
    };
  }, [
    state,
    workspaceArtifactsQuery.data,
    workspaceArtifactsQuery.error,
    workspaceArtifactsQuery.isLoading,
  ]);
}
