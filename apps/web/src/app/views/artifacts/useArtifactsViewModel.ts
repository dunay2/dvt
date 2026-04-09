import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { FileContent, WorkspaceFileEntry } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import { useWorkspaceService } from '../../services/AppServicesContext';
import {
  DEFAULT_PREVIEW_DOCUMENTS,
  SERVER_ARTIFACTS,
  type ArtifactFileName,
  type ArtifactPreviewDocumentMap,
} from './constants';
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
};

type WorkspaceArtifactRecord = {
  file: FileContent;
  parsedContent: unknown;
};

type WorkspaceArtifactMap = Partial<Record<ArtifactFileName, WorkspaceArtifactRecord>>;

const ARTIFACT_FILE_NAMES: ArtifactFileName[] = [
  'manifest.json',
  'run_results.json',
  'catalog.json',
];

function flattenWorkspaceEntries(entries: WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return entries.flatMap((entry) => [
    entry,
    ...(entry.children ? flattenWorkspaceEntries(entry.children) : []),
  ]);
}

function parseStructuredContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function buildImportedArtifact(state: ImportState): ArtifactPreview | null {
  if (state.status !== 'success') {
    return null;
  }

  return {
    type: state.fileName,
    description: 'Locally imported dbt manifest ready for exploration',
    size: formatFileSize(JSON.stringify(state.result.rawManifest).length),
    lastUpdated: state.result.generatedAt ?? new Date().toISOString(),
    gitSha: 'local-import',
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
    type: fileName,
    description: `Workspace artifact synchronized from ${artifact.file.path}`,
    size: formatFileSize(artifact.file.content.length),
    lastUpdated: artifact.file.lastModified,
    gitSha: 'workspace',
  };
}

async function loadWorkspaceArtifacts(
  listFiles: () => Promise<WorkspaceFileEntry[]>,
  getFileContent: (path: string) => Promise<FileContent>
): Promise<WorkspaceArtifactMap> {
  const entries = flattenWorkspaceEntries(await listFiles());
  const records = await Promise.all(
    ARTIFACT_FILE_NAMES.map(async (fileName) => {
      const match = entries.find((entry) => entry.kind === 'file' && entry.name === fileName);
      if (!match) {
        return null;
      }

      const file = await getFileContent(match.path);
      return [fileName, { file, parsedContent: parseStructuredContent(file.content) }] as const;
    })
  );

  return Object.fromEntries(
    records.filter((record): record is NonNullable<typeof record> => record !== null)
  );
}

export function useArtifactsViewModel(state: ImportState): ArtifactsViewModel {
  const workspaceService = useWorkspaceService();
  const workspaceArtifactsQuery = useQuery<WorkspaceArtifactMap>({
    queryKey: queryKeys.workspace.artifacts(),
    queryFn: () =>
      loadWorkspaceArtifacts(workspaceService.listFiles, workspaceService.getFileContent).catch(
        (): WorkspaceArtifactMap => ({})
      ),
  });

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
        : workspaceArtifactPreviews.length > 0
          ? workspaceArtifactPreviews
          : SERVER_ARTIFACTS;

    const previewDocuments: ArtifactPreviewDocumentMap = {
      'manifest.json':
        state.status === 'success'
          ? {
              content: state.result.rawManifest,
              path: state.fileName,
            }
          : workspaceArtifacts['manifest.json']
            ? {
                content: workspaceArtifacts['manifest.json'].parsedContent,
                path: workspaceArtifacts['manifest.json'].file.path,
              }
            : DEFAULT_PREVIEW_DOCUMENTS['manifest.json'],
      'run_results.json': workspaceArtifacts['run_results.json']
        ? {
            content: workspaceArtifacts['run_results.json'].parsedContent,
            path: workspaceArtifacts['run_results.json'].file.path,
          }
        : DEFAULT_PREVIEW_DOCUMENTS['run_results.json'],
      'catalog.json': workspaceArtifacts['catalog.json']
        ? {
            content: workspaceArtifacts['catalog.json'].parsedContent,
            path: workspaceArtifacts['catalog.json'].file.path,
          }
        : DEFAULT_PREVIEW_DOCUMENTS['catalog.json'],
    };

    return {
      artifacts,
      importedStats,
      previewDocuments,
    };
  }, [state, workspaceArtifactsQuery.data]);
}
