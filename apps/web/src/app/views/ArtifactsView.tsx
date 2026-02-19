import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText, Download, Eye, GitBranch } from 'lucide-react';

export default function ArtifactsView() {
  const artifacts = [
    {
      type: 'manifest.json',
      description: 'Complete project manifest including models, sources, tests',
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

  const manifestPreview = {
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

  return (
    <div className="h-full bg-[#1a1d23] flex flex-col">
      {/* Header */}
      <div className="bg-[#0f1116] border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="size-6 text-blue-400" />
            <h1 className="text-xl font-semibold">dbt Artifacts</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <GitBranch className="size-3 mr-1" />
              a3f2b91
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Artifacts List */}
            <div className="space-y-3">
              {artifacts.map((artifact) => (
                <Card key={artifact.type} className="bg-[#0f1116] border-gray-800 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="size-10 bg-blue-900/30 rounded flex items-center justify-center">
                        <FileText className="size-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{artifact.type}</h3>
                        <p className="text-sm text-gray-400 mb-2">{artifact.description}</p>
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span>Size: {artifact.size}</span>
                          <span>Updated: {new Date(artifact.lastUpdated).toLocaleString()}</span>
                          <span>SHA: {artifact.gitSha}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="size-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="size-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Artifact Preview */}
            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <Tabs defaultValue="manifest">
                <TabsList className="bg-[#1a1d23] border border-gray-800">
                  <TabsTrigger value="manifest">manifest.json</TabsTrigger>
                  <TabsTrigger value="run_results">run_results.json</TabsTrigger>
                  <TabsTrigger value="catalog">catalog.json</TabsTrigger>
                </TabsList>

                <TabsContent value="manifest" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Preview: manifest.json</h3>
                      <Button variant="outline" size="sm">
                        View Full File
                      </Button>
                    </div>
                    <pre className="bg-[#0f1116] border border-gray-800 p-4 rounded font-mono text-xs overflow-auto max-h-[500px]">
                      {JSON.stringify(manifestPreview, null, 2)}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="run_results" className="mt-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold mb-4">Preview: run_results.json</h3>
                    <pre className="bg-[#0f1116] border border-gray-800 p-4 rounded font-mono text-xs overflow-auto max-h-[500px]">
                      {JSON.stringify(
                        {
                          metadata: {
                            dbt_schema_version:
                              'https://schemas.getdbt.com/dbt/run-results/v5.json',
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
                  </div>
                </TabsContent>

                <TabsContent value="catalog" className="mt-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold mb-4">Preview: catalog.json</h3>
                    <pre className="bg-[#0f1116] border border-gray-800 p-4 rounded font-mono text-xs overflow-auto max-h-[500px]">
                      {JSON.stringify(
                        {
                          metadata: {
                            dbt_schema_version: 'https://schemas.getdbt.com/dbt/catalog/v1.json',
                            generated_at: '2026-02-13T10:35:00Z',
                          },
                          nodes: {
                            'model.dbt_analytics.fct_sales': {
                              unique_id: 'model.dbt_analytics.fct_sales',
                              metadata: {
                                type: 'table',
                                schema: 'analytics',
                                name: 'fct_sales',
                              },
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
                  </div>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Usage Info */}
            <Card className="bg-blue-900/20 border-blue-800 p-4">
              <div className="flex items-start gap-3">
                <FileText className="size-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">About dbt Artifacts</h3>
                  <p className="text-sm text-gray-400">
                    dbt generates these JSON artifacts after each run. They contain metadata about
                    your project structure, execution results, and database catalog. DVT+ reads
                    these immutable artifacts to provide state-driven UI without executing SQL
                    directly.
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
