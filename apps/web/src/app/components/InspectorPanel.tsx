import { X, Info, Settings, Code, TestTube, Table, Clock, Shield } from 'lucide-react';

import { DbtNode } from '../types/dbt';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './ui/utils';

interface InspectorPanelProps {
  node: DbtNode | null;
  onClose: () => void;
  userPermissions: {
    canRun: boolean;
    canPlan: boolean;
    canEditEdges: boolean;
  };
}

const statusColors = {
  idle: 'bg-gray-600',
  running: 'bg-blue-500',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
  warn: 'bg-orange-500',
};

export default function InspectorPanel({ node, onClose, userPermissions }: InspectorPanelProps) {
  if (!node) {
    return (
      <div className="h-full bg-[#0f1116] border-l border-gray-800 flex items-center justify-center">
        <p className="text-sm text-gray-500">Select a node to inspect</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0f1116] border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn('size-2 rounded-full', statusColors[node.status])} />
            <h2 className="font-semibold text-sm truncate">{node.name}</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">{node.type}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="bg-transparent border-b border-gray-800 rounded-none px-4 justify-start">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#1a1d23]">
            <Info className="size-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-[#1a1d23]">
            <Settings className="size-3 mr-1" />
            Config
          </TabsTrigger>
          <TabsTrigger value="sql" className="data-[state=active]:bg-[#1a1d23]">
            <Code className="size-3 mr-1" />
            SQL
          </TabsTrigger>
          {node.type === 'MODEL' && (
            <>
              <TabsTrigger value="tests" className="data-[state=active]:bg-[#1a1d23]">
                <TestTube className="size-3 mr-1" />
                Tests
              </TabsTrigger>
              <TabsTrigger value="columns" className="data-[state=active]:bg-[#1a1d23]">
                <Table className="size-3 mr-1" />
                Columns
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="history" className="data-[state=active]:bg-[#1a1d23]">
            <Clock className="size-3 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-4 space-y-4 m-0">
            <Card className="bg-[#1a1d23] border-gray-800 p-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Package:</span>
                  <span>{node.package}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Path:</span>
                  <span className="text-xs font-mono truncate ml-2">{node.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <Badge variant="outline">{node.status}</Badge>
                </div>
                {node.lastDuration && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Duration:</span>
                    <span>{node.lastDuration}s</span>
                  </div>
                )}
                {node.lastCost && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Cost:</span>
                    <span>${node.lastCost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>

            {node.description && (
              <Card className="bg-[#1a1d23] border-gray-800 p-3">
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-xs text-gray-400">{node.description}</p>
              </Card>
            )}

            {node.tags.length > 0 && (
              <Card className="bg-[#1a1d23] border-gray-800 p-3">
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {node.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            <Card className="bg-[#1a1d23] border-gray-800 p-3">
              <h3 className="text-sm font-medium mb-2">Dependencies</h3>
              {node.dependencies.length === 0 ? (
                <p className="text-xs text-gray-500">No dependencies</p>
              ) : (
                <div className="space-y-1">
                  {node.dependencies.map((dep) => (
                    <div key={dep} className="text-xs font-mono text-gray-400">
                      → {dep}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Permissions Section */}
            <Card className="bg-[#1a1d23] border-gray-800 p-3">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Shield className="size-4" />
                Permissions
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Can Plan:</span>
                  <Badge variant={userPermissions.canPlan ? 'default' : 'secondary'}>
                    {userPermissions.canPlan ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Can Run:</span>
                  <Badge variant={userPermissions.canRun ? 'default' : 'secondary'}>
                    {userPermissions.canRun ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Can Edit Edges:</span>
                  <Badge variant={userPermissions.canEditEdges ? 'default' : 'secondary'}>
                    {userPermissions.canEditEdges ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="p-4 m-0">
            <Card className="bg-[#1a1d23] border-gray-800 p-3">
              <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(node.config || { materialized: 'table' }, null, 2)}
              </pre>
            </Card>
          </TabsContent>

          <TabsContent value="sql" className="p-4 m-0">
            <Card className="bg-[#1a1d23] border-gray-800 p-3">
              <h3 className="text-sm font-medium mb-2">Compiled SQL</h3>
              <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap bg-[#0f1116] p-3 rounded border border-gray-800">
                {node.compiledSql || 'No compiled SQL available'}
              </pre>
            </Card>
          </TabsContent>

          <TabsContent value="tests" className="p-4 m-0">
            <div className="space-y-2">
              <Card className="bg-[#1a1d23] border-gray-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono">test_not_null_store_id</span>
                  <Badge className="bg-green-600">Passed</Badge>
                </div>
                <p className="text-xs text-gray-400">Generic test: not_null on store_id</p>
              </Card>
              <Card className="bg-[#1a1d23] border-gray-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono">test_unique_store_id</span>
                  <Badge className="bg-green-600">Passed</Badge>
                </div>
                <p className="text-xs text-gray-400">Generic test: unique on store_id</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="columns" className="p-4 m-0">
            <div className="space-y-2">
              {node.columns?.map((col) => (
                <Card key={col.name} className="bg-[#1a1d23] border-gray-800 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{col.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{col.type}</div>
                      {col.description && (
                        <p className="text-xs text-gray-500 mt-2">{col.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {col.nullable ? 'nullable' : 'not null'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-4 m-0">
            <div className="space-y-3">
              <Card className="bg-[#1a1d23] border-gray-800 p-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">Run #xyz789</div>
                    <div className="text-xs text-gray-400 mt-1">2026-02-13 10:35:00</div>
                  </div>
                  <Badge className="bg-green-600">Success</Badge>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Duration: {node.lastDuration}s · Cost: ${node.lastCost?.toFixed(2)}
                </div>
              </Card>
              <Card className="bg-[#1a1d23] border-gray-800 p-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">Run #abc456</div>
                    <div className="text-xs text-gray-400 mt-1">2026-02-12 14:22:00</div>
                  </div>
                  <Badge className="bg-green-600">Success</Badge>
                </div>
                <div className="mt-2 text-xs text-gray-400">Duration: 2.1s · Cost: $0.04</div>
              </Card>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
