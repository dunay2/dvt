/** Passive layout: semantic canvas above the compact session footer. */
import type { ReactNode, RefObject } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  type ImperativePanelHandle,
} from '../../components/ui/resizable';
import styles from './model-sql/CanvasModelSqlPanel.module.css';

export function CanvasModelEditorTemplate({
  label,
  footer,
  editor,
  guards,
  sql,
  sqlPanelRef,
  sqlOpen = false,
  semanticBlocked = false,
}: Readonly<{
  label: string;
  footer: ReactNode;
  editor: ReactNode;
  guards: ReactNode;
  sql?: ReactNode;
  sqlPanelRef?: RefObject<ImperativePanelHandle>;
  sqlOpen?: boolean;
  semanticBlocked?: boolean;
}>) {
  return (
    <section
      data-slot="canvas-model-editor"
      aria-label={label}
      tabIndex={-1}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--surface-app) text-(--text-default)"
    >
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel
          id="semantic"
          data-slot="canvas-model-semantic-pane"
          aria-busy={semanticBlocked}
          {...(semanticBlocked ? { inert: '' } : {})}
          className={styles.semantic}
          order={0}
          defaultSize={100}
          minSize={20}
        >
          {editor}
        </ResizablePanel>
        <ResizableHandle withHandle className={styles.resize} hidden={!sqlOpen} aria-label="SQL" />
        <ResizablePanel
          id="model-sql"
          order={1}
          ref={sqlPanelRef}
          collapsible
          collapsedSize={0}
          defaultSize={0}
          minSize={20}
        >
          {sql}
        </ResizablePanel>
      </ResizablePanelGroup>
      {guards}
      {footer}
    </section>
  );
}
