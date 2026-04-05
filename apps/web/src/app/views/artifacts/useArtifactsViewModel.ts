import { useMemo } from 'react';

import { DEFAULT_MANIFEST_PREVIEW, SERVER_ARTIFACTS } from './constants';
import type { ArtifactPreview, ImportState } from './types';
import { formatFileSize } from './utils';

type ArtifactsViewModel = {
  manifestPreview: unknown;
  artifacts: ArtifactPreview[];
  importedStats:
    | {
        models: number;
        sources: number;
        tests: number;
        edges: number;
        dbtVersion: string | null;
      }
    | null;
};

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

export function useArtifactsViewModel(state: ImportState): ArtifactsViewModel {
  return useMemo(() => {
    const manifestPreview =
      state.status === 'success' ? state.result.rawManifest : DEFAULT_MANIFEST_PREVIEW;

    const importedArtifact = buildImportedArtifact(state);
    const artifacts = importedArtifact ? [importedArtifact, ...SERVER_ARTIFACTS] : SERVER_ARTIFACTS;

    const importedStats =
      state.status === 'success'
        ? {
            models: state.result.nodes.filter((node) => node.type === 'MODEL').length,
            sources: state.result.nodes.filter((node) => node.type === 'SOURCE').length,
            tests: state.result.nodes.filter((node) => node.type === 'TEST').length,
            edges: state.result.edges.length,
            dbtVersion: state.result.dbtVersion,
          }
        : null;

    return {
      manifestPreview,
      artifacts,
      importedStats,
    };
  }, [state]);
}
