import { Suspense, lazy } from 'react';
import { Terminal, X } from 'lucide-react';

import { useAppDataSourceMode } from '../services/AppServicesContext';
import { useExecutionStore } from '../stores/executionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useConsoleLogStream } from './console/useConsoleLogStream';

import { Badge } from './ui/badge';
import { Button } from './ui/button';

const XtermConsole = lazy(() => import('./console/XtermConsole'));

export default function Console() {
  const setConsolePanelHeight = useUiLayoutStore((state) => state.setConsolePanelHeight);
  const currentRun = useExecutionStore((state) => state.currentRun);
  const dataSourceMode = useAppDataSourceMode();
  const { lines, isLoading, runId } = useConsoleLogStream();
  const idleCopy =
    dataSourceMode === 'api'
      ? 'Start a run to see run events here. Live log streaming is not available in API mode yet.'
      : 'Start a run to see execution output here.';

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
          {dataSourceMode === 'mock' && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Mock
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

      {/* Terminal */}
      <div className="flex-1 min-h-0">
        {!runId ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            {idleCopy}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            Loading run events...
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Loading terminal...
              </div>
            }
          >
            <XtermConsole lines={lines} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
