/** Owned concern: render Canvas main panel frame and layout-only presentation slots. */
import type { ReactNode } from 'react';

import { ResizablePanel } from '../../components/ui/resizable';
import { CanvasContextualWorkbenchPanel } from './CanvasContextualWorkbenchPanel';
import { useCanvasNodeWorkbenchPosition } from './useCanvasNodeWorkbenchPosition';
import { canvasWorkspaceTabs } from './canvasWorkspaceTabs';

const canvasShellMainPanelFrameClassNames = {
  root: 'relative h-full flex flex-col bg-(--surface-panel)',
  readOnlyBanner: 'shrink-0',
  workspaceSurfaces: 'relative flex min-h-0 min-w-0 flex-1',
  workspaceSurface: 'absolute inset-0 flex min-h-0 min-w-0 flex-col',
  workspaceSurfaceInactive: 'invisible pointer-events-none',
  workbenchSplit: 'relative flex min-h-0 flex-1',
  workbenchBaseSurface: 'flex min-h-0 min-w-0 flex-1',
  workbenchOverlay:
    'absolute z-20 flex h-[min(42rem,calc(100%-2rem))] w-[min(48rem,calc(100%-2rem))] overflow-hidden rounded-md border border-(--border-default) bg-(--surface-panel) shadow-xl',
} as const;

export function CanvasShellWorkspaceSurfaces({
  viewport,
  editor,
  editorVisible,
  hasWorkspaceTabs,
}: Readonly<{
  viewport: ReactNode;
  editor: ReactNode;
  editorVisible: boolean;
  hasWorkspaceTabs: boolean;
}>): JSX.Element {
  return (
    <div
      data-slot="canvas-workspace-surfaces"
      className={canvasShellMainPanelFrameClassNames.workspaceSurfaces}
    >
      {(
        [
          { kind: 'canvas', content: viewport, visible: !editorVisible },
          { kind: 'model', content: editor, visible: editorVisible },
        ] as const
      ).map(({ kind, content, visible }) =>
        content == null ? null : (
          <div
            key={kind}
            {...(hasWorkspaceTabs
              ? {
                  id: canvasWorkspaceTabs[kind].panelId,
                  role: 'tabpanel',
                  'aria-labelledby': canvasWorkspaceTabs[kind].tabId,
                  tabIndex: 0,
                }
              : {})}
            aria-hidden={!visible}
            {...(visible ? {} : { inert: '' })}
            data-slot={canvasWorkspaceTabs[kind].panelId}
            className={`${canvasShellMainPanelFrameClassNames.workspaceSurface} ${
              visible ? '' : canvasShellMainPanelFrameClassNames.workspaceSurfaceInactive
            }`}
          >
            {content}
          </div>
        )
      )}
    </div>
  );
}

export function CanvasShellMainPanelFrame({
  children,
  defaultSize,
}: Readonly<{
  children: ReactNode;
  defaultSize: number;
}>): JSX.Element {
  return (
    <ResizablePanel id="canvas-shell-main-panel" order={1} defaultSize={defaultSize}>
      <div className={canvasShellMainPanelFrameClassNames.root}>{children}</div>
    </ResizablePanel>
  );
}

export function CanvasShellReadOnlyBannerSlot({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={canvasShellMainPanelFrameClassNames.readOnlyBanner}>{children}</div>;
}

export function CanvasShellContextualWorkbenchSplit({
  baseSurface,
  workbench,
  inspector,
}: Readonly<{
  baseSurface: ReactNode;
  workbench?: import('./canvasShell.types').CanvasShellContextualWorkbench;
  inspector?: ReactNode;
}>): JSX.Element {
  const docked = workbench?.presentation === 'docked';
  const positionController = useCanvasNodeWorkbenchPosition(workbench != null && !docked);
  const panel =
    workbench == null ? null : (
      <CanvasContextualWorkbenchPanel
        title={workbench.title}
        closeLabel={workbench.closeLabel}
        description={workbench.description}
        moveLabel={workbench.moveLabel ?? workbench.title}
        onClose={() => void workbench.requestClose()}
        autoFocus={docked}
        dragHandleProps={docked ? undefined : positionController.dragHandleProps}
      >
        {workbench.panel}
      </CanvasContextualWorkbenchPanel>
    );
  return (
    <div className={canvasShellMainPanelFrameClassNames.workbenchSplit}>
      <div
        data-slot="canvas-contextual-workbench-base-surface"
        className={canvasShellMainPanelFrameClassNames.workbenchBaseSurface}
      >
        {baseSurface}
      </div>
      {workbench == null ? inspector : null}
      {workbench == null || docked ? (
        panel
      ) : (
        <div
          ref={positionController.surfaceRef}
          data-slot="canvas-contextual-workbench-overlay"
          className={canvasShellMainPanelFrameClassNames.workbenchOverlay}
          style={{
            left: `${positionController.position.left}px`,
            top: `${positionController.position.top}px`,
          }}
          {...positionController.surfacePointerProps}
        >
          {panel}
        </div>
      )}
    </div>
  );
}
