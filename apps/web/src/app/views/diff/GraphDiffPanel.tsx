import { AlertTriangle, Edit, Info, Minus, Plus } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
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
            routeWorkbenchPanelClassName,
            'border-2 p-4',
            change.severity === 'breaking' && 'border-[color:var(--status-danger)]',
            change.severity === 'warning' && 'border-[color:var(--status-warning)]',
            change.severity === 'info' && 'border-[color:var(--status-info)]'
          )}
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-1 flex size-6 items-center justify-center rounded bg-[var(--surface-elevated)]',
                  change.type === 'added' && 'text-[var(--status-success)]',
                  change.type === 'removed' && 'text-[var(--status-danger)]',
                  change.type === 'changed' && 'text-[var(--status-info)]'
                )}
              >
                {change.type === 'added' ? <Plus className="size-4" /> : null}
                {change.type === 'removed' ? <Minus className="size-4" /> : null}
                {change.type === 'changed' ? <Edit className="size-4" /> : null}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <code className="font-semibold text-[var(--text-strong)]">{change.nodeId}</code>
                  <Badge
                    className={cn(
                      change.type === 'added' &&
                        'border-transparent bg-[var(--status-success)] text-[var(--surface-app)]',
                      change.type === 'removed' &&
                        'border-transparent bg-[var(--status-danger)] text-[var(--text-strong)]',
                      change.type === 'changed' &&
                        'border-transparent bg-[var(--status-info)] text-[var(--surface-app)]'
                    )}
                  >
                    {change.type}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--text-default)]">{change.description}</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                change.severity === 'breaking' &&
                  'border-[color:var(--status-danger)] text-[var(--status-danger)]',
                change.severity === 'warning' &&
                  'border-[color:var(--status-warning)] text-[var(--status-warning)]',
                change.severity === 'info' &&
                  'border-[color:var(--status-info)] text-[var(--status-info)]'
              )}
            >
              {change.severity === 'breaking' ? <AlertTriangle className="mr-1 size-3" /> : null}
              {change.severity === 'info' ? <Info className="mr-1 size-3" /> : null}
              {change.severity}
            </Badge>
          </div>

          {change.oldValue || change.newValue ? (
            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-[color:var(--border-default)] pt-3">
              <div>
                <p className="mb-1 text-xs text-[var(--text-muted)]">{copy.valueLabels.old}</p>
                <code className="block rounded bg-[var(--surface-app)] px-2 py-1 text-xs text-[var(--status-danger)]">
                  {String(change.oldValue ?? 'null')}
                </code>
              </div>
              <div>
                <p className="mb-1 text-xs text-[var(--text-muted)]">{copy.valueLabels.next}</p>
                <code className="block rounded bg-[var(--surface-app)] px-2 py-1 text-xs text-[var(--status-success)]">
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
