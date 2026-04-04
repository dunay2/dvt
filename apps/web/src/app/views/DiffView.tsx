import { useQuery } from '@tanstack/react-query';
import { GitCompare, AlertTriangle, Info, Plus, Minus, Edit, Code } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { useWorkspaceService } from '../services/AppServicesContext';

export default function DiffView() {
  const workspaceService = useWorkspaceService();
  const [compareMode, setCompareMode] = useState<'git' | 'run'>('git');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'breaking' | 'warning'>('all');
  const tabTriggerClassName =
    'text-slate-200 data-[state=active]:bg-[#101724] data-[state=active]:text-white';
  const diffChangesQuery = useQuery({
    queryKey: ['workspace', 'diff-changes'],
    queryFn: () => workspaceService.getDiffChanges(),
  });
  const diffChanges = diffChangesQuery.data ?? [];

  const filteredChanges =
    filterSeverity === 'all'
      ? diffChanges
      : diffChanges.filter((c) => c.severity === filterSeverity);

  const breakingChanges = diffChanges.filter((c) => c.severity === 'breaking');

  return (
    <div className="h-full bg-slate-950 flex flex-col text-slate-50">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <GitCompare className="size-6 text-blue-400" />
            <h1 className="text-xl font-semibold text-slate-50">Diff Viewer</h1>
          </div>
          <div className="flex gap-2">
            <Select value={compareMode} onValueChange={(v) => setCompareMode(v as any)}>
              <SelectTrigger className="w-[150px] bg-slate-950 border-slate-600 text-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-600 text-slate-50">
                <SelectItem value="git">Git SHA Diff</SelectItem>
                <SelectItem value="run">Run Diff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">Compare:</span>
            <code className="px-2 py-1 bg-slate-950 border border-slate-600 rounded text-sm text-slate-50">
              a3f2b91
            </code>
            <span className="text-slate-400">...</span>
            <code className="px-2 py-1 bg-slate-950 border border-slate-600 rounded text-sm text-slate-50">
              b7e4c22
            </code>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              variant={filterSeverity === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSeverity('all')}
            >
              All Changes
            </Button>
            <Button
              variant={filterSeverity === 'breaking' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSeverity('breaking')}
            >
              Breaking Only
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="border-b border-slate-700 p-6">
        <div className="grid grid-cols-4 gap-4 max-w-4xl">
          <Card className="bg-slate-900 border-slate-700 p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Plus className="size-5" />
              <span className="text-2xl font-semibold">1</span>
            </div>
            <p className="text-sm text-slate-300">Added</p>
          </Card>
          <Card className="bg-slate-900 border-slate-700 p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Minus className="size-5" />
              <span className="text-2xl font-semibold">0</span>
            </div>
            <p className="text-sm text-slate-300">Removed</p>
          </Card>
          <Card className="bg-slate-900 border-slate-700 p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Edit className="size-5" />
              <span className="text-2xl font-semibold">3</span>
            </div>
            <p className="text-sm text-slate-300">Changed</p>
          </Card>
          <Card className="bg-slate-900 border-red-800 border-2 p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="size-5" />
              <span className="text-2xl font-semibold">{breakingChanges.length}</span>
            </div>
            <p className="text-sm text-slate-300">Breaking</p>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="graph" className="max-w-5xl mx-auto">
            <TabsList className="bg-slate-900 border border-slate-700">
              <TabsTrigger value="graph" className={tabTriggerClassName}>
                Graph Diff
              </TabsTrigger>
              <TabsTrigger value="sql" className={tabTriggerClassName}>
                SQL Diff
              </TabsTrigger>
              <TabsTrigger value="catalog" className={tabTriggerClassName}>
                Catalog Diff
              </TabsTrigger>
            </TabsList>

            <TabsContent value="graph" className="space-y-3 mt-6">
              {filteredChanges.map((change) => (
                <Card
                  key={change.id}
                  className={cn(
                    'bg-slate-900 border-2 p-4',
                    change.severity === 'breaking' && 'border-red-500',
                    change.severity === 'warning' && 'border-yellow-500',
                    change.severity === 'info' && 'border-blue-500'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-1 size-6 rounded flex items-center justify-center',
                          change.type === 'added' && 'bg-green-900/30',
                          change.type === 'removed' && 'bg-red-900/30',
                          change.type === 'changed' && 'bg-blue-900/30'
                        )}
                      >
                        {change.type === 'added' && <Plus className="size-4 text-green-400" />}
                        {change.type === 'removed' && <Minus className="size-4 text-red-400" />}
                        {change.type === 'changed' && <Edit className="size-4 text-blue-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="font-semibold text-slate-50">{change.nodeId}</code>
                          <Badge
                            className={cn(
                              change.type === 'added' && 'bg-green-600',
                              change.type === 'removed' && 'bg-red-600',
                              change.type === 'changed' && 'bg-blue-600'
                            )}
                          >
                            {change.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-200">{change.description}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        change.severity === 'breaking' && 'border-red-500 text-red-400',
                        change.severity === 'warning' && 'border-yellow-500 text-yellow-400',
                        change.severity === 'info' && 'border-blue-500 text-blue-400'
                      )}
                    >
                      {change.severity === 'breaking' && <AlertTriangle className="size-3 mr-1" />}
                      {change.severity === 'info' && <Info className="size-3 mr-1" />}
                      {change.severity}
                    </Badge>
                  </div>

                  {(change.oldValue || change.newValue) && (
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700">
                      <div>
                        <p className="text-xs text-slate-300 mb-1">Old Value:</p>
                        <code className="text-xs text-red-300 bg-red-900/25 px-2 py-1 rounded block">
                          {change.oldValue || 'null'}
                        </code>
                      </div>
                      <div>
                        <p className="text-xs text-slate-300 mb-1">New Value:</p>
                        <code className="text-xs text-green-300 bg-green-900/25 px-2 py-1 rounded block">
                          {change.newValue || 'null'}
                        </code>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="sql" className="mt-6">
              <Card className="bg-slate-900 border-slate-700 p-4 text-slate-50">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-50">
                  <Code className="size-5" />
                  Compiled SQL Diff: fct_sales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-300 mb-2">a3f2b91 (old)</div>
                    <pre className="text-xs font-mono text-slate-50 bg-slate-950 border border-slate-700 p-3 rounded overflow-auto max-h-[400px]">
                      {`SELECT
  o.order_id,
  o.customer_id,
  o.order_date,
  s.store_id,
  o.total_amount,
  o.discount_amount
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('dim_store') }} s
  ON o.store_id = s.store_id`}
                    </pre>
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 mb-2">b7e4c22 (new)</div>
                    <pre className="text-xs font-mono text-slate-50 bg-slate-950 border border-slate-700 p-3 rounded overflow-auto max-h-[400px]">
                      {`SELECT
  o.order_id,
  o.customer_id,
  o.order_date,
  s.store_id,
  o.total_amount
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('dim_store') }} s
  ON o.store_id = s.store_id
WHERE o.order_date >= '2020-01-01'`}
                    </pre>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="catalog" className="mt-6">
              <Card className="bg-slate-900 border-slate-700 p-4 text-slate-50">
                <h3 className="font-semibold mb-4 text-slate-50">Catalog Changes: fct_sales</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-800 rounded">
                    <div className="flex items-center gap-2">
                      <Minus className="size-4 text-red-400" />
                      <code className="text-sm text-slate-50">discount_amount</code>
                      <span className="text-xs text-slate-200">DECIMAL</span>
                    </div>
                    <Badge className="bg-red-600">Column Removed</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-800 rounded">
                    <div className="flex items-center gap-2">
                      <Edit className="size-4 text-yellow-400" />
                      <code className="text-sm text-slate-50">total_amount</code>
                      <span className="text-xs text-slate-200">{'DECIMAL -> NUMERIC(18,2)'}</span>
                    </div>
                    <Badge className="bg-yellow-600">Type Changed</Badge>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
