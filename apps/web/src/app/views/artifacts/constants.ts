export type DbtArtifactFileName = 'manifest.json' | 'run_results.json' | 'catalog.json';
export type ArtifactFileName = DbtArtifactFileName | string;

export type ArtifactPreviewDocument = {
  path: string;
  content: unknown;
  language?: string;
  label?: string;
  title?: string;
};

export type ArtifactPreviewDocumentMap = Record<ArtifactFileName, ArtifactPreviewDocument>;
