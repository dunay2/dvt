export type ArtifactFileName = 'manifest.json' | 'run_results.json' | 'catalog.json';

export type ArtifactPreviewDocument = {
  path: string;
  content: unknown;
};

export type ArtifactPreviewDocumentMap = Partial<Record<ArtifactFileName, ArtifactPreviewDocument>>;
