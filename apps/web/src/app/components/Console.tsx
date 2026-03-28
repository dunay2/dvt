import { Terminal, FileText, X } from 'lucide-react';

import { useAppStore } from '../stores/appStore';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

export default function Console() {
  const { setConsolePanelHeight, currentRun } = useAppStore();

  const mockLogs = [
    { time: '10:35:14', level: 'INFO', message: 'Starting run step...' },
    { time: '10:35:14', level: 'INFO', message: 'Running stg_orders [1 of 4]' },
    { time: '10:35:16', level: 'SUCCESS', message: 'stg_orders completed in 2.3s' },
    { time: '10:35:16', level: 'INFO', message: 'Running stg_customers [2 of 4]' },
    { time: '10:35:18', level: 'SUCCESS', message: 'stg_customers completed in 1.8s' },
    { time: '10:35:18', level: 'INFO', message: 'Running dim_store [3 of 4]' },
  ];

  return (
    <div className="h-full bg-slate-900 border-t border-slate-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-slate-300" />
          <span className="text-sm font-medium">Console</span>
          {currentRun && (
            <Badge variant="outline" className="text-xs">
              Run {currentRun.runId}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-slate-300 hover:text-white"
          onClick={() => setConsolePanelHeight(0)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="px-4 py-2 border-b border-slate-700">
        <div className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-2 py-1 text-xs text-slate-100">
          <FileText className="size-3" />
          Logs
        </div>
      </div>

      <ScrollArea className="h-full">
        <div className="p-4 space-y-1 font-mono text-xs">
          {mockLogs.map((log, idx) => (
            <div key={idx} className="flex gap-3">
              <span className="text-slate-400">{log.time}</span>
              <span
                className={
                  log.level === 'SUCCESS'
                    ? 'text-green-400'
                    : log.level === 'ERROR'
                      ? 'text-red-400'
                      : log.level === 'WARN'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                }
              >
                [{log.level}]
              </span>
              <span className="text-slate-200">{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

