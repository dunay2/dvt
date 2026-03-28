import { Info, Settings, Code, TestTube, Table, Clock, Shield, PanelRightClose } from 'lucide-react';

import { DbtNode } from '../types/dbt';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './ui/utils';

interface InspectorPanelProps {
  node: DbtNode | null;
  onHide: () => void;
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

const triggerClassName =
  'text-slate-200 data-[state=active]:bg-slate-950 data-[state=active]:text-white';
const cardClassName = 'bg-slate-950 border-slate-700 p-3 text-slate-50';
const cardTitleClassName = 'text-sm font-medium mb-2 text-slate-100';
const statusBadgeClassName: Record<DbtNode['status'], string> = {
  idle: 'border-gray-500/80 bg-gray-900/60 text-slate-100',
  running: 'border-blue-500/80 bg-blue-950/60 text-blue-200',
  success: 'border-green-500/80 bg-green-950/60 text-green-200',
  failed: 'border-red-500/80 bg-red-950/60 text-red-200',
  skipped: 'border-yellow-500/80 bg-yellow-950/60 text-yellow-200',
  warn: 'border-orange-500/80 bg-orange-950/60 text-orange-200',
};

export default function InspectorPanel({ node, onHide, userPermissions }: InspectorPanelProps) {
  if (!node) {
    return (
      <div className="h-full bg-slate-900 border-l border-slate-700 flex flex-col text-slate-50">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Inspector</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-slate-300 hover:text-white"
            onClick={onHide}
            aria-label="Hide inspector panel"
          >
            <PanelRightClose className="size-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-slate-200 text-center">Select a node to inspect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900 border-l border-slate-700 flex flex-col text-slate-50">
      <div className="px-4 py-3 border-b border-slate-700 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn('size-2 rounded-full', statusColors[node.status])} />
            <h2 className="font-semibold text-sm truncate">{node.name}</h2>
          </div>
          <p className="text-xs text-slate-200 mt-1">{node.type}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-slate-300 hover:text-white"
          onClick={onHide}
          aria-label="Hide inspector panel"
        >
          <PanelRightClose className="size-4" />
        </Button>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="bg-transparent border-b border-slate-700 rounded-none px-4 justify-start">
          <TabsTrigger value="overview" className={triggerClassName}>
            <Info className="size-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="config" className={triggerClassName}>
            <Settings className="size-3 mr-1" />
            Config
          </TabsTrigger>
          <TabsTrigger value="sql" className={triggerClassName}>
            <Code className="size-3 mr-1" />
            SQL
          </TabsTrigger>
          {node.type === 'MODEL' && (
            <>
              <TabsTrigger value="tests" className={triggerClassName}>
                <TestTube className="size-3 mr-1" />
                Tests
              </TabsTrigger>
              <TabsTrigger value="columns" className={triggerClassName}>
                <Table className="size-3 mr-1" />
                Columns
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="history" className={triggerClassName}>
            <Clock className="size-3 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-4 space-y-4 m-0">
            <Card className={cardClassName}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-200">Package:</span>
                  <span className="text-slate-50">{node.package}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-200">Path:</span>
                  <span className="text-xs font-mono truncate ml-2 text-slate-50">{node.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-200">Status:</span>
                  <Badge
                    variant="outline"
                    className={cn('capitalize font-medium', statusBadgeClassName[node.status])}
                  >
                    {node.status}
                  </Badge>
                </div>
                {node.lastDuration && (
                  <div className="flex justify-between">
                    <span className="text-slate-200">Last Duration:</span>
                    <span className="text-slate-50">{node.lastDuration}s</span>
                  </div>
                )}
                {node.lastCost && (
                  <div className="flex justify-between">
                    <span className="text-slate-200">Last Cost:</span>
                    <span className="text-slate-50">${node.lastCost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>

            {node.description && (
              <Card className={cardClassName}>
                <h3 className={cardTitleClassName}>Description</h3>
                <p className="text-xs text-slate-100">{node.description}</p>
              </Card>
            )}

            {node.tags.length > 0 && (
              <Card className={cardClassName}>
                <h3 className={cardTitleClassName}>Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {node.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            <Card className={cardClassName}>
              <h3 className={cardTitleClassName}>Dependencies</h3>
              {node.dependencies.length === 0 ? (
                <p className="text-xs text-slate-100">No dependencies</p>
              ) : (
                <div className="space-y-1">
                  {node.dependencies.map((dep) => (
                    <div key={dep} className="text-xs font-mono text-slate-100">
                      -&gt; {dep}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className={cardClassName}>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-100">
                <Shield className="size-4" />
                Permissions
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Can Plan:</span>
                  <Badge variant={userPermissions.canPlan ? 'default' : 'secondary'}>
                    {userPermissions.canPlan ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Can Run:</span>
                  <Badge variant={userPermissions.canRun ? 'default' : 'secondary'}>
                    {userPermissions.canRun ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Can Edit Edges:</span>
                  <Badge variant={userPermissions.canEditEdges ? 'default' : 'secondary'}>
                    {userPermissions.canEditEdges ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="p-4 m-0">
            <Card className={cardClassName}>
              <pre className="text-xs font-mono text-slate-50 whitespace-pre-wrap">
                {JSON.stringify(node.config || { materialized: 'table' }, null, 2)}
              </pre>
            </Card>
          </TabsContent>

          <TabsContent value="sql" className="p-4 m-0">
            <Card className={cardClassName}>
              <h3 className={cardTitleClassName}>Compiled SQL</h3>
              <pre className="text-xs font-mono text-slate-50 whitespace-pre-wrap bg-slate-900 p-3 rounded border border-slate-700">
                {node.compiledSql || 'No compiled SQL available'}
              </pre>
            </Card>
          </TabsContent>

          <TabsContent value="tests" className="p-4 m-0">
            <div className="space-y-2">
              <Card className={cardClassName}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono">test_not_null_store_id</span>
                  <Badge className="bg-green-600">Passed</Badge>
                </div>
                <p className="text-xs text-slate-100">Generic test: not_null on store_id</p>
              </Card>
              <Card className={cardClassName}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono">test_unique_store_id</span>
                  <Badge className="bg-green-600">Passed</Badge>
                </div>
                <p className="text-xs text-slate-100">Generic test: unique on store_id</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="columns" className="p-4 m-0">
            <div className="space-y-2">
              {node.columns?.map((col) => (
                <Card key={col.name} className={cardClassName}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{col.name}</div>
                      <div className="text-xs text-slate-100 mt-1">{col.type}</div>
                      {col.description && (
                        <p className="text-xs text-slate-200 mt-2">{col.description}</p>
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
              <Card className={cardClassName}>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">Run #xyz789</div>
                    <div className="text-xs text-slate-200 mt-1">2026-02-13 10:35:00</div>
                  </div>
                  <Badge className="bg-green-600">Success</Badge>
                </div>
                <div className="mt-2 text-xs text-slate-100">
                  Duration: {node.lastDuration}s | Cost: ${node.lastCost?.toFixed(2)}
                </div>
              </Card>
              <Card className={cardClassName}>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">Run #abc456</div>
                    <div className="text-xs text-slate-200 mt-1">2026-02-12 14:22:00</div>
                  </div>
                  <Badge className="bg-green-600">Success</Badge>
                </div>
                <div className="mt-2 text-xs text-slate-100">Duration: 2.1s | Cost: $0.04</div>
              </Card>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

