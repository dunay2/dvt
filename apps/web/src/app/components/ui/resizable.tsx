'use client';

import { GripVerticalIcon } from 'lucide-react';
import * as React from 'react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from './utils';
import styles from './resizable.module.css';

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(styles.panelGroup, className)}
      {...props}
    />
  );
}

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.ImperativePanelHandle,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Panel>
>(function ResizablePanel(props, ref) {
  return <ResizablePrimitive.Panel ref={ref} data-slot="resizable-panel" {...props} />;
});

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(styles.resizeHandle, className)}
      {...props}
    >
      {withHandle && (
        <div className={styles.handleGrip}>
          <GripVerticalIcon className={styles.gripIcon} />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
export type { ImperativePanelHandle } from 'react-resizable-panels';
