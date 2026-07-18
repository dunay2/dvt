/** Owned concern: render Canvas main panel frame and layout-only presentation slots. */
import type { ReactNode } from 'react';

import { ResizablePanel } from '../../components/ui/resizable';
import { CanvasContextualWorkbenchPanel } from './CanvasContextualWorkbenchPanel';

const canvasShellMainPanelFrameClassNames = {
  root: 'relative h-full flex flex-col bg-(--surface-panel)',
  readOnlyBanner: 'shrink-0',
  overlayBase: 'relative flex min-h-0 flex-1',
  overlayLayer: 'pointer-events-none absolute inset-0',
  overlayContent: 'pointer-events-none h-full',
  workbenchSplit: 'flex min-h-0 flex-1',
  workbenchBaseSurface: 'flex min-h-0 min-w-0 flex-1',
} as const;

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

export function CanvasShellOverlayCenterSurfaceFrame({
  centerSurface,
  viewport,
}: Readonly<{
  centerSurface: ReactNode;
  viewport: ReactNode;
}>): JSX.Element {
  return (
    <div className={canvasShellMainPanelFrameClassNames.overlayBase}>
      {viewport}
      <div className={canvasShellMainPanelFrameClassNames.overlayLayer}>
        <div className={canvasShellMainPanelFrameClassNames.overlayContent}>{centerSurface}</div>
      </div>
    </div>
  );
}

export function CanvasShellContextualWorkbenchSplit({
  baseSurface,
  children,
  closeLabel,
  description,
  onClose,
  title,
}: Readonly<{
  baseSurface: ReactNode;
  children: ReactNode;
  closeLabel: string;
  description?: string;
  onClose: () => void;
  title: string;
}>): JSX.Element {
  return (
    <div className={canvasShellMainPanelFrameClassNames.workbenchSplit}>
      <div
        data-slot="canvas-contextual-workbench-base-surface"
        className={canvasShellMainPanelFrameClassNames.workbenchBaseSurface}
      >
        {baseSurface}
      </div>
      <CanvasContextualWorkbenchPanel
        title={title}
        closeLabel={closeLabel}
        description={description}
        onClose={onClose}
      >
        {children}
      </CanvasContextualWorkbenchPanel>
    </div>
  );
}
