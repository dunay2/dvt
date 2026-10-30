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

export type CanvasExplorerProjectWorkspace = Readonly<{
  onActivate: () => Promise<boolean>;
  onCanvas: () => void;
}>;

export function CanvasExplorer({
  sources,
  elements,
  projectFiles,
  children,
  rootRef,
  workspaceTask,
  activityRail,
}: Readonly<{
  sources: ReactNode;
  elements: ReactNode;
  projectFiles?: CanvasExplorerProjectWorkspace;
  children: ReactNode;
  rootRef?: RefObject<HTMLDivElement>;
  workspaceTask?: ReactNode;
  activityRail?: CanvasExplorerActivityRail;
}>): JSX.Element {
  const [selected, setSelected] = useState<CanvasExplorerPanel>('sources');
  const [expanded, setExpanded] = useState(true);
  const hasProjectFiles = projectFiles != null;
  const selectedPanel = selected;
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
    setExpanded((current) =>
      activityRail?.codeVisible === true || selectedPanel !== key ? true : !current
    );
    setSelected(key);
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
      active={visible && expanded ? selectedPanel : null}
      visible={visible}
      copy={copy}
      rootRef={rootRef}
      workspaceTask={workspaceTask}
      activityRail={activityRail}
      sources={sources}
      elements={elements}
      hasProjectFiles={hasProjectFiles}
      onToggle={toggle}
      onKeyToggle={onKeyToggle}
      onCollapse={() => {
        projectFiles?.onCanvas();
        setExpanded(false);
        document.getElementById(`${id}-${selectedPanel}-button`)?.focus();
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
