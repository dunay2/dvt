/** Owned concern: render Canvas main panel frame and layout-only presentation slots. */
import type { ReactNode } from 'react';

import { ResizablePanel } from '../../components/ui/resizable';
import { CanvasContextualWorkbenchPanel } from './CanvasContextualWorkbenchPanel';
import { useCanvasNodeWorkbenchPosition } from './useCanvasNodeWorkbenchPosition';

const canvasShellMainPanelFrameClassNames = {
  root: 'relative h-full flex flex-col bg-(--surface-panel)',
  readOnlyBanner: 'shrink-0',
  workbenchSplit: 'relative flex min-h-0 flex-1',
  workbenchBaseSurface: 'flex min-h-0 min-w-0 flex-1',
  workbenchOverlay:
    'absolute z-20 flex h-[min(42rem,calc(100%-2rem))] w-[min(48rem,calc(100%-2rem))] overflow-hidden rounded-md border border-(--border-default) bg-(--surface-panel) shadow-xl',
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

export function CanvasShellContextualWorkbenchSplit({
  baseSurface,
  children,
  closeLabel,
  description,
  moveLabel,
  onClose,
  title,
}: Readonly<{
  baseSurface: ReactNode;
  children: ReactNode;
  closeLabel: string;
  description?: string;
  moveLabel?: string;
  onClose: () => void;
  title: string;
}>): JSX.Element {
  const positionController = useCanvasNodeWorkbenchPosition(true);

  return (
    <div className={canvasShellMainPanelFrameClassNames.workbenchSplit}>
      <div
        data-slot="canvas-contextual-workbench-base-surface"
        className={canvasShellMainPanelFrameClassNames.workbenchBaseSurface}
      >
        {baseSurface}
      </div>
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
        <CanvasContextualWorkbenchPanel
          title={title}
          closeLabel={closeLabel}
          description={description}
          moveLabel={moveLabel ?? title}
          dragHandleProps={positionController.dragHandleProps}
          onClose={onClose}
        >
          {children}
        </CanvasContextualWorkbenchPanel>
      </div>
    </div>
  );
}
