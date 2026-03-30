import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Eye, FileText, GitBranch, Upload, XCircle } from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';

type ArtifactPreview = {
  type: string;
  description: string;
  size: string;
  lastUpdated: string;
  gitSha: string;
};

type ParsedManifestNodeType =
  | 'SOURCE'
  | 'MODEL'
  | 'SEED'
  | 'SNAPSHOT'
  | 'TEST'
  | 'EXPOSURE'
  | 'METRIC'
  | 'MACRO';

type ParsedManifestNode = {
  id: string;
  name: string;
  type: ParsedManifestNodeType;
  dependencies: string[];
};

type ManifestImportResult = {
  nodes: ParsedManifestNode[];
  edges: Array<{ id: string; source: string; target: string }>;
  generatedAt: string | null;
  dbtVersion: string | null;
  rawManifest: unknown;
};

type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; fileName: string; result: ManifestImportResult };

type ManifestNodeRecord = {
  unique_id?: string;
  name?: string;
  resource_type?: string;
  depends_on?: { nodes?: string[] };
};

type ManifestRoot = {
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

const RESOURCE_TYPE_TO_NODE_TYPE: Record<string, ParsedManifestNodeType> = {
  model: 'MODEL',
  source: 'SOURCE',
  seed: 'SEED',
  snapshot: 'SNAPSHOT',
  test: 'TEST',
  exposure: 'EXPOSURE',
  metric: 'METRIC',
  macro: 'MACRO',
};

function isSupportedManifestNode(
  node: ManifestNodeRecord
): node is Required<Pick<ManifestNodeRecord, 'unique_id' | 'name' | 'resource_type'>> &
  ManifestNodeRecord {
  return (
    typeof node.unique_id === 'string' &&
    typeof node.name === 'string' &&
    typeof node.resource_type === 'string' &&
    Object.prototype.hasOwnProperty.call(RESOURCE_TYPE_TO_NODE_TYPE, node.resource_type)
  );
}

function parseManifest(
  raw: unknown
): { ok: true; result: ManifestImportResult } | { ok: false; message: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'Expected a JSON object at the root.' };
  }

  const manifest = raw as ManifestRoot;
  const rawNodes = [
    ...Object.values(manifest.nodes ?? {}),
    ...Object.values(manifest.sources ?? {}),
    ...Object.values(manifest.exposures ?? {}),
    ...Object.values(manifest.metrics ?? {}),
    ...Object.values(manifest.macros ?? {}),
  ];

  if (rawNodes.length === 0) {
    return { ok: false, message: 'Object does not look like a dbt manifest.' };
  }

  const nodes = rawNodes
    .filter(isSupportedManifestNode)
    .map((node) => {
      const nodeType = RESOURCE_TYPE_TO_NODE_TYPE[node.resource_type];
      if (!nodeType) {
        return null;
      }

      return {
        id: node.unique_id,
        name: node.name,
        type: nodeType,
        dependencies:
          node.depends_on?.nodes?.filter((dep): dep is string => typeof dep === 'string') ?? [],
      };
    })
    .filter((node): node is ParsedManifestNode => node !== null);

  if (nodes.length === 0) {
    return { ok: false, message: 'Manifest contains no recognizable dbt graph nodes.' };
  }

  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const edges = nodes.flatMap((node) =>
    node.dependencies
      .filter((dependency) => knownNodeIds.has(dependency))
      .map((dependency) => ({
        id: `${dependency}->${node.id}`,
        source: dependency,
        target: node.id,
      }))
  );

  return {
    ok: true,
    result: {
      nodes,
      edges,
      generatedAt: manifest.metadata?.generated_at ?? null,
      dbtVersion: manifest.metadata?.dbt_version ?? null,
      rawManifest: raw,
    },
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useLocalManifestImport() {
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setState({ status: 'loading' });

    let text: string;
    try {
      text = await file.text();
    } catch {
      setState({ status: 'error', message: `Could not read file: ${file.name}` });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setState({ status: 'error', message: `${file.name} is not valid JSON.` });
      return;
    }

    const result = parseManifest(parsed);
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }

    setState({ status: 'success', fileName: file.name, result: result.result });
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      event.target.value = '';
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  const clear = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    fileInputRef,
    openFilePicker,
    handleInputChange,
    handleDrop,
    handleDragOver,
    clear,
  };
}

