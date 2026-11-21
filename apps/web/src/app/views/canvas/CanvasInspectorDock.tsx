/** Owned concern: bind the right Canvas dock to its existing width and guarded close. */
import { useId, type ReactNode } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../components/ui/resizable';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useCanvasSideDockResize } from './useCanvasSideDockResize';

export function CanvasInspectorDock({
  children,
  inspector,
  resizeLabel,
  onClose,
}: Readonly<{
  children: ReactNode;
  inspector: ReactNode;
  resizeLabel: string;
  onClose: () => Promise<boolean>;
}>): JSX.Element {
  const id = useId();
  const width = useUiLayoutStore((state) => state.inspectorPanelWidth);
  const setWidth = useUiLayoutStore((state) => state.setInspectorPanelWidth);
  const open = inspector != null;
  const dock = useCanvasSideDockResize({
    groupId: `${id}-canvas-inspector`,
    expanded: open,
    width,
    pixels: true,
    maxSize: 45,
    onWidthChange: setWidth,
    onCollapse: onClose,
  });
  return (
    <ResizablePanelGroup
      direction="horizontal"
      id={dock.groupId}
      className="min-h-0 min-w-0 flex-1"
    >
      <ResizablePanel id={`${id}-canvas`} order={1} className="relative flex min-w-0" minSize={55}>
        {children}
      </ResizablePanel>
      {open && (
        <>
          <ResizableHandle
            {...dock.handle}
            aria-label={resizeLabel}
            aria-orientation="vertical"
            title={resizeLabel}
            onKeyDownCapture={(event) => {
              dock.handle.onKeyDownCapture(event);
              if (event.key === 'Enter' && !event.defaultPrevented) {
                event.preventDefault();
                dock.panelRef.current?.collapse();
              }
            }}
          />
          <ResizablePanel
            id={`${id}-properties`}
            order={2}
            ref={dock.panelRef}
            defaultSize={dock.size}
            minSize={dock.minSize}
            maxSize={dock.maxSize}
            collapsible
            onResize={dock.onResize}
            onCollapse={dock.onCollapse}
          >
            {inspector}
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
