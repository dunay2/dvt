import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Database,
  Table,
  FileText,
  TestTube,
  Presentation,
  TrendingUp,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { memo, useState } from 'react';

import { DbtNodeType, NodeStatus } from '../../types/dbt';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface DbtNodeData {
  name: string;
  type: DbtNodeType;
  status: NodeStatus;
  lastDuration?: number;
  lastCost?: number;
  isHighlighted?: boolean;
  impactLevel?: 'upstream' | 'downstream' | 'none';
  showColumns?: boolean;
  columns?: Array<{ name: string; type: string }>;
}

const nodeTypeConfig: Record<DbtNodeType, { icon: any; bgColor: string; borderColor: string }> = {
  SOURCE: { icon: Database, bgColor: 'bg-purple-900/30', borderColor: 'border-purple-500' },
  MODEL: { icon: Table, bgColor: 'bg-blue-900/30', borderColor: 'border-blue-500' },
  SEED: { icon: FileText, bgColor: 'bg-green-900/30', borderColor: 'border-green-500' },
  SNAPSHOT: { icon: Package, bgColor: 'bg-yellow-900/30', borderColor: 'border-yellow-500' },
  TEST: { icon: TestTube, bgColor: 'bg-red-900/30', borderColor: 'border-red-500' },
  EXPOSURE: { icon: Presentation, bgColor: 'bg-pink-900/30', borderColor: 'border-pink-500' },
  METRIC: { icon: TrendingUp, bgColor: 'bg-orange-900/30', borderColor: 'border-orange-500' },
  MACRO: { icon: Table, bgColor: 'bg-gray-900/30', borderColor: 'border-gray-500' },
};

const statusColors: Record<NodeStatus, string> = {
  idle: 'bg-gray-500',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
  warn: 'bg-orange-500',
};

function DbtNodeComponent({ data, selected }: NodeProps<DbtNodeData>) {
  const config = nodeTypeConfig[data.type];
  const Icon = config.icon;
  const [columnsExpanded, setColumnsExpanded] = useState(false);

  const shouldShowSourceHandle = data.type !== 'TEST' && data.type !== 'EXPOSURE';
  const shouldShowTargetHandle = data.type !== 'SOURCE';

  const impactBorderColor =
    data.impactLevel === 'upstream'
      ? 'border-yellow-500'
      : data.impactLevel === 'downstream'
        ? 'border-orange-500'
        : '';

  // Mock columns for demonstration
  const columns = data.columns || [
    { name: 'id', type: 'INTEGER' },
    { name: 'name', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' },
  ];

  const showColumnsSection = data.showColumns && (data.type === 'MODEL' || data.type === 'SOURCE');

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 transition-all bg-[#0f1116]',
        selected ? 'border-white shadow-lg' : config.borderColor,
        data.isHighlighted && 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d23]',
        impactBorderColor && impactBorderColor
      )}
      style={{ minWidth: 200, minHeight: 80 }}
    >
      {/* Target Handle (input) */}
      {shouldShowTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
        />
      )}

      {/* Node Content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className="size-4 flex-shrink-0" />
            <span className="font-mono text-sm font-medium truncate">{data.name}</span>
          </div>
          <div className={cn('size-2 rounded-full flex-shrink-0', statusColors[data.status])} />
        </div>

        {/* Type Badge */}
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
          {data.type}
        </Badge>

        {/* Metrics */}
        {(data.lastDuration || data.lastCost) && (
          <div className="mt-2 flex gap-2 text-[10px] text-gray-400">
            {data.lastDuration && <span>{data.lastDuration}s</span>}
            {data.lastCost && <span>${data.lastCost.toFixed(2)}</span>}
          </div>
        )}

        {/* Impact Level Indicator */}
        {data.impactLevel && data.impactLevel !== 'none' && (
          <div className="mt-2">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0.5',
                data.impactLevel === 'upstream' && 'border-yellow-500 text-yellow-500',
                data.impactLevel === 'downstream' && 'border-orange-500 text-orange-500'
              )}
            >
              {data.impactLevel}
            </Badge>
          </div>
        )}

        {/* Columns Section */}
        {showColumnsSection && (
          <div className="mt-2 border-t border-gray-700 pt-2">
            <button
              onClick={() => setColumnsExpanded(!columnsExpanded)}
              className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-1">
                <Table className="size-3" />
                Columns ({columns.length})
              </span>
              {columnsExpanded ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>

            {columnsExpanded && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {columns.map((col, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[10px] px-2 py-1 bg-[#1a1d23] rounded"
                  >
                    <span className="font-mono text-white truncate">{col.name}</span>
                    <span className="text-gray-500 ml-2 flex-shrink-0">{col.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Source Handle (output) */}
      {shouldShowSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
        />
      )}
    </div>
  );
}

export default memo(DbtNodeComponent);