const SERVER_ARTIFACTS: ArtifactPreview[] = [
  {
    type: 'manifest.json',
    description: 'Complete project manifest including models, sources, and tests',
    size: '245 KB',
    lastUpdated: '2026-02-13T10:35:00Z',
    gitSha: 'a3f2b91',
  },
  {
    type: 'run_results.json',
    description: 'Results from the latest run execution',
    size: '89 KB',
    lastUpdated: '2026-02-13T10:35:00Z',
    gitSha: 'a3f2b91',
  },
  {
    type: 'catalog.json',
    description: 'Database catalog with column metadata',
    size: '156 KB',
    lastUpdated: '2026-02-13T10:35:00Z',
    gitSha: 'a3f2b91',
  },
];

const DEFAULT_MANIFEST_PREVIEW = {
  metadata: {
    dbt_schema_version: 'https://schemas.getdbt.com/dbt/manifest/v11.json',
    dbt_version: '1.7.0',
    generated_at: '2026-02-13T10:35:00Z',
    invocation_id: 'abc123def456',
    env: { DBT_CLOUD_PROJECT_ID: '12345' },
  },
  nodes: {
    'model.dbt_analytics.fct_sales': {
      unique_id: 'model.dbt_analytics.fct_sales',
      name: 'fct_sales',
      resource_type: 'model',
      package_name: 'dbt_analytics',
      path: 'marts/fct_sales.sql',
      materialized: 'table',
    },
  },
};

