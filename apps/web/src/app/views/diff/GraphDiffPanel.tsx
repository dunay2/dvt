import { AlertTriangle, Edit, Info, Minus, Plus } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import type { DiffChange } from '../../types/dbt';
import { diffViewCopy as copy } from './copy';

interface GraphDiffPanelProps {
  changes: DiffChange[];
}

export function GraphDiffPanel({ changes }: GraphDiffPanelProps) {
  return (
    <div className="space-y-3">
      {changes.map((change) => (
        <Card
          key={change.id}
          className={cn(
            'border-2 bg-slate-900 p-4',
            change.severity === 'breaking' && 'border-red-500',
            change.severity === 'warning' && 'border-yellow-500',
            change.severity === 'info' && 'border-blue-500'
          )}
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-1 flex size-6 items-center justify-center rounded',
                  change.type === 'added' && 'bg-green-900/30',
                  change.type === 'removed' && 'bg-red-900/30',
                  change.type === 'changed' && 'bg-blue-900/30'
                )}
              >
                {change.type === 'added' ? <Plus className="size-4 text-green-400" /> : null}
                {change.type === 'removed' ? <Minus className="size-4 text-red-400" /> : null}
                {change.type === 'changed' ? <Edit className="size-4 text-blue-400" /> : null}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
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
              {change.severity === 'breaking' ? <AlertTriangle className="mr-1 size-3" /> : null}
              {change.severity === 'info' ? <Info className="mr-1 size-3" /> : null}
              {change.severity}
            </Badge>
          </div>

          {change.oldValue || change.newValue ? (
            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-slate-700 pt-3">
              <div>
                <p className="mb-1 text-xs text-slate-300">{copy.valueLabels.old}</p>
                <code className="block rounded bg-red-900/25 px-2 py-1 text-xs text-red-300">
                  {String(change.oldValue ?? 'null')}
                </code>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-300">{copy.valueLabels.next}</p>
                <code className="block rounded bg-green-900/25 px-2 py-1 text-xs text-green-300">
                  {String(change.newValue ?? 'null')}
                </code>
              </div>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
