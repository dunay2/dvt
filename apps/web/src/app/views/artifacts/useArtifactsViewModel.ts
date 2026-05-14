/** Owned concern: derive artifact view state from imported and workspace file read models. */
import { useMemo } from 'react';

import {
  useWorkspaceArtifactsQuery,
  type WorkspaceArtifactRecord,
  type WorkspaceArtifactMap,
} from '../../queries/workspaceQueries';
import { type ArtifactFileName, type ArtifactPreviewDocumentMap } from './constants';
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

const ARTIFACT_FILE_NAMES: ArtifactFileName[] = [
  'manifest.json',
  'run_results.json',
  'catalog.json',
];

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

function buildWorkspaceArtifactPreview(
  fileName: ArtifactFileName,
  artifact: WorkspaceArtifactRecord
): ArtifactPreview {
  return {
    id: `workspace:${artifact.file.path}`,
    type: fileName,
    description: `Workspace artifact synchronized from ${artifact.file.path}`,
    size: formatFileSize(artifact.file.content.length),
    lastUpdated: artifact.file.lastModified,
    sourceLabel: artifact.file.path,
  };
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
    const workspaceArtifactPreviews = ARTIFACT_FILE_NAMES.flatMap((fileName) =>
      workspaceArtifacts[fileName]
        ? [buildWorkspaceArtifactPreview(fileName, workspaceArtifacts[fileName])]
        : []
    );

    const artifacts =
      importedArtifact !== null
        ? [importedArtifact, ...workspaceArtifactPreviews]
        : workspaceArtifactPreviews;

    const previewDocuments: ArtifactPreviewDocumentMap = {};

    if (state.status === 'success') {
      previewDocuments['manifest.json'] = {
        content: state.result.rawManifest,
        path: state.fileName,
      };
    } else if (workspaceArtifacts['manifest.json']) {
      previewDocuments['manifest.json'] = {
        content: workspaceArtifacts['manifest.json'].parsedContent,
        path: workspaceArtifacts['manifest.json'].file.path,
      };
    }

    if (workspaceArtifacts['run_results.json']) {
      previewDocuments['run_results.json'] = {
        content: workspaceArtifacts['run_results.json'].parsedContent,
        path: workspaceArtifacts['run_results.json'].file.path,
      };
    }

    if (workspaceArtifacts['catalog.json']) {
      previewDocuments['catalog.json'] = {
        content: workspaceArtifacts['catalog.json'].parsedContent,
        path: workspaceArtifacts['catalog.json'].file.path,
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