export default function ArtifactsView() {
  const panelClassName = 'bg-slate-900 border-slate-700 p-4 text-slate-50';
  const tabTriggerClassName =
    'text-slate-200 data-[state=active]:bg-[#101724] data-[state=active]:text-white';

  const {
    state,
    fileInputRef,
    openFilePicker,
    handleInputChange,
    handleDrop,
    handleDragOver,
    clear,
  } = useLocalManifestImport();

  const manifestPreview =
    state.status === 'success' ? state.result.rawManifest : DEFAULT_MANIFEST_PREVIEW;

  const importedArtifact =
    state.status === 'success'
      ? {
          type: state.fileName,
          description: 'Locally imported dbt manifest ready for exploration',
          size: formatFileSize(JSON.stringify(state.result.rawManifest).length),
          lastUpdated: state.result.generatedAt ?? new Date().toISOString(),
          gitSha: 'local-import',
        }
      : null;

  const artifacts = importedArtifact ? [importedArtifact, ...SERVER_ARTIFACTS] : SERVER_ARTIFACTS;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-50">
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="size-6 text-blue-400" />
            <div>
              <h1 className="text-xl font-semibold">dbt Artifacts</h1>
              <p className="text-sm text-slate-400">
                Explore immutable dbt artifacts and import a local `manifest.json` for offline graph
                inspection.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <GitBranch className="mr-1 size-3" />
            a3f2b91
          </Badge>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-6 pb-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                Import Manifest
              </h2>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                aria-label="Import dbt manifest.json"
                onChange={handleInputChange}
              />

              {state.status !== 'success' ? (
                <Card
                  className={cn(
                    'border-2 border-dashed p-8 text-center transition-colors',
                    'border-slate-600 bg-slate-900 hover:border-blue-500 hover:bg-slate-800/60',
                    state.status === 'loading' ? 'pointer-events-none opacity-60' : 'cursor-pointer'
                  )}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={openFilePicker}
                >
                  <Upload className="mx-auto mb-3 size-8 text-slate-400" />
                  <p className="mb-1 text-sm font-medium text-slate-200">
                    {state.status === 'loading' ? 'Parsing manifest...' : 'Drop manifest.json here'}
                  </p>
                  <p className="text-xs text-slate-400">
                    or click to browse - supports dbt manifests with standard `nodes`, `sources`,
                    and dependency metadata
                  </p>

                  {state.status === 'error' && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-red-400">
                      <XCircle className="size-4 shrink-0" />
                      {state.message}
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="border-green-700 bg-green-950/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-400" />
                      <div>
                        <p className="mb-1 text-sm font-medium text-green-200">
                          {state.fileName} imported successfully
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                          <span>
                            <span className="font-mono text-white">
                              {state.result.nodes.filter((node) => node.type === 'MODEL').length}
                            </span>{' '}
                            models
                          </span>
                          <span>
                            <span className="font-mono text-white">
                              {state.result.nodes.filter((node) => node.type === 'SOURCE').length}
                            </span>{' '}
                            sources
                          </span>
                          <span>
                            <span className="font-mono text-white">
                              {state.result.nodes.filter((node) => node.type === 'TEST').length}
                            </span>{' '}
                            tests
                          </span>
                          <span>
                            <span className="font-mono text-white">
                              {state.result.edges.length}
                            </span>{' '}
                            edges
                          </span>
                          {state.result.dbtVersion && (
                            <span className="text-slate-400">dbt {state.result.dbtVersion}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clear}
                      className="shrink-0 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                Server Artifacts
              </h2>
              <div className="space-y-3">
                {artifacts.map((artifact) => (
                  <Card key={`${artifact.type}-${artifact.gitSha}`} className={panelClassName}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded bg-blue-900/30">
                          <FileText className="size-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold">{artifact.type}</h3>
                          <p className="mb-2 text-sm text-slate-200">{artifact.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                            <span>Size: {artifact.size}</span>
                            <span>Updated: {new Date(artifact.lastUpdated).toLocaleString()}</span>
                            <span>SHA: {artifact.gitSha}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 size-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 size-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className={panelClassName}>
              <Tabs defaultValue="manifest">
                <TabsList className="border border-slate-700 bg-slate-950">
                  <TabsTrigger value="manifest" className={tabTriggerClassName}>
                    manifest.json
                  </TabsTrigger>
                  <TabsTrigger value="run_results" className={tabTriggerClassName}>
                    run_results.json
                  </TabsTrigger>
                  <TabsTrigger value="catalog" className={tabTriggerClassName}>
                    catalog.json
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manifest" className="mt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Preview: manifest.json</h3>
                    <Button variant="outline" size="sm">
                      View Full File
                    </Button>
                  </div>
                  <pre className="max-h-[500px] overflow-auto rounded border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-50">
                    {JSON.stringify(manifestPreview, null, 2)}
                  </pre>
                </TabsContent>

                <TabsContent value="run_results" className="mt-4">
                  <h3 className="mb-4 font-semibold">Preview: run_results.json</h3>
                  <pre className="max-h-[500px] overflow-auto rounded border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-50">
                    {JSON.stringify(
                      {
                        metadata: {
                          dbt_schema_version: 'https://schemas.getdbt.com/dbt/run-results/v5.json',
                          invocation_id: 'abc123def456',
                          env: {},
                        },
                        results: [
                          {
                            unique_id: 'model.dbt_analytics.fct_sales',
                            status: 'success',
                            execution_time: 15.234,
                            message: null,
                          },
                        ],
                        elapsed_time: 45.67,
                      },
                      null,
                      2
                    )}
                  </pre>
                </TabsContent>

                <TabsContent value="catalog" className="mt-4">
                  <h3 className="mb-4 font-semibold">Preview: catalog.json</h3>
                  <pre className="max-h-[500px] overflow-auto rounded border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-50">
                    {JSON.stringify(
                      {
                        metadata: {
                          dbt_schema_version: 'https://schemas.getdbt.com/dbt/catalog/v1.json',
                          generated_at: '2026-02-13T10:35:00Z',
                        },
                        nodes: {
                          'model.dbt_analytics.fct_sales': {
                            unique_id: 'model.dbt_analytics.fct_sales',
                            metadata: { type: 'table', schema: 'analytics', name: 'fct_sales' },
                            columns: {
                              order_id: { type: 'INTEGER', index: 1 },
                              customer_id: { type: 'INTEGER', index: 2 },
                              total_amount: { type: 'NUMERIC(18,2)', index: 3 },
                            },
                          },
                        },
                      },
                      null,
                      2
                    )}
                  </pre>
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="border-blue-800 bg-blue-900/20 p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-5 shrink-0 text-blue-400" />
                <div>
                  <h3 className="mb-1 font-semibold text-blue-100">About dbt Artifacts</h3>
                  <p className="text-sm text-blue-100/90">
                    dbt generates these JSON artifacts after each run. They contain metadata about
                    your project structure, execution results, and database catalog. DVT+ reads
                    these immutable artifacts to provide state-driven UI without executing SQL
                    directly. Import a local manifest.json above to explore the graph without a
                    backend connection.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
