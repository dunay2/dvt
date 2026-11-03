/**
 * Owned concern: explorer disclosure and shell visibility, not graph selection or authoring.
 * @baseline GH-3610: one retained panel, no graph mutation or automatic fit on toggle.
 * @decision Delegate layout to the existing resizable primitive and content to adapters.
 * @consequence Main and semantic views share interaction without sharing domain commands.
 * @version 1.0.0
 */
import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';
import {
  CanvasExplorerTemplate,
  type CanvasExplorerActivityRail,
  type CanvasExplorerPanel,
} from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasExplorerItem, CanvasExplorerCategoryAction } from './canvasExplorerItems';

export type CanvasProjectElementsInput = Readonly<{
  enabled: boolean;
  items: readonly CanvasExplorerItem[];
  onSelect: (id: string) => void;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  categoryActions?: ReadonlyMap<string, CanvasExplorerCategoryAction>;
}>;

export type CanvasExplorerProjectWorkspace = Readonly<{
  onActivate: () => Promise<boolean>;
  onCanvas: () => void;
  renderElements?: (input: CanvasProjectElementsInput) => ReactNode;
}>;

export function CanvasExplorer({
  elements,
  projectFiles,
  children,
  rootRef,
  workspaceTask,
  activityRail,
}: Readonly<{
  elements: ReactNode | ((enabled: boolean) => ReactNode);
  projectFiles?: CanvasExplorerProjectWorkspace;
  children: ReactNode;
  rootRef?: RefObject<HTMLDivElement>;
  workspaceTask?: ReactNode;
  activityRail?: CanvasExplorerActivityRail;
}>): JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const hasProjectFiles = projectFiles != null;
  const visible = useUiLayoutStore((state) => state.canvasExplorerVisible);
  const close = useUiLayoutStore((state) => state.hideCanvasExplorer);
  // An explicit View-menu reopen must expand even a previously collapsed dock.
  useEffect(() => {
    if (visible) setExpanded(true);
  }, [visible]);
  const id = useId();
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const toggle = (key: CanvasExplorerPanel): void => {
    if (key === 'git') {
      if (projectFiles != null) void projectFiles.onActivate().catch(() => undefined);
      return;
    }
    projectFiles?.onCanvas();
    setExpanded((current) => activityRail?.codeVisible === true || !current);
  };
  const onKeyToggle = (key: CanvasExplorerPanel, event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) toggle(key);
  };
  return (
    <CanvasExplorerTemplate
      id={id}
      active={visible && expanded ? 'elements' : null}
      visible={visible}
      copy={copy}
      rootRef={rootRef}
      workspaceTask={workspaceTask}
      activityRail={activityRail}
      elements={
        typeof elements === 'function'
          ? elements(visible && expanded && activityRail?.codeVisible !== true)
          : elements
      }
      hasProjectFiles={hasProjectFiles}
      onToggle={toggle}
      onKeyToggle={onKeyToggle}
      onCollapse={() => {
        projectFiles?.onCanvas();
        setExpanded(false);
        document.getElementById(`${id}-elements-button`)?.focus();
      }}
      onClose={() => {
        projectFiles?.onCanvas();
        close();
      }}
    >
      {children}
    </CanvasExplorerTemplate>
  );
}
