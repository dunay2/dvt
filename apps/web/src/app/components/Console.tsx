import { Suspense, lazy } from 'react';
import { Terminal, X } from 'lucide-react';

import { useAppDataSourceMode } from '../services/AppServicesContext';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useConsoleLogStream } from './console/useConsoleLogStream';
import { buildBottomConsoleDrawerModel } from './shell/bottomConsoleDrawerModel';
import { bottomConsoleDrawerClasses } from './shell/chrome';
import { resolveShellTopBarCopy } from './shell/copy';

import { Badge } from './ui/badge';
import { Button } from './ui/button';

const XtermConsole = lazy(() => import('./console/XtermConsole'));

export function BottomConsoleDrawer() {
  const copy = resolveShellTopBarCopy();
  const hideConsolePanel = useUiLayoutStore((state) => state.hideConsolePanel);
  const dataSourceMode = useAppDataSourceMode();
  const { lines, isLoading, runId } = useConsoleLogStream();
  const model = buildBottomConsoleDrawerModel({
    title: copy.consolePanel,
    dataSourceMode,
    runId,
    isLoading,
    lines,
  });

  return (
    <div data-slot="bottom-console-drawer" className={bottomConsoleDrawerClasses.drawer}>
      <div data-slot="bottom-console-drawer-header" className={bottomConsoleDrawerClasses.header}>
        <div
          data-slot="bottom-console-drawer-title"
          className={bottomConsoleDrawerClasses.headerMain}
        >
          <Terminal className={bottomConsoleDrawerClasses.titleIcon} />
          <span className={bottomConsoleDrawerClasses.title}>{model.title}</span>
          {model.runLabel && (
            <Badge
              variant="outline"
              className="text-xs"
              data-slot="bottom-console-drawer-run-badge"
            >
              {model.runLabel}
            </Badge>
          )}
          {model.modeLabel && (
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-wide"
              data-slot="bottom-console-drawer-mode-badge"
            >
              {model.modeLabel}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close console"
          className={bottomConsoleDrawerClasses.closeButton}
          onClick={hideConsolePanel}
          data-slot="bottom-console-drawer-close"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div data-slot="bottom-console-drawer-body" className={bottomConsoleDrawerClasses.body}>
        {model.kind === 'idle' ? (
          <div
            data-slot="bottom-console-drawer-idle"
            className={bottomConsoleDrawerClasses.bodyMessage}
          >
            {model.message}
          </div>
        ) : model.kind === 'loading' ? (
          <div
            data-slot="bottom-console-drawer-loading"
            className={bottomConsoleDrawerClasses.bodyMessage}
          >
            {model.message}
          </div>
        ) : (
          <Suspense
            fallback={
              <div
                data-slot="bottom-console-drawer-terminal-loading"
                className={bottomConsoleDrawerClasses.bodyMessage}
              >
                Loading terminal...
              </div>
            }
          >
            <div data-slot="bottom-console-drawer-stream" className="h-full w-full">
              <XtermConsole lines={[...model.lines]} />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default BottomConsoleDrawer;
