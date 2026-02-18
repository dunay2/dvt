import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Search, GitGraph, ArrowRight, Pin, Table, Columns } from 'lucide-react';

export default function LineageView() {
  const [searchQuery, setSearchQuery] = useState('fct_sales');
  const [columnLevel, setColumnLevel] = useState(false);

  const modelLineage = [
    { id: 'src_erp_orders', name: 'src_erp_orders', type: 'SOURCE', level: 0 },
    { id: 'src_erp_customers', name: 'src_erp_customers', type: 'SOURCE', level: 0 },
    { id: 'stg_orders', name: 'stg_orders', type: 'MODEL', level: 1 },
    { id: 'stg_customers', name: 'stg_customers', type: 'MODEL', level: 1 },
    { id: 'dim_store', name: 'dim_store', type: 'MODEL', level: 1 },
    { id: 'fct_sales', name: 'fct_sales', type: 'MODEL', level: 2 },
    { id: 'exposure_powerbi_sales', name: 'exposure_powerbi_sales', type: 'EXPOSURE', level: 3 },
  ];

  const columnLineage = [
    { from: 'src_erp_orders.order_id', to: 'stg_orders.order_id' },
    { from: 'stg_orders.order_id', to: 'fct_sales.order_id' },
    { from: 'src_erp_orders.total_amount', to: 'stg_orders.total_amount' },
    { from: 'stg_orders.total_amount', to: 'fct_sales.total_amount' },
    { from: 'dim_store.store_id', to: 'fct_sales.store_id' },
  ];

  return (
    <div className="h-full bg-[#1a1d23] flex flex-col">
      {/* Header */}
      <div className="bg-[#0f1116] border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <GitGraph className="size-6 text-purple-400" />
            <h1 className="text-xl font-semibold">Lineage Analysis</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models, columns..."
              className="pl-10 bg-[#1a1d23] border-gray-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="column-level" checked={columnLevel} onCheckedChange={setColumnLevel} />
            <Label htmlFor="column-level" className="text-sm cursor-pointer">
              Column-level lineage
            </Label>
          </div>

          <Button variant="outline" size="sm">
            <Pin className="size-4 mr-2" />
            Pin to Canvas
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-[#0f1116] border-b border-gray-800 px-6 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Path:</span>
          <code className="text-blue-400">src_erp_orders</code>
          <ArrowRight className="size-3 text-gray-500" />
          <code className="text-blue-400">stg_orders</code>
          <ArrowRight className="size-3 text-gray-500" />
          <code className="text-green-400 font-semibold">fct_sales</code>
          <ArrowRight className="size-3 text-gray-500" />
          <code className="text-pink-400">exposure_powerbi_sales</code>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {!columnLevel ? (
            // Model-level lineage
            <div className="max-w-4xl mx-auto">
              <Card className="bg-[#0f1116] border-gray-800 p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Table className="size-5" />
                  Model-Level Lineage: fct_sales
                </h2>

                <div className="space-y-8">
                  {/* Level 0: Sources */}
                  <div>
                    <div className="text-xs text-gray-500 mb-3">LEVEL 0 - SOURCES</div>
                    <div className="flex gap-3">
                      {modelLineage
                        .filter((n) => n.level === 0)
                        .map((node) => (
                          <Card
                            key={node.id}
                            className="bg-purple-900/30 border-purple-500 p-3 flex-1"
                          >
                            <Badge variant="secondary" className="mb-2 text-xs">
                              {node.type}
                            </Badge>
                            <div className="font-mono text-sm">{node.name}</div>
                          </Card>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="size-6 text-gray-500 rotate-90" />
                  </div>

                  {/* Level 1: Staging */}
                  <div>
                    <div className="text-xs text-gray-500 mb-3">LEVEL 1 - STAGING & DIMENSIONS</div>
                    <div className="flex gap-3">
                      {modelLineage
                        .filter((n) => n.level === 1)
                        .map((node) => (
                          <Card key={node.id} className="bg-blue-900/30 border-blue-500 p-3 flex-1">
                            <Badge variant="secondary" className="mb-2 text-xs">
                              {node.type}
                            </Badge>
                            <div className="font-mono text-sm">{node.name}</div>
                          </Card>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="size-6 text-gray-500 rotate-90" />
                  </div>

                  {/* Level 2: Facts */}
                  <div>
                    <div className="text-xs text-gray-500 mb-3">LEVEL 2 - FACTS</div>
                    <Card className="bg-green-900/30 border-green-500 border-2 p-4">
                      <Badge className="mb-2 bg-green-600">CURRENT</Badge>
                      <div className="font-mono text-lg font-semibold">fct_sales</div>
                      <div className="text-sm text-gray-400 mt-2">Sales fact table</div>
                    </Card>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="size-6 text-gray-500 rotate-90" />
                  </div>

                  {/* Level 3: Exposures */}
                  <div>
                    <div className="text-xs text-gray-500 mb-3">LEVEL 3 - EXPOSURES</div>
                    <Card className="bg-pink-900/30 border-pink-500 p-3">
                      <Badge variant="secondary" className="mb-2 text-xs">
                        EXPOSURE
                      </Badge>
                      <div className="font-mono text-sm">exposure_powerbi_sales</div>
                      <div className="text-xs text-gray-400 mt-1">PowerBI Sales Dashboard</div>
                    </Card>
                  </div>
                </div>
              </Card>

              {/* Impact Summary */}
              <Card className="bg-[#0f1116] border-gray-800 p-4 mt-4">
                <h3 className="font-semibold mb-3">Impact Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Upstream Dependencies</div>
                    <div className="text-xl font-semibold mt-1">5</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Downstream Consumers</div>
                    <div className="text-xl font-semibold mt-1">1</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Exposures Affected</div>
                    <div className="text-xl font-semibold mt-1">1</div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            // Column-level lineage
            <div className="max-w-4xl mx-auto">
              <Card className="bg-[#0f1116] border-gray-800 p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Columns className="size-5" />
                  Column-Level Lineage: fct_sales
                </h2>

                <div className="space-y-3">
                  {columnLineage.map((lineage, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-[#1a1d23] border border-gray-800 rounded"
                    >
                      <code className="text-sm text-blue-400">{lineage.from}</code>
                      <ArrowRight className="size-4 text-gray-500" />
                      <code className="text-sm text-green-400">{lineage.to}</code>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded">
                  <h4 className="text-sm font-medium mb-2">Column: total_amount</h4>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>
                      <strong>Origin:</strong> src_erp_orders.total_amount (DECIMAL)
                    </div>
                    <div>
                      <strong>Transformations:</strong> None (pass-through)
                    </div>
                    <div>
                      <strong>Final Type:</strong> NUMERIC(18,2) in fct_sales
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
