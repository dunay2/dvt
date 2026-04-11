export type ArtifactPreview = {
  id: string;
  type: string;
  description: string;
  size: string;
  lastUpdated: string;
  sourceLabel: string;
};

export type ParsedManifestNodeType =
  | 'SOURCE'
  | 'MODEL'
  | 'SEED'
  | 'SNAPSHOT'
  | 'TEST'
  | 'EXPOSURE'
  | 'METRIC'
  | 'MACRO';

export type ParsedManifestNode = {
  id: string;
  name: string;
  type: ParsedManifestNodeType;
  dependencies: string[];
};

export type ManifestImportResult = {
  nodes: ParsedManifestNode[];
  edges: Array<{ id: string; source: string; target: string }>;
  generatedAt: string | null;
  dbtVersion: string | null;
  rawManifest: unknown;
};

export type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; fileName: string; result: ManifestImportResult };

export type ManifestNodeRecord = {
  unique_id?: string;
  name?: string;
  resource_type?: string;
  depends_on?: { nodes?: string[] };
};

export type ManifestRoot = {
  metadata?: {
    generated_at?: string;
    dbt_version?: string;
  };
  nodes?: Record<string, ManifestNodeRecord>;
  sources?: Record<string, ManifestNodeRecord>;
  exposures?: Record<string, ManifestNodeRecord>;
  metrics?: Record<string, ManifestNodeRecord>;
  macros?: Record<string, ManifestNodeRecord>;
};
